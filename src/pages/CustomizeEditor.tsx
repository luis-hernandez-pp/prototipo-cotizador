import { useState, useEffect, useRef, useCallback } from "react";
import type { PriceDetails } from "@/components/PriceCalculator";
import { useLocation, useNavigate } from "react-router-dom";
import Konva from "konva";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Package, Loader2 } from "lucide-react";
import { ProductPickerList } from "@/components/editor/ProductPickerList";

// Editor modules
import { useEditorHistory, type CanvasElement, type FacesData, type FaceData } from "@/components/editor/hooks/useEditorHistory";
import { useZoom } from "@/components/editor/hooks/useZoom";
import { useSnapGuides } from "@/components/editor/hooks/useSnapGuides";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorLeftPanel, type CustomerAsset, type DesignTemplate } from "@/components/editor/EditorLeftPanel";
import { EditorRightPanel } from "@/components/editor/EditorRightPanel";
import { loadImageWithBlob } from "@/components/editor/elements/ImageElement";

// ── Types ─────────────────────────────────────────────────────────────────────
type Product = Tables<"products">;
type ProductSubtype = Tables<"product_subtypes">;
type ProductType = Tables<"product_types">;

interface MockupFace {
  face_number: number;
  image_url: string;
  print_area_x: number | null;
  print_area_y: number | null;
  print_area_w: number | null;
  print_area_h: number | null;
}

interface EditorRouteState {
  productId: string;
  product: Product;
  subtype: ProductSubtype;
  type: ProductType;
  selectedFaces: number[];
  quantityPacks: number;
}

// ── Guest session ─────────────────────────────────────────────────────────────
function getGuestSessionId(): string {
  const key = "pp_guest_session";
  let id = sessionStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
  return id;
}

const withTimeout = <T,>(promise: Promise<T> | PromiseLike<T>, ms = 10000): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);

const SUPABASE_URL = "https://etrxbijkvrbatuayqjgc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cnhiaWprdnJiYXR1YXlxamdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDk5NzUsImV4cCI6MjA4Nzg4NTk3NX0._3ExM3EWI4ssc3nEaU_u7s2RyPHV8D5Q5-xr0VSBpZQ";

