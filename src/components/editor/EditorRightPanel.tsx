import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, CheckCircle, Loader2, Minus, Plus, Package, AlertTriangle, FileDown, ChevronDown } from "lucide-react";
import PriceCalculator from "@/components/PriceCalculator";
import type { PriceDetails } from "@/components/PriceCalculator";
import type { Tables } from "@/integrations/supabase/types";
import type { FaceData } from "./hooks/useEditorHistory";
import type { UserRole } from "@/contexts/AuthContext";
import { ProductPickerList } from "./ProductPickerList";

type Product = Tables<"products">;
type ProductSubtype = Tables<"product_subtypes">;
type ProductType = Tables<"product_types">;

const FACE_LABELS: Record<number, string> = {
  1: "Frente", 2: "Reverso", 3: "Izquierdo", 4: "Derecho", 5: "Superior", 6: "Inferior"
};

interface EditorRightPanelProps {
  product: Product;
  subtype: ProductSubtype;
  type: ProductType;
  faces: Record<number, FaceData>;
  onFaceToggle: (face: number, enabled: boolean) => void;
  quantityPacks: number;
  onQuantityChange: (qty: number) => void;
  customerId?: string;
  role: UserRole;
  saving: boolean;
  finalizing: boolean;
  onSaveDraft: () => void;
  onFinalize: () => void;
  onExportPdf?: () => void;
  onPriceCalculated?: (details: PriceDetails | null) => void;
  onProductChange?: (productId: string) => void;
}

export function EditorRightPanel({
  product, subtype, type, faces, onFaceToggle,
  quantityPacks, onQuantityChange,
  customerId, role, saving, finalizing,
  onSaveDraft, onFinalize, onExportPdf, onPriceCalculated,
  onProductChange,
}: EditorRightPanelProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const printableCount = Object.values(faces).filter((f) => f.enabled).length;
  const hasEmptyEnabledFaces = Object.values(faces).some((f) => f.enabled && f.elements.length === 0);

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col overflow-y-auto shrink-0">
      {/* Product info — clickable to open switcher */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <section className="p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl border border-border overflow-hidden shrink-0"
                style={{ backgroundColor: subtype.color_hex ?? "#e5e7eb" }}>
                {subtype.image_url
                  ? <img src={subtype.image_url} className="w-full h-full object-cover" alt={subtype.name} />
                  : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-white/30" /></div>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground text-sm leading-tight">{product.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{subtype.material} · {subtype.finish}</p>
                <p className="text-xs text-muted-foreground">{product.width_cm}×{product.height_cm} cm</p>
              </div>
              {onProductChange && (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              )}
            </div>
          </section>
        </PopoverTrigger>
        {onProductChange && (
          <PopoverContent className="w-80 p-0" align="start">
            <ProductPickerList
              loadTrigger={popoverOpen}
              selectedProductId={product.id}
              onSelect={(id) => {
                onProductChange(id);
                setPopoverOpen(false);
              }}
            />
          </PopoverContent>
        )}
      </Popover>

      {/* Face toggles */}
      <section className="p-4 border-b border-border">
        <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Caras a imprimir</h4>
        <div className="space-y-1.5">
          {(type.printable_faces ?? []).map((face) => {
            const isRestricted = (product.restricted_faces ?? []).includes(face);
            const fd = faces[face];
            return (
              <label key={face} className={`flex items-center gap-2 text-sm ${isRestricted ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="checkbox" disabled={isRestricted}
                  checked={fd?.enabled ?? false}
                  onChange={(e) => onFaceToggle(face, e.target.checked)}
                  className="rounded border-border text-accent" />
                <span className={fd?.enabled ? "text-foreground font-medium" : "text-muted-foreground"}>
                  Cara {face} — {FACE_LABELS[face] ?? ""}
                </span>
                {fd?.elements.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{fd.elements.length} elem.</span>
                )}
              </label>
            );
          })}
        </div>
      </section>

      {/* Quantity */}
      <section className="p-4 border-b border-border">
        <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Cantidad</h4>
        <div className="flex items-center gap-2">
          <button onClick={() => onQuantityChange(Math.max(product.min_packs, quantityPacks - 1))}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <Input type="number" min={product.min_packs} value={quantityPacks}
            onChange={(e) => onQuantityChange(Math.max(product.min_packs, parseInt(e.target.value) || product.min_packs))}
            className="w-16 text-center h-8 text-sm" />
          <button onClick={() => onQuantityChange(quantityPacks + 1)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground">
            = {(quantityPacks * product.pieces_per_pack).toLocaleString("es-MX")} pzs
          </span>
        </div>
      </section>

      {/* Price calculator */}
      <section className="p-4 border-b border-border">
        <PriceCalculator
          productId={product.id}
          piecesPerPack={product.pieces_per_pack}
          facesToPrint={printableCount || 1}
          quantityPacks={quantityPacks}
          onPriceCalculated={onPriceCalculated}
        />
      </section>

      {/* Actions */}
      <section className="p-4 space-y-2">
        <Button variant="outline" className="w-full h-9 text-sm" onClick={onSaveDraft} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar borrador
        </Button>
        {onExportPdf && (
          <Button variant="outline" className="w-full h-9 text-sm" onClick={onExportPdf}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        )}
        <Button variant="cta" className="w-full h-9 text-sm" onClick={onFinalize} disabled={finalizing}>
          {finalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Finalizar diseño
        </Button>
        {hasEmptyEnabledFaces && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
            Algunas caras habilitadas están vacías.
          </div>
        )}
      </section>
    </aside>
  );
}
