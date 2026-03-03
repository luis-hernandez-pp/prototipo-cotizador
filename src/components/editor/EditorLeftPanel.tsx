import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Upload, Type, Layout, Loader2, Plus, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { TemplatePreview, TemplateBadge } from "./utils/templatePreviews";
import { loadImageWithBlob } from "./elements/ImageElement";
import type { CanvasElement, FaceData } from "./hooks/useEditorHistory";

export type CustomerAsset = Tables<"customer_assets">;
export type DesignTemplate = Tables<"design_templates">;

const FONTS = [
  "Arial", "Helvetica", "Georgia", "Times New Roman",
  "Courier New", "Verdana", "Impact", "Comic Sans MS",
  "Trebuchet MS", "Palatino"
];

function getGuestSessionId(): string {
  const key = "pp_guest_session";
  let id = sessionStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
  return id;
}

function calcDPI(wPx: number, hPx: number, printWCm: number, printHCm: number): number {
  return Math.round(Math.min(wPx / (printWCm / 2.54), hPx / (printHCm / 2.54)));
}

function QualityBadge({ asset }: { asset: CustomerAsset }) {
  if (asset.is_vector) return <Badge className="bg-green-500/90 text-white text-[10px] px-1.5">Vector</Badge>;
  if (!asset.dpi) return null;
  if (asset.dpi >= 300) return <Badge className="bg-green-500/90 text-white text-[10px] px-1.5">{asset.dpi} DPI ✓</Badge>;
  if (asset.dpi >= 200) return <Badge className="bg-yellow-500/90 text-white text-[10px] px-1.5">{asset.dpi} DPI</Badge>;
  return <Badge className="bg-destructive text-white text-[10px] px-1.5">⚠ {asset.dpi} DPI</Badge>;
}

interface EditorLeftPanelProps {
  assets: CustomerAsset[];
  setAssets: React.Dispatch<React.SetStateAction<CustomerAsset[]>>;
  templates: DesignTemplate[];
  customerId?: string;
  printWidthCm: number;
  printHeightCm: number;
  loadedImages: Record<string, HTMLImageElement>;
  onImageLoaded: (id: string, img: HTMLImageElement) => void;
  currentFaceElements: CanvasElement[];
  onAddImage: (asset: CustomerAsset, img: HTMLImageElement) => void;
  onAddText: (el: Omit<CanvasElement, "id">) => void;
  onApplyTemplate: (template: DesignTemplate) => void;
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  selectedTextElement: CanvasElement | null;
  onTextPropertyChange: (elementId: string, props: Partial<CanvasElement>) => void;
  onDeleteAsset?: (assetId: string) => Promise<void>;
}