async function supabaseFetch<T>(table: string, query: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data) && data.length === 0) throw new Error(`No data found in ${table}`);
  return Array.isArray(data) ? data[0] : data;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CustomizeEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const editorState = location.state as EditorRouteState | null;
  const { selectedFaces: initialFaces, quantityPacks: initialQty } = editorState ?? {};

  const [product, setProduct] = useState<Product | null>(editorState?.product ?? null);
  const [subtype, setSubtype] = useState<ProductSubtype | null>(editorState?.subtype ?? null);
  const [type, setType] = useState<ProductType | null>(editorState?.type ?? null);

  // ── Faces init ───────────────────────────────────────────────────────────
  const initialFacesData: FacesData = {};
  (type?.printable_faces ?? []).forEach((f) => {
    initialFacesData[f] = { enabled: (initialFaces ?? []).includes(f), elements: [] };
  });

  // ── History (undo/redo) ──────────────────────────────────────────────────
  const { faces, canUndo, canRedo, undo, redo, pushState, reset } = useEditorHistory(initialFacesData);

  // ── Active face ──────────────────────────────────────────────────────────
  const [activeFace, setActiveFace] = useState<number>(initialFaces?.[0] ?? 1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // ── Per-face mockups from product_mockup_faces ────────────────────────────
  const [mockupFaces, setMockupFaces] = useState<Record<number, MockupFace>>({});

  // ── Canvas stage ref ─────────────────────────────────────────────────────
  const stageRef = useRef<Konva.Stage>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const hasProduct = !!(product && subtype && type);

  useEffect(() => {
    const update = () => {
      if (!centerRef.current) return;
      const rect = centerRef.current.getBoundingClientRect();
      const newW = Math.floor(rect.width);
      const newH = Math.floor(rect.height - 44);
      setStageSize(prev => {
        if (prev.width === newW && prev.height === newH) return prev;
        return { width: newW, height: newH };
      });
    };
    update();
    setTimeout(update, 100);
    const ro = new ResizeObserver(update);
    if (centerRef.current) ro.observe(centerRef.current);
    return () => ro.disconnect();
  }, [hasProduct]);

  // ── Load mockup faces for product ─────────────────────────────────────────
  const loadMockupFaces = useCallback(async (productId: string) => {
    try {
      const { data } = await supabase
        .from("product_mockup_faces")
        .select("*")
        .eq("product_id", productId);
      const map: Record<number, MockupFace> = {};
      (data ?? []).forEach((mf) => { map[mf.face_number] = mf as MockupFace; });
      setMockupFaces(map);
    } catch {
      setMockupFaces({});
    }
  }, []);

  useEffect(() => {
    if (product?.id) loadMockupFaces(product.id);
  }, [product?.id, loadMockupFaces]);

  // ── Mockup image natural size (for aspect-ratio–correct outerW/outerH) ─────
  const [mockupNaturalSize, setMockupNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Get the mockup for the ACTIVE face (falls back to legacy if no per-face mockup)
  const activeMockupFace = mockupFaces[activeFace];
  const hasMockup = activeMockupFace
    ? !!(activeMockupFace.image_url && activeMockupFace.print_area_x != null && activeMockupFace.print_area_y != null && activeMockupFace.print_area_w != null && activeMockupFace.print_area_h != null)
    : !!(product?.mockup_image_url && product?.mockup_print_area_x != null && product?.mockup_print_area_y != null && product?.mockup_print_area_w != null && product?.mockup_print_area_h != null);

  const activeMockupImageUrl = activeMockupFace?.image_url ?? product?.mockup_image_url ?? null;
  const activeMockupPrintAreaX = activeMockupFace?.print_area_x ?? product?.mockup_print_area_x ?? 0;
  const activeMockupPrintAreaY = activeMockupFace?.print_area_y ?? product?.mockup_print_area_y ?? 0;
  const activeMockupPrintAreaW = activeMockupFace?.print_area_w ?? product?.mockup_print_area_w ?? 0;
  const activeMockupPrintAreaH = activeMockupFace?.print_area_h ?? product?.mockup_print_area_h ?? 0;

  useEffect(() => {
    if (!activeMockupImageUrl) { setMockupNaturalSize(null); return; }
    const img = new Image();
    img.onload = () => setMockupNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setMockupNaturalSize(null);
    img.src = activeMockupImageUrl;
  }, [activeMockupImageUrl]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoom = useZoom(1);

  // ── Snap guides ──────────────────────────────────────────────────────────

  // Derived values for snap (need pxPerCm)
  const pxPerCm = product
    ? Math.min(
        (stageSize.width - 160) / product.width_cm,
        (stageSize.height - 160) / product.height_cm,
        40,
      )
    : 20;

  let outerW: number;
  let outerH: number;
  if (hasMockup && mockupNaturalSize) {
    const imgRatio = mockupNaturalSize.w / mockupNaturalSize.h;
    const maxW = stageSize.width - 160;
    const maxH = stageSize.height - 160;
    if (maxW / maxH > imgRatio) {
      outerH = maxH;
      outerW = outerH * imgRatio;
    } else {
      outerW = maxW;
      outerH = outerW / imgRatio;
    }
  } else {
    outerW = (product?.width_cm ?? 0) * pxPerCm;
    outerH = (product?.height_cm ?? 0) * pxPerCm;
  }

  const stageOffsetX = (stageSize.width - outerW) / 2;
  const stageOffsetY = (stageSize.height - outerH) / 2;

  let printW: number;
  let printH: number;
  let marginPx: number;
  let printOffsetX: number;
  let printOffsetY: number;
  if (hasMockup && product) {
    printOffsetX = stageOffsetX + (activeMockupPrintAreaX / 100) * outerW;
    printOffsetY = stageOffsetY + (activeMockupPrintAreaY / 100) * outerH;
    printW = (activeMockupPrintAreaW / 100) * outerW;
    printH = (activeMockupPrintAreaH / 100) * outerH;
    marginPx = 0;
  } else {
    printW = (product?.print_width_cm ?? 0) * pxPerCm;
    printH = (product?.print_height_cm ?? 0) * pxPerCm;
    marginPx = product ? ((product.width_cm - product.print_width_cm) / 2) * pxPerCm : 0;
    printOffsetX = stageOffsetX + marginPx;
    printOffsetY = stageOffsetY + marginPx;
  }

  const { guides: snapGuides, checkSnap, clearGuides } = useSnapGuides(
    printOffsetX, printOffsetY, printW, printH,
  );

  // ── Product switcher ─────────────────────────────────────────────────────
  const handleProductChange = useCallback(async (productId: string) => {
    try {
      const productData = await supabaseFetch<Product>(
        "products",
        `id=eq.${productId}&select=*`
      );
      const subtypeData = await supabaseFetch<ProductSubtype>(
        "product_subtypes",
        `id=eq.${productData.subtype_id}&select=*`
      );
      const typeData = await supabaseFetch<ProductType>(
        "product_types",
        `id=eq.${subtypeData.product_type_id}&select=*`
      );

      setProduct(productData);
      setSubtype(subtypeData);
      setType(typeData);
      setMockupNaturalSize(null);
      loadMockupFaces(productData.id);
      setQuantityPacks(productData.min_packs);

      const newFaces: FacesData = {};
      (typeData.printable_faces ?? []).forEach((f) => {
        newFaces[f] = { enabled: true, elements: [] };
      });
      reset(newFaces);
      setActiveFace(typeData.printable_faces?.[0] ?? 1);
      setSelectedId(null);
      setSelectedAssetId(null);

      toast({ title: "Producto cambiado", description: `Ahora editas: ${productData.name}` });
    } catch (err: unknown) {
      console.error("handleProductChange error:", err);
      toast({
        title: "Error al cambiar el producto",
        description: err instanceof Error ? err.message : "No se pudo cargar el producto",
        variant: "destructive",
      });
    }
  }, [loadMockupFaces, reset, toast]);

  // ── Assets & customer ────────────────────────────────────────────────────
  const [assets, setAssets] = useState<CustomerAsset[]>([]);
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("customers").select("id").eq("auth_user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setCustomerId(data.id); });
  }, [user]);

  useEffect(() => {
    const loadAssets = async () => {
      let query = supabase.from("customer_assets").select("*").order("created_at", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      else query = query.eq("guest_session_id", getGuestSessionId());
      const { data } = await query;
      setAssets(data ?? []);
    };
    loadAssets();
  }, [customerId]);

  useEffect(() => {
    if (!type?.id) return;
    supabase.from("design_templates").select("*")
      .eq("product_type_id", type.id).eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setTemplates(data ?? []));
  }, [type?.id]);

  // ── Pricing ──────────────────────────────────────────────────────────────
  const [quantityPacks, setQuantityPacks] = useState(initialQty ?? 1);
  const [priceDetails, setPriceDetails] = useState<PriceDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // ── Helper: mutate faces & push history ─────────────────────────────────
  const updateFaces = useCallback((updater: (prev: FacesData) => FacesData) => {
    // We need to work with current faces — use functional pushState workaround
    // pushState is called with the new value from inside the callback
    pushState(updater(faces));
  }, [faces, pushState]);

  const currentElements = faces[activeFace]?.elements ?? [];

  // Find the currently selected text element (if any) for the left panel controls
  const selectedTextElement = selectedId
    ? currentElements.find((el) => el.id === selectedId && el.type === "text") ?? null
    : null;

  const setCurrentElements = useCallback((
    els: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])
  ) => {
    updateFaces((prev) => {
      const face = prev[activeFace] ?? { enabled: true, elements: [] };
      const newEls = typeof els === "function" ? els(face.elements) : els;
      return { ...prev, [activeFace]: { ...face, elements: newEls } };
    });
  }, [activeFace, updateFaces]);

  // ── Delete key ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)) {
        setCurrentElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, setCurrentElements]);

  // ── Image loading ────────────────────────────────────────────────────────
  const onLoadImage = useCallback(async (url: string, id: string): Promise<void> => {
    if (loadedImages[id]) return;
    try {
      const img = await loadImageWithBlob(url);
      setLoadedImages((prev) => ({ ...prev, [id]: img }));
    } catch {
      console.warn("Could not load image:", url);
    }
  }, [loadedImages]);

  const onImageLoaded = useCallback((id: string, img: HTMLImageElement) => {
    setLoadedImages((prev) => ({ ...prev, [id]: img }));
  }, []);

  // ── Delete asset ─────────────────────────────────────────────────────────
  const handleDeleteAsset = useCallback(async (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    // Step A: Remove canvas elements from ALL faces
    const newFaces: FacesData = {};
    Object.entries(faces).forEach(([faceKey, faceData]) => {
      newFaces[Number(faceKey)] = {
        ...faceData,
        elements: faceData.elements.filter((el) => el.assetId !== assetId),
      };
    });
    pushState(newFaces);

    // Step B: Clear selection state
    if (selectedAssetId === assetId) setSelectedAssetId(null);
    setSelectedId((prev) => {
      const wasRemoved = faces[activeFace]?.elements.some(
        (el) => el.assetId === assetId && el.id === prev
      );
      return wasRemoved ? null : prev;
    });
    // Remove from image cache
    setLoadedImages((prev) => {
      const next = { ...prev };
      delete next[assetId];
      return next;
    });

    // Optimistically remove from local state
    setAssets((prev) => prev.filter((a) => a.id !== assetId));

    try {
      // Step C: Delete from storage
      const url = new URL(asset.file_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (pathMatch) {
        const [, bucket, filePath] = pathMatch;
        const { error: storageErr } = await supabase.storage.from(bucket).remove([filePath]);
        if (storageErr) console.warn("Storage delete error:", storageErr);
      } else {
        console.warn("Could not parse storage path from URL:", asset.file_url);
      }

      // Step D: Delete from database
      await supabase.from("customer_assets").delete().eq("id", assetId);

      toast({ title: "Archivo eliminado" });
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast({
        title: "Error al eliminar",
        description: "El archivo pudo no eliminarse completamente.",
        variant: "destructive",
      });
    }
  }, [assets, faces, activeFace, selectedAssetId, pushState, toast]);

  // ── Convert px node back to % for storage ────────────────────────────────
  const updateElFromNode = useCallback((id: string, node: Konva.Node) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const w = node.width() * scaleX;
    const h = node.height() * scaleY;
    node.scaleX(1); node.scaleY(1);
    node.width(w); node.height(h);

    setCurrentElements((prev) => prev.map((el) =>
      el.id !== id ? el : {
        ...el,
        x: ((node.x() - printOffsetX) / printW) * 100,
        y: ((node.y() - printOffsetY) / printH) * 100,
        width: (w / printW) * 100,
        height: (h / printW) * 100,  // ← printW, NOT printH — same base as width
        rotation: node.rotation(),
      }
    ));
  }, [printOffsetX, printOffsetY, printW, printH, setCurrentElements]);

  // ── Canvas event handlers ────────────────────────────────────────────────
  const handleDragMove = useCallback((elementId: string, node: Konva.Node) => {
    checkSnap(node, currentElements, (el) => {
      return {
        x: printOffsetX + (el.x / 100) * printW,
        y: printOffsetY + (el.y / 100) * printH,
        w: (el.width / 100) * printW,
        h: (el.height / 100) * printW,  // ← printW for uniform aspect ratio
      };
    });
  }, [checkSnap, currentElements, printW, printH, printOffsetX, printOffsetY]);

  const handleDragEnd = useCallback((elementId: string, node: Konva.Node) => {
    clearGuides();
    updateElFromNode(elementId, node);

    // Check if element is now out of bounds and warn user
    const stage = node.getStage();
    if (stage) {
      const rect = node.getClientRect({ relativeTo: stage });
      const outX = rect.x < printOffsetX || (rect.x + rect.width) > (printOffsetX + printW);
      const outY = rect.y < printOffsetY || (rect.y + rect.height) > (printOffsetY + printH);
      if (outX || outY) {
        toast({
          title: "⚠️ Fuera del área de impresión",
          description: "Parte del elemento está fuera del área imprimible. Podría cortarse al imprimir.",
          variant: "destructive",
        });
      }
    }
  }, [clearGuides, updateElFromNode, printOffsetX, printOffsetY, printW, printH, toast]);

  const handleTransformEnd = useCallback((elementId: string, node: Konva.Node) => {
    updateElFromNode(elementId, node);
  }, [updateElFromNode]);

  const handleTextChange = useCallback((elementId: string, text: string) => {
    setCurrentElements((prev) => prev.map((el) =>
      el.id !== elementId ? el : { ...el, content: text }
    ));
  }, [setCurrentElements]);

  // Update any property on a text element (font, size, color, bold, italic)
  const handleTextPropertyChange = useCallback((elementId: string, props: Partial<CanvasElement>) => {
    setCurrentElements((prev) => prev.map((el) =>
      el.id !== elementId ? el : { ...el, ...props }
    ));
  }, [setCurrentElements]);

  // ── Add image from left panel ────────────────────────────────────────────
  const handleAddImage = useCallback((asset: CustomerAsset, img: HTMLImageElement) => {
    if (!product) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    // Initial size: 40% of print width, maintaining aspect ratio
    let w = 40;
    let h = w / ratio;
    if (h > 40) { h = 40; w = h * ratio; }

    // Check DPI: calculate effective DPI at initial placement size
    const printCmW = product.print_width_cm * (w / 100);
    const printCmH = product.print_height_cm * (h / 100);
    const dpiW = img.naturalWidth / (printCmW / 2.54);
    const dpiH = img.naturalHeight / (printCmH / 2.54);
    const effectiveDPI = Math.min(dpiW, dpiH);

    if (effectiveDPI < 150) {
      toast({
        title: "⚠️ Baja resolución",
        description: `La imagen tiene ~${Math.round(effectiveDPI)} DPI. Para impresión de calidad se recomiendan al menos 150 DPI. Considera usar una imagen de mayor resolución.`,
        variant: "destructive",
      });
    } else if (effectiveDPI < 300) {
      toast({
        title: "Resolución aceptable",
        description: `La imagen tiene ~${Math.round(effectiveDPI)} DPI. Suficiente para la mayoría de productos. Para calidad premium, usa 300+ DPI.`,
      });
    }

    const el: CanvasElement = {
      id: crypto.randomUUID(),
      type: "image",
      assetId: asset.id,
      imageUrl: asset.file_url,
      x: 50 - w / 2,
      y: 50 - h / 2,
      width: w,
      height: h,
      rotation: 0,
    };
    setCurrentElements((prev) => [...prev, el]);
  }, [product, setCurrentElements]);

  // ── Add text ─────────────────────────────────────────────────────────────
  const handleAddText = useCallback((el: Omit<CanvasElement, "id">) => {
    setCurrentElements((prev) => [...prev, { ...el, id: crypto.randomUUID() }]);
  }, [setCurrentElements]);

  // ── Helper: load image aspect ratio ──────────────────────────────────────
  const loadImageAspectRatio = useCallback((url: string): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
      img.onerror = () => resolve(1);
      img.src = url;
    });
  }, []);

  // ── Apply template ────────────────────────────────────────────────────────
  const handleApplyTemplate = useCallback(async (template: DesignTemplate) => {
    const imageAsset = selectedAssetId
      ? assets.find(a => a.id === selectedAssetId)
      : assets[0];

    if (!imageAsset) {
      toast({ title: "Sube una imagen primero", description: "La plantilla necesita al menos una imagen subida." });
      return;
    }

    // Get aspect ratio — use cached loaded image or load fresh
    const cachedImg = loadedImages[imageAsset.id];
    const aspectRatio = cachedImg
      ? cachedImg.naturalWidth / cachedImg.naturalHeight
      : await loadImageAspectRatio(imageAsset.file_url);

    if (!cachedImg) onLoadImage(imageAsset.file_url, imageAsset.id);

    const printWidthCm = product?.print_width_cm ?? 1;
    const printHeightCm = product?.print_height_cm ?? 1;
    const margin = 3; // 3% margin from edges (~0.7cm for standard products)

    // ── PATTERN templates: regenerate all elements ──────────────────────
    if (template.layout_type === "pattern" && template.pattern_cols && template.pattern_rows) {
      setSelectedId(null);
      const cols = template.pattern_cols;
      const rows = template.pattern_rows;
      const rotationDeg = template.pattern_rotation ?? 0;
      const isDiagonal = rotationDeg !== 0;

      // Convert gap from cm to percentage of each axis
      const gapXPct = ((template.pattern_gap_cm ?? 0) / printWidthCm) * 100;
      const gapYPct = ((template.pattern_gap_cm ?? 0) / printHeightCm) * 100;

      // Rotation math
      const theta = (rotationDeg * Math.PI) / 180;
      const cosT = Math.abs(Math.cos(theta));
      const sinT = Math.abs(Math.sin(theta));

      // Grid slot = space available for each element's AABB (bounding box after rotation)
      const slotW = (100 - gapXPct * (cols - 1)) / cols;

      // Reverse-calculate actual cell size so that rotated AABB fits in the slot
      // aabbW = cellW * (cosT + sinT / aspectRatio) = slotW
      const cellW = isDiagonal
        ? slotW / (cosT + sinT / aspectRatio)
        : slotW;
      const cellH = cellW / aspectRatio;

      // Actual AABB dimensions after rotation (in printW-base %)
      const aabbW = cellW * cosT + cellH * sinT;
      const aabbH = cellW * sinT + cellH * cosT; // printW-base
      const aabbH_visual = aabbH * (printWidthCm / printHeightCm); // as % of printH

      // Konva anchor offset: rotation happens around top-left corner,
      // so the AABB shifts relative to the anchor point.
      // We need to compensate so the AABB lands at our target grid position.
      const cosSigned = Math.cos(theta);
      const sinSigned = Math.sin(theta);
      const cornersX = [0, cellW * cosSigned, cellW * cosSigned - cellH * sinSigned, -cellH * sinSigned];
      const cornersY = [0, cellW * sinSigned, cellW * sinSigned + cellH * cosSigned, cellH * cosSigned];
      const minX = Math.min(...cornersX);
      const minY = Math.min(...cornersY);
      const anchorDx = -minX;
      const anchorDy = -minY;
      // Convert anchorDy from printW-base to printH-base for the Y coordinate
      const anchorDyInPrintH = anchorDy * (printWidthCm / printHeightCm);

      // Grid spacing
      const stepX = aabbW + gapXPct;
      const stepY = aabbH_visual + gapYPct;

      // Vertical centering
      const totalH = rows * aabbH_visual + (rows - 1) * gapYPct;
      const offsetY = (100 - totalH) / 2;

      const els: CanvasElement[] = [];

      for (let r = 0; r < rows; r++) {
        if (isDiagonal && r % 2 === 1) {
          // ── ODD ROWS (brickwork): cols-1 elements, centered ──
          const oddCols = cols - 1;
          const oddRowW = oddCols * aabbW + (oddCols - 1) * gapXPct;
          const oddOffsetX = (100 - oddRowW) / 2;

          for (let c = 0; c < oddCols; c++) {
            const targetX = oddOffsetX + c * stepX;
            const targetY = offsetY + r * stepY;
            els.push({
              id: crypto.randomUUID(),
              type: "image",
              assetId: imageAsset.id,
              imageUrl: imageAsset.file_url,
              x: targetX + anchorDx,
              y: targetY + anchorDyInPrintH,
              width: cellW,
              height: cellH,
              rotation: rotationDeg,
            });
          }
        } else {
          // ── EVEN ROWS (or non-diagonal): cols elements edge-to-edge ──
          for (let c = 0; c < cols; c++) {
            const targetX = c * stepX;
            const targetY = offsetY + r * stepY;
            els.push({
              id: crypto.randomUUID(),
              type: "image",
              assetId: imageAsset.id,
              imageUrl: imageAsset.file_url,
              x: targetX + anchorDx,
              y: targetY + anchorDyInPrintH,
              width: cellW,
              height: cellH,
              rotation: rotationDeg,
            });
          }
        }
      }

      setCurrentElements(els);
      const totalEls = isDiagonal
        ? Math.ceil(rows / 2) * cols + Math.floor(rows / 2) * (cols - 1)
        : cols * rows;
      toast({ title: "Patrón aplicado", description: `${totalEls} elementos creados.` });
      return;
    }

    // ── POSITION templates: move existing element (quick action) ─────────
    const targetEl = selectedId
      ? currentElements.find(e => e.id === selectedId)
      : currentElements.find(e => e.type === "image");

    if (targetEl) {
      // QUICK ACTION: only change position, keep rotation, size, everything else
      const w = targetEl.width;
      const h = targetEl.height;
      const theta = ((targetEl.rotation ?? 0) * Math.PI) / 180;
      const cosT = Math.abs(Math.cos(theta));
      const sinT = Math.abs(Math.sin(theta));

      // Visual bounding box of the rotated element (in printW-based %)
      const bbW = w * cosT + h * sinT;
      const bbH = w * sinT + h * cosT;
      // Convert bbH to printH-based % for Y positioning
      const bbHInPrintH = bbH * (printWidthCm / printHeightCm);

      // Target position for the AABB
      const bbX = template.position_x === "center" ? (100 - bbW) / 2
               : template.position_x === "right" ? 100 - bbW - margin
               : margin;
      const bbY = template.position_y === "center" ? (100 - bbHInPrintH) / 2
               : template.position_y === "bottom" ? 100 - bbHInPrintH - margin
               : margin;

      // Rotation-aware anchor offset: find where each corner of the rotated rect lands
      const cosSigned = Math.cos(theta);
      const sinSigned = Math.sin(theta);
      const cornersX = [0, w * cosSigned, w * cosSigned - h * sinSigned, -h * sinSigned];
      const cornersY = [0, w * sinSigned, w * sinSigned + h * cosSigned, h * cosSigned];
      const minX = Math.min(...cornersX);
      const minY = Math.min(...cornersY);

      // Anchor = AABB target - min offset (minY converted from printW-base to printH-base)
      const x = bbX - minX;
      const y = bbY - minY * (printWidthCm / printHeightCm);

      setCurrentElements((prev) => prev.map((el) =>
        el.id !== targetEl.id ? el : { ...el, x, y }
      ));
      toast({ title: "Posición actualizada", description: `Elemento movido a ${template.name}.` });
    } else {
      // No elements yet — create a new one from scratch
      setSelectedId(null);
      const scale = template.scale_percentage ?? 50;
      const w = scale; // width as % of printW
      const h = scale / aspectRatio; // height as % of printW (same base)

      // Y centering: convert h to printH-based % for correct vertical placement
      const heightAsPctOfPrintH = h * (printWidthCm / printHeightCm);

      let x: number;
      if (template.position_x === "center") x = (100 - w) / 2;
      else if (template.position_x === "right") x = 100 - w - margin;
      else x = margin;

      let y: number;
      if (template.position_y === "center") y = (100 - heightAsPctOfPrintH) / 2;
      else if (template.position_y === "bottom") y = 100 - heightAsPctOfPrintH - margin;
      else y = margin;

      const imageEl: CanvasElement = {
        id: crypto.randomUUID(), type: "image",
        assetId: imageAsset.id, imageUrl: imageAsset.file_url,
        x, y, width: w, height: h, rotation: 0,
      };

      // Bug 5: "Centrado con texto" adds a text element below the image
      if (template.slug?.includes("centrado-texto") || template.name === "Centrado con texto") {
        const textEl: CanvasElement = {
          id: crypto.randomUUID(),
          type: "text",
          content: "Tu texto aquí",
          font: "Arial",
          fontSize: 24,
          color: "#1a365d",
          bold: false,
          italic: false,
          x: 25,
          y: y + heightAsPctOfPrintH + 5,
          width: 50,
          height: 8,
          rotation: 0,
        };
        setCurrentElements([imageEl, textEl]);
      } else {
        setCurrentElements([imageEl]);
      }
    }
  }, [assets, selectedAssetId, selectedId, currentElements, loadedImages, loadImageAspectRatio, onLoadImage, product, setCurrentElements, setSelectedId, toast]);

  // ── Face toggle ───────────────────────────────────────────────────────────
  const handleFaceToggle = useCallback((face: number, enabled: boolean) => {
    updateFaces((prev) => ({
      ...prev,
      [face]: { ...prev[face], enabled },
    }));
  }, [updateFaces]);

  // ── Save draft ────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!product) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const designData: any = {
        faces: Object.fromEntries(
          Object.entries(faces).map(([f, fd]) => [f, { enabled: fd.enabled, elements: fd.elements }])
        )
      };
      const { error } = await supabase.from("designs").insert([{
        product_id: product.id,
        status: "draft" as const,
        design_data: designData,
        faces_to_print: Object.values(faces).filter((f) => f.enabled).length,
        customer_id: customerId ?? null,
        guest_session_id: customerId ? null : getGuestSessionId(),
        name: `${product.name} - borrador`,
      }]);
      if (error) throw error;
      toast({ title: "Borrador guardado", description: "Tu diseño ha sido guardado." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Finalize ──────────────────────────────────────────────────────────────
  const finalizeDesign = async () => {
    const enabledFaces = Object.entries(faces).filter(([, fd]) => fd.enabled);
    const emptyFaces = enabledFaces.filter(([, fd]) => fd.elements.length === 0);
    if (emptyFaces.length > 0) {
      toast({ title: "Caras vacías", description: "Agrega al menos un elemento a cada cara habilitada.", variant: "destructive" });
      return;
    }

    // Warn about potential issues (but don't block)
    const warnings: string[] = [];
    for (const [faceNum, fd] of enabledFaces) {
      for (const el of fd.elements) {
        if (el.x < -5 || el.y < -5 || (el.x + el.width) > 105 || (el.y + el.height) > 105) {
          warnings.push(`Cara ${faceNum}: elemento posiblemente fuera del área`);
        }
      }
    }
    if (warnings.length > 0) {
      toast({
        title: "Advertencias en tu diseño",
        description: warnings.join(". ") + ". El diseño se guardará de todas formas.",
      });
    }

    if (!product) return;
    setFinalizing(true);
    try {
      let mockupUrl: string | null = null;
      if (stageRef.current) {
        const dataUrl = stageRef.current.toDataURL({ mimeType: "image/png", quality: 0.8 });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const mockupPath = `${customerId ?? getGuestSessionId()}/${Date.now()}_mockup.png`;
        const { error: upErr } = await supabase.storage.from("design-mockups").upload(mockupPath, blob);
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("design-mockups").getPublicUrl(mockupPath);
          mockupUrl = publicUrl;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const designData2: any = {
        faces: Object.fromEntries(
          Object.entries(faces).map(([f, fd]) => [f, { enabled: fd.enabled, elements: fd.elements }])
        )
      };
      const { data: design, error } = await supabase.from("designs").insert([{
        product_id: product.id,
        status: "finalized" as const,
        design_data: designData2,
        faces_to_print: enabledFaces.length,
        customer_id: customerId ?? null,
        guest_session_id: customerId ? null : getGuestSessionId(),
        name: `${product.name} - diseño final`,
        mockup_image_url: mockupUrl,
      }]).select().single();
      if (error) throw error;
      toast({ title: "¡Diseño finalizado!", description: "Redirigiendo al checkout..." });
      navigate(`/checkout/${design.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al finalizar", variant: "destructive" });
    } finally {
      setFinalizing(false);
    }
  };

  // ── Zoom to fit helper ────────────────────────────────────────────────────
  const handleZoomToFit = useCallback(() => {
    if (!product) return;
    zoom.zoomToFit(stageSize.width, stageSize.height, outerW, outerH);
  }, [zoom, stageSize, outerW, outerH, product]);

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (!stageRef.current || !product || !subtype || !type) return;

    // Deselect to hide transformer handles
    setSelectedId(null);
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Crop to product area only (no gray background); use same outerW/outerH as canvas
    const dataUrl = stageRef.current.toDataURL({
      mimeType: "image/png",
      pixelRatio: 2,
      x: stageOffsetX,
      y: stageOffsetY,
      width: outerW,
      height: outerH,
    });

    const enabledFaces = Object.entries(faces)
      .filter(([, fd]) => fd.enabled && fd.elements.length > 0)
      .map(([f]) => Number(f));

    const faceLabels: Record<number, string> = {
      1: "Frente", 2: "Reverso", 3: "Izquierdo", 4: "Derecho", 5: "Superior", 6: "Inferior",
    };

    const { exportMockupPdf } = await import("@/utils/exportMockupPdf");
    exportMockupPdf({
      mockupDataUrl: dataUrl,
      productName: product.name,
      sku: product.sku,
      widthCm: product.width_cm,
      heightCm: product.height_cm,
      mockupAspectRatio: hasMockup ? outerW / outerH : undefined,
      printWidthCm: product.print_width_cm,
      printHeightCm: product.print_height_cm,
      subtypeName: `${subtype.material ?? subtype.name}${subtype.finish ? ` · ${subtype.finish}` : ""}`,
      printedFaces: enabledFaces.length > 0
        ? enabledFaces.map((f) => faceLabels[f] ?? `Cara ${f}`)
        : (type.printable_faces ?? []).map((f) => faceLabels[f] ?? `Cara ${f}`),
      quantityPacks,
      piecesPerPack: product.pieces_per_pack,
      pricePerFace: priceDetails?.pricePerFace ?? 0,
      subtotal: priceDetails?.subtotal ?? 0,
      iva: priceDetails?.iva ?? 0,
      total: priceDetails?.total ?? 0,
      tierName: priceDetails?.tierName ?? "",
    });

    toast({ title: "PDF exportado", description: "El archivo se descargó a tu dispositivo." });
  }, [stageRef, product, subtype, type, faces, quantityPacks, priceDetails, stageOffsetX, stageOffsetY, outerW, outerH, hasMockup, toast]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="gradient-hero h-12 flex items-center px-4 gap-3 shrink-0 z-10">
        <Package className="w-5 h-5 text-accent" />
        <span className="text-primary-foreground font-semibold text-sm flex-1">
          Editor de diseño{hasProduct ? ` — ${product!.name}` : ""}
        </span>
        {hasProduct && (
          <span className="text-primary-foreground/50 text-xs hidden md:block">
            {product!.width_cm}×{product!.height_cm} cm · {product!.sku}
          </span>
        )}
      </header>

      {hasProduct ? (
      /* 3-column layout */
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left */}
        <EditorLeftPanel
          assets={assets}
          setAssets={setAssets}
          templates={templates}
          customerId={customerId}
          printWidthCm={product.print_width_cm}
          printHeightCm={product.print_height_cm}
          loadedImages={loadedImages}
          onImageLoaded={onImageLoaded}
          currentFaceElements={currentElements}
          onAddImage={handleAddImage}
          onAddText={handleAddText}
          onApplyTemplate={handleApplyTemplate}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetId}
          selectedTextElement={selectedTextElement}
          onTextPropertyChange={handleTextPropertyChange}
          onDeleteAsset={handleDeleteAsset}
        />

        {/* Center */}
        <main ref={centerRef} className="flex-1 flex flex-col overflow-hidden">
          <EditorToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            scale={zoom.scale}
            onZoomIn={zoom.zoomIn}
            onZoomOut={zoom.zoomOut}
            onZoomToFit={handleZoomToFit}
            onZoomTo100={zoom.zoomTo100}
            onZoomToScale={zoom.zoomToScale}
            onExportPdf={handleExportPdf}
          />
          <EditorCanvas
            stageRef={stageRef}
            product={product}
            subtype={subtype}
            type={type}
            faces={faces}
            activeFace={activeFace}
            onActiveFaceChange={setActiveFace}
            selectedId={selectedId}
            onSelectId={setSelectedId}
            loadedImages={loadedImages}
            onLoadImage={onLoadImage}
            snapGuides={snapGuides}
            zoom={zoom}
            onWheel={zoom.handleWheel}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
            onTextChange={handleTextChange}
            printOffsetX={printOffsetX}
            printOffsetY={printOffsetY}
            printW={printW}
            printH={printH}
            stageOffsetX={stageOffsetX}
            stageOffsetY={stageOffsetY}
            stageW={stageSize.width}
            stageH={stageSize.height}
            outerW={outerW}
            outerH={outerH}
            hasMockup={hasMockup}
            mockupImageUrl={activeMockupImageUrl}
          />
        </main>

        {/* Right */}
        <EditorRightPanel
          product={product}
          subtype={subtype}
          type={type}
          faces={faces}
          onFaceToggle={handleFaceToggle}
          quantityPacks={quantityPacks}
          onQuantityChange={setQuantityPacks}
          customerId={customerId}
          role={role}
          saving={saving}
          finalizing={finalizing}
          onSaveDraft={saveDraft}
          onFinalize={finalizeDesign}
          onExportPdf={handleExportPdf}
          onPriceCalculated={setPriceDetails}
          onProductChange={handleProductChange}
        />
      </div>
      ) : (
        /* Empty state — solo header + contenido centrado */
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Selecciona un producto</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Elige un producto del catálogo para comenzar a diseñar
            </p>
            <div className="w-full max-w-md max-h-96 rounded-xl shadow-sm bg-card border border-border overflow-hidden">
              <ProductPickerList
                loadTrigger={true}
                autoFocus={true}
                requireSearch={true}
                selectedProductId={null}
                onSelect={handleProductChange}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
