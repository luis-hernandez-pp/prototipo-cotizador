import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Image, Loader2, Trash2, Upload, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Product = Tables<"products">;
type ProductMockupFace = Tables<"product_mockup_faces">;

interface PrintArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FaceMockup {
  id?: string;
  imageUrl: string | null;
  printArea: PrintArea;
  hasArea: boolean;
}

const DEFAULT_AREA: PrintArea = { x: 10, y: 15, w: 80, h: 70 };
const MIN_SIZE = 5;

const FACE_LABELS: Record<number, string> = {
  1: "Frente",
  2: "Reverso",
  3: "Izquierdo",
  4: "Derecho",
  5: "Superior",
  6: "Inferior",
};

export default function ProductMockupEditor() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [availableFaces, setAvailableFaces] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [faceMockups, setFaceMockups] = useState<Record<number, FaceMockup>>({});
  const [activeFace, setActiveFace] = useState<number>(1);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load product with product_type and existing mockup faces
  useEffect(() => {
    if (!productId) return;

    (async () => {
      const { data: prodData } = await supabase
        .from("products")
        .select("*, product_subtypes(*, product_types(*))")
        .eq("id", productId)
        .single();

      if (!prodData) {
        setProduct(null);
        setLoading(false);
        return;
      }

      const prod = prodData as Product & {
        product_subtypes?: { product_types?: { printable_faces?: number[] } };
      };
      setProduct(prodData as Product);

      const printable = prod.product_subtypes?.product_types?.printable_faces ?? [];
      const restricted = prod.restricted_faces ?? [];
      const available = printable.filter((f: number) => !restricted.includes(f));
      setAvailableFaces(available.length > 0 ? available : [1]);

      const { data: facesData } = await supabase
        .from("product_mockup_faces")
        .select("*")
        .eq("product_id", productId);

      const initial: Record<number, FaceMockup> = {};
      const faces = available.length > 0 ? available : [1];
      for (const face of faces) {
        const row = (facesData as ProductMockupFace[] | null)?.find(
          (r) => r.face_number === face
        );
        if (row) {
          const hasArea =
            row.print_area_x != null &&
            row.print_area_y != null &&
            row.print_area_w != null &&
            row.print_area_h != null;
          initial[face] = {
            id: row.id,
            imageUrl: row.image_url,
            printArea: hasArea
              ? {
                  x: Number(row.print_area_x),
                  y: Number(row.print_area_y),
                  w: Number(row.print_area_w),
                  h: Number(row.print_area_h),
                }
              : DEFAULT_AREA,
            hasArea,
          };
        } else {
          initial[face] = {
            imageUrl: null,
            printArea: DEFAULT_AREA,
            hasArea: false,
          };
        }
      }
      setFaceMockups(initial);
      setActiveFace(faces[0] ?? 1);
      setLoading(false);
    })();
  }, [productId]);

  const currentMockup = faceMockups[activeFace];
  const mockupUrl = currentMockup?.imageUrl ?? null;
  const printArea = currentMockup?.printArea ?? DEFAULT_AREA;

  const setPrintAreaForFace = (face: number, area: PrintArea) => {
    setFaceMockups((prev) => ({
      ...prev,
      [face]: {
        ...prev[face],
        printArea: area,
        hasArea: true,
      },
    }));
  };

  // Upload handler (per face)
  const handleUpload = async (file: File) => {
    if (!product) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${product.id}/face-${activeFace}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("product-mockups")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Error al subir", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-mockups")
      .getPublicUrl(path);

    setFaceMockups((prev) => ({
      ...prev,
      [activeFace]: {
        ...prev[activeFace],
        imageUrl: publicUrl,
        printArea: prev[activeFace]?.printArea ?? DEFAULT_AREA,
        hasArea: prev[activeFace]?.hasArea ?? false,
      },
    }));
    setUploading(false);
    toast({ title: "Foto subida correctamente" });
  };

  // Drag logic (operates on active face)
  const startDrag = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startArea = { ...printArea };
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const clamp = (val: number, min: number, max: number) =>
      Math.max(min, Math.min(max, val));

    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      const next = { ...startArea };

      if (handle === "move") {
        next.x = clamp(startArea.x + dx, 0, 100 - startArea.w);
        next.y = clamp(startArea.y + dy, 0, 100 - startArea.h);
      } else {
        if (handle.includes("w")) {
          const newX = clamp(startArea.x + dx, 0, startArea.x + startArea.w - MIN_SIZE);
          next.w = startArea.w - (newX - startArea.x);
          next.x = newX;
        }
        if (handle.includes("e")) {
          next.w = clamp(startArea.w + dx, MIN_SIZE, 100 - startArea.x);
        }
        if (handle.includes("n")) {
          const newY = clamp(startArea.y + dy, 0, startArea.y + startArea.h - MIN_SIZE);
          next.h = startArea.h - (newY - startArea.y);
          next.y = newY;
        }
        if (handle.includes("s")) {
          next.h = clamp(startArea.h + dy, MIN_SIZE, 100 - startArea.y);
        }
      }

      setPrintAreaForFace(activeFace, next);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Save handler (per face)
  const handleSave = async () => {
    if (!product) return;
    const fm = faceMockups[activeFace];
    if (!fm?.imageUrl) return;

    setSaving(true);
    const payload = {
      product_id: product.id,
      face_number: activeFace,
      image_url: fm.imageUrl,
      print_area_x: Math.round(fm.printArea.x * 100) / 100,
      print_area_y: Math.round(fm.printArea.y * 100) / 100,
      print_area_w: Math.round(fm.printArea.w * 100) / 100,
      print_area_h: Math.round(fm.printArea.h * 100) / 100,
    };

    try {
      if (fm.id) {
        await supabase.from("product_mockup_faces").update(payload).eq("id", fm.id);
      } else {
        const { data } = await supabase
          .from("product_mockup_faces")
          .insert(payload)
          .select()
          .single();
        if (data) {
          setFaceMockups((prev) => ({
            ...prev,
            [activeFace]: { ...prev[activeFace], id: data.id },
          }));
        }
      }

      // Backward compatibility: update products table for face 1
      if (activeFace === 1) {
        await supabase
          .from("products")
          .update({
            mockup_image_url: fm.imageUrl,
            mockup_print_area_x: payload.print_area_x,
            mockup_print_area_y: payload.print_area_y,
            mockup_print_area_w: payload.print_area_w,
            mockup_print_area_h: payload.print_area_h,
          })
          .eq("id", product.id);
      }

      toast({ title: `Mockup de Cara ${activeFace} guardado` });
    } catch (err) {
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete mockup handler (per face)
  const handleDeleteMockup = async () => {
    const fm = faceMockups[activeFace];
    if (!fm?.imageUrl) return;
    if (!confirm("¿Eliminar la foto de mockup y el área definida para esta cara?")) return;

    setDeleting(true);

    try {
      if (fm.imageUrl) {
        const url = new URL(fm.imageUrl);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (pathMatch) {
          const [, bucket, filePath] = pathMatch;
          await supabase.storage.from(bucket).remove([filePath]);
        }
      }

      if (fm.id) {
        await supabase.from("product_mockup_faces").delete().eq("id", fm.id);
      }

      setFaceMockups((prev) => ({
        ...prev,
        [activeFace]: { imageUrl: null, printArea: DEFAULT_AREA, hasArea: false },
      }));

      if (activeFace === 1) {
        await supabase
          .from("products")
          .update({
            mockup_image_url: null,
            mockup_print_area_x: null,
            mockup_print_area_y: null,
            mockup_print_area_w: null,
            mockup_print_area_h: null,
          })
          .eq("id", product!.id);
      }

      toast({ title: `Mockup de Cara ${activeFace} eliminado` });
    } catch (err) {
      toast({
        title: "Error al eliminar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-destructive">Producto no encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/products")}>
          Volver al catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/products")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver al catálogo
        </Button>
        <div className="h-4 w-px bg-border" />
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">
            Mockup: {product.name}
          </h1>
          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Left panel */}
        <aside className="space-y-5">
          {/* Face tabs */}
          <div className="flex flex-wrap gap-1.5">
            {availableFaces.map((face) => {
              const isActive = face === activeFace;
              const hasMockup = !!faceMockups[face]?.imageUrl;
              return (
                <button
                  key={face}
                  onClick={() => setActiveFace(face)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  Cara {face} — {FACE_LABELS[face] ?? ""}
                  {hasMockup && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Upload section */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Foto del producto</h3>
            {mockupUrl ? (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={mockupUrl} alt={`${product.name} - Cara ${activeFace}`} className="w-full object-cover" />
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 p-8 cursor-pointer hover:border-accent/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center">
                  Haz clic para subir una foto del producto
                </p>
                <p className="text-xs text-muted-foreground/60">PNG, JPG, WebP</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {mockupUrl ? "Cambiar foto" : "Subir foto"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </div>

          {/* Print area status */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Área de impresión</h3>
            <div className="flex items-center gap-2 text-sm">
              {currentMockup?.hasArea ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-foreground">Área definida</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Sin configurar</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Dimensiones de impresión: {product.print_width_cm}×{product.print_height_cm} cm
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving || !mockupUrl}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
            {mockupUrl && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={handleDeleteMockup}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Eliminar mockup
              </Button>
            )}
          </div>
        </aside>

        {/* Right panel — visual editor */}
        <div className="space-y-3">
          {mockupUrl ? (
            <>
              <div
                ref={containerRef}
                className="relative inline-block select-none max-w-full rounded-lg overflow-hidden"
              >
                {/* Product photo */}
                <img
                  src={mockupUrl}
                  className="max-w-full max-h-[70vh] block rounded-lg"
                  draggable={false}
                  alt={`${product.name} - Cara ${activeFace}`}
                />

                {/* Dark overlay — 4 strips around the print area */}
                <div className="absolute left-0 top-0 bg-black/40 pointer-events-none"
                  style={{ width: "100%", height: `${printArea.y}%` }} />
                <div className="absolute left-0 bg-black/40 pointer-events-none"
                  style={{ top: `${printArea.y + printArea.h}%`, width: "100%", height: `${100 - printArea.y - printArea.h}%` }} />
                <div className="absolute left-0 bg-black/40 pointer-events-none"
                  style={{ top: `${printArea.y}%`, width: `${printArea.x}%`, height: `${printArea.h}%` }} />
                <div className="absolute bg-black/40 pointer-events-none"
                  style={{ left: `${printArea.x + printArea.w}%`, top: `${printArea.y}%`, width: `${100 - printArea.x - printArea.w}%`, height: `${printArea.h}%` }} />

                {/* Draggable print area */}
                <div
                  className="absolute border-2 border-dashed border-orange-500 cursor-move"
                  style={{
                    left: `${printArea.x}%`,
                    top: `${printArea.y}%`,
                    width: `${printArea.w}%`,
                    height: `${printArea.h}%`,
                  }}
                  onMouseDown={(e) => startDrag(e, "move")}
                >
                  {/* Corner handles */}
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-orange-500 rounded-full cursor-nw-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "nw"); }} />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-orange-500 rounded-full cursor-ne-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "ne"); }} />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-orange-500 rounded-full cursor-sw-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "sw"); }} />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-orange-500 rounded-full cursor-se-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "se"); }} />

                  {/* Edge handles */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-orange-500 rounded cursor-n-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "n"); }} />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-orange-500 rounded cursor-s-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "s"); }} />
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-orange-500 rounded cursor-w-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "w"); }} />
                  <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-orange-500 rounded cursor-e-resize z-10"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "e"); }} />

                  {/* Labels */}
                  <div className="absolute top-1 left-1 text-orange-400 text-xs font-medium bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
                    Área de impresión
                  </div>
                  <div className="absolute bottom-1 right-1 text-orange-300 text-xs font-mono bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
                    {product.print_width_cm}×{product.print_height_cm} cm
                  </div>
                </div>
              </div>

              {/* Coordinates display */}
              <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                <span>X: {printArea.x.toFixed(1)}%</span>
                <span>Y: {printArea.y.toFixed(1)}%</span>
                <span>W: {printArea.w.toFixed(1)}%</span>
                <span>H: {printArea.h.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Arrastra el rectángulo naranja para mover el área de impresión. Usa las esquinas y bordes para redimensionar.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl gap-3 text-center p-8">
              <Image className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                Sube una foto del producto para definir el área de impresión.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