export function EditorLeftPanel({
  assets, setAssets, templates, customerId,
  printWidthCm, printHeightCm,
  loadedImages, onImageLoaded,
  currentFaceElements,
  onAddImage, onAddText, onApplyTemplate,
  selectedAssetId, onSelectAsset,
  selectedTextElement, onTextPropertyChange,
  onDeleteAsset,
}: EditorLeftPanelProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [textFont, setTextFont] = useState("Arial");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#1a365d");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);

  // Whether we're editing an existing selected text element
  const isEditingSelected = !!selectedTextElement;

  // The "active" values: from selected element if editing, otherwise from local state
  const activeFont = isEditingSelected ? (selectedTextElement.font ?? "Arial") : textFont;
  const activeSize = isEditingSelected ? (selectedTextElement.fontSize ?? 36) : textSize;
  const activeColor = isEditingSelected ? (selectedTextElement.color ?? "#1a365d") : textColor;
  const activeBold = isEditingSelected ? (selectedTextElement.bold ?? false) : textBold;
  const activeItalic = isEditingSelected ? (selectedTextElement.italic ?? false) : textItalic;
  const activeContent = isEditingSelected ? (selectedTextElement.content ?? "") : textContent;

  // Unified setters: update canvas element if editing, or local state otherwise
  const setFont = (v: string) => {
    if (isEditingSelected) onTextPropertyChange(selectedTextElement.id, { font: v });
    else setTextFont(v);
  };
  const setSize = (v: number) => {
    if (isEditingSelected) onTextPropertyChange(selectedTextElement.id, { fontSize: v });
    else setTextSize(v);
  };
  const setColor = (v: string) => {
    if (isEditingSelected) onTextPropertyChange(selectedTextElement.id, { color: v });
    else setTextColor(v);
  };
  const setBold = (v: boolean) => {
    if (isEditingSelected) onTextPropertyChange(selectedTextElement.id, { bold: v });
    else setTextBold(v);
  };
  const setItalic = (v: boolean) => {
    if (isEditingSelected) onTextPropertyChange(selectedTextElement.id, { italic: v });
    else setTextItalic(v);
  };
  const setContent = (v: string) => {
    if (isEditingSelected) onTextPropertyChange(selectedTextElement.id, { content: v });
    else setTextContent(v);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const guestSessionId = getGuestSessionId();
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isVector = ext === "svg";
      const path = `${customerId ?? guestSessionId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-assets").upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(path);

      let dpi: number | null = null;
      let widthPx: number | null = null;
      let heightPx: number | null = null;
      let qualityScore: "high" | "medium" | "low" = "high";

      if (!isVector) {
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            widthPx = img.naturalWidth;
            heightPx = img.naturalHeight;
            dpi = calcDPI(widthPx, heightPx, printWidthCm, printHeightCm);
            qualityScore = dpi >= 300 ? "high" : dpi >= 200 ? "medium" : "low";
            resolve();
          };
          img.src = URL.createObjectURL(file);
        });
      }

      const { data: asset, error: dbError } = await supabase.from("customer_assets").insert({
        file_name: file.name,
        file_type: file.type || `image/${ext}`,
        file_url: publicUrl,
        file_size_bytes: file.size,
        original_width_px: widthPx,
        original_height_px: heightPx,
        dpi,
        is_vector: isVector,
        quality_score: isVector ? null : qualityScore,
        customer_id: customerId ?? null,
        guest_session_id: customerId ? null : guestSessionId,
      }).select().single();
      if (dbError) throw dbError;

      setAssets((prev) => [asset, ...prev]);
      toast({ title: "Archivo subido", description: file.name });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al subir", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAssetClick = useCallback(async (asset: CustomerAsset) => {
    onSelectAsset(asset.id);
    const cacheKey = asset.id;
    let img = loadedImages[cacheKey];
    if (!img) {
      img = await loadImageWithBlob(asset.file_url);
      onImageLoaded(cacheKey, img);
    }
    onAddImage(asset, img);
  }, [loadedImages, onImageLoaded, onAddImage, onSelectAsset]);

  const handleApplyTemplate = useCallback((template: DesignTemplate) => {
    onApplyTemplate(template);
  }, [onApplyTemplate]);

  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col overflow-y-auto shrink-0">
      {/* Upload */}
      <section className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-accent" /> Subir archivo
        </h3>
        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-accent transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-accent" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground text-center">
            {uploading ? "Subiendo..." : "PNG, JPG o SVG · Haz clic para subir"}
          </span>
          <input type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </section>

      {/* Asset gallery */}
      {assets.length > 0 && (
        <section className="p-4 border-b border-border">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Mis archivos</h4>
          <div className="grid grid-cols-3 gap-2">
            {assets.map((asset) => (
              <div key={asset.id} className="relative group">
                <button
                  onClick={() => handleAssetClick(asset)}
                  disabled={deletingId === asset.id}
                  className={`relative aspect-square w-full rounded-lg overflow-hidden border-2 transition-colors bg-muted ${
                    deletingId === asset.id ? "opacity-40 cursor-not-allowed" :
                    selectedAssetId === asset.id
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-border hover:border-accent"
                  }`}>
                  <img src={asset.file_url} alt={asset.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {deletingId === asset.id ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1">
                    <QualityBadge asset={asset} />
                  </div>
                </button>

                {/* Delete × button */}
                {onDeleteAsset && deletingId !== asset.id && (
                  <button
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => { e.stopPropagation(); setPendingDeleteId(asset.id); }}
                    title="Eliminar archivo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {/* Inline confirmation overlay */}
                {pendingDeleteId === asset.id && (
                  <div className="absolute inset-0 bg-black/75 rounded-lg flex flex-col items-center justify-center gap-1 z-20">
                    <p className="text-white text-xs text-center px-1 font-medium">¿Eliminar?</p>
                    <div className="flex gap-1">
                      <button
                        className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded hover:opacity-90"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setPendingDeleteId(null);
                          setDeletingId(asset.id);
                          await onDeleteAsset!(asset.id);
                          setDeletingId(null);
                        }}
                      >
                        Sí
                      </button>
                      <button
                        className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded hover:opacity-90"
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null); }}
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Text */}
      <section className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Type className="w-4 h-4 text-accent" />
          {isEditingSelected ? "Editar texto seleccionado" : "Agregar texto"}
        </h3>
        {isEditingSelected && (
          <div className="mb-3 px-2 py-1.5 bg-accent/10 border border-accent/30 rounded-md">
            <p className="text-xs text-accent font-medium">Editando texto en canvas</p>
          </div>
        )}
        <div className="space-y-3">
          <Input placeholder="Escribe aquí..." value={activeContent}
            onChange={(e) => setContent(e.target.value)} className="text-sm h-8" />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Fuente</Label>
            <select value={activeFont} onChange={(e) => setFont(e.target.value)}
              className="w-full h-8 text-sm border border-border rounded-md px-2 bg-background text-foreground">
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Tamaño: {activeSize}px</Label>
            <Slider min={12} max={120} step={2} value={[activeSize]}
              onValueChange={([v]) => setSize(v)} className="mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Color</Label>
              <input type="color" value={activeColor} onChange={(e) => setColor(e.target.value)}
                className="h-8 w-16 rounded cursor-pointer border border-border" />
            </div>
            <div className="flex gap-1 mt-4">
              <button onClick={() => setBold(!activeBold)}
                className={`w-8 h-8 rounded border font-bold text-sm transition-colors ${activeBold ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                B
              </button>
              <button onClick={() => setItalic(!activeItalic)}
                className={`w-8 h-8 rounded border italic text-sm transition-colors ${activeItalic ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                I
              </button>
            </div>
          </div>
          {!isEditingSelected && (
            <Button size="sm" variant="outline" className="w-full text-xs h-8 border-accent text-accent hover:bg-accent/10"
              onClick={() => {
                if (!activeContent.trim()) return;
                onAddText({
                  type: "text", content: activeContent, font: activeFont,
                  fontSize: activeSize, color: activeColor, bold: activeBold, italic: activeItalic,
                  x: 20, y: 20, width: 60, height: 15, rotation: 0,
                });
                setTextContent("");
              }} disabled={!activeContent.trim()}>
              <Type className="w-3 h-3 mr-1" /> Agregar al canvas
            </Button>
          )}
        </div>
      </section>

      {/* Templates */}
      {templates.length > 0 && (
        <section className="p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Layout className="w-4 h-4 text-accent" /> Plantillas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button key={t.id} onClick={() => handleApplyTemplate(t)}
                className="bg-muted border border-border rounded-lg p-2 hover:border-accent hover:shadow-md transition-all text-left group">
                <TemplatePreview template={t} />
                <p className="text-xs text-muted-foreground truncate group-hover:text-accent mb-0.5">{t.name}</p>
                <TemplateBadge template={t} />
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
