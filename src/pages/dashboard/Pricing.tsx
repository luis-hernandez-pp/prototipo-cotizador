import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  DollarSign,
  Check,
  X,
  Search,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Product = Tables<"products">;
type ProductPricingTier = Tables<"product_pricing_tiers">;

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);

// ── Tier row (inline editable) ─────────────────────────────────────────────────
function TierRow({
  tier,
  onSave,
  onDelete,
}: {
  tier: ProductPricingTier;
  onSave: (id: string, data: Partial<ProductPricingTier>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [minP, setMinP] = useState(String(tier.min_packs));
  const [maxP, setMaxP] = useState(
    tier.max_packs !== null ? String(tier.max_packs) : ""
  );
  const [price, setPrice] = useState(String(tier.price_per_face));
  const [name, setName] = useState(tier.name);

  const reset = () => {
    setMinP(String(tier.min_packs));
    setMaxP(tier.max_packs !== null ? String(tier.max_packs) : "");
    setPrice(String(tier.price_per_face));
    setName(tier.name);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    await onSave(tier.id, {
      name,
      min_packs: parseInt(minP),
      max_packs: maxP === "" ? null : parseInt(maxP),
      price_per_face: parseFloat(price),
    });
    setSaving(false);
    setEditing(false);
  };

  const rangeLabel =
    tier.max_packs !== null
      ? `${tier.min_packs.toLocaleString("es-MX")} – ${tier.max_packs.toLocaleString("es-MX")} paq`
      : `${tier.min_packs.toLocaleString("es-MX")}+ paq`;

  if (!editing) {
    return (
      <tr className="border-b border-border hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3 font-medium text-foreground">{tier.name}</td>
        <td className="px-4 py-3 text-muted-foreground font-mono text-sm">
          {rangeLabel}
        </td>
        <td className="px-4 py-3 font-semibold text-accent">{MXN(Number(tier.price_per_face))}</td>
        <td className="px-4 py-3">
          <Badge
            variant={tier.is_active ? "default" : "secondary"}
            className="text-xs"
          >
            {tier.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(tier.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border bg-accent/5">
      <td className="px-3 py-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
          placeholder="Nombre del rango"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={minP}
            onChange={(e) => setMinP(e.target.value)}
            className="h-8 text-sm w-24"
            placeholder="Desde"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            value={maxP}
            onChange={(e) => setMaxP(e.target.value)}
            className="h-8 text-sm w-24"
            placeholder="Sin límite"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8 text-sm w-28"
          placeholder="Precio"
        />
      </td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-green-600 hover:text-green-700"
            onClick={save}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={reset}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── New Tier Row ───────────────────────────────────────────────────────────────
function NewTierRow({
  onAdd,
  onCancel,
}: {
  onAdd: (data: Omit<ProductPricingTier, "id" | "created_at" | "updated_at" | "product_id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [price, setPrice] = useState("");

  const save = async () => {
    if (!name || !minP || !price) return;
    setSaving(true);
    await onAdd({
      name,
      min_packs: parseInt(minP),
      max_packs: maxP === "" ? null : parseInt(maxP),
      price_per_face: parseFloat(price),
      is_active: true,
    });
    setSaving(false);
  };

  return (
    <tr className="border-b border-accent/30 bg-accent/5">
      <td className="px-3 py-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
          placeholder="Nombre (ej: 1-5 paquetes)"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={minP}
            onChange={(e) => setMinP(e.target.value)}
            className="h-8 text-sm w-24"
            placeholder="Desde"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            value={maxP}
            onChange={(e) => setMaxP(e.target.value)}
            className="h-8 text-sm w-24"
            placeholder="Sin límite"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8 text-sm w-28"
          placeholder="$0.00"
        />
      </td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-green-600 hover:text-green-700"
            onClick={save}
            disabled={saving || !name || !minP || !price}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Pricing Page ──────────────────────────────────────────────────────────
export default function Pricing() {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tiers, setTiers] = useState<ProductPricingTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [addingTier, setAddingTier] = useState(false);

  // ── Product search (debounced) ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const q = searchQuery.trim();
      const { data } = await supabase
        .from("products")
        .select("*")
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .eq("is_active", true)
        .limit(10);
      setSearchResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Load tiers for selected product ──
  const fetchTiers = useCallback(async (productId: string) => {
    setTiersLoading(true);
    const { data } = await supabase
      .from("product_pricing_tiers")
      .select("*")
      .eq("product_id", productId)
      .order("min_packs");
    setTiers(data ?? []);
    setTiersLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProduct?.id) fetchTiers(selectedProduct.id);
    else setTiers([]);
  }, [selectedProduct?.id, fetchTiers]);

  // ── Tier CRUD ──
  const handleSaveTier = useCallback(
    async (id: string, data: Partial<ProductPricingTier>) => {
      if (!selectedProduct) return;
      const { error } = await supabase
        .from("product_pricing_tiers")
        .update(data)
        .eq("id", id);
      if (error) {
        toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Rango actualizado" });
        fetchTiers(selectedProduct.id);
      }
    },
    [selectedProduct, fetchTiers, toast]
  );

  const handleDeleteTier = useCallback(
    async (id: string) => {
      if (!confirm("¿Eliminar este rango de precio?")) return;
      const { error } = await supabase
        .from("product_pricing_tiers")
        .delete()
        .eq("id", id);
      if (error) {
        toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Rango eliminado" });
        if (selectedProduct) fetchTiers(selectedProduct.id);
      }
    },
    [selectedProduct, fetchTiers, toast]
  );

  const handleAddTier = useCallback(
    async (data: Omit<ProductPricingTier, "id" | "created_at" | "updated_at" | "product_id">) => {
      if (!selectedProduct) return;
      const { error } = await supabase.from("product_pricing_tiers").insert({
        ...data,
        product_id: selectedProduct.id,
      });
      if (error) {
        toast({ title: "Error al crear", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Rango creado" });
        setAddingTier(false);
        fetchTiers(selectedProduct.id);
      }
    },
    [selectedProduct, fetchTiers, toast]
  );

  // ── Gap/overlap warning ──
  const tierWarning = (() => {
    if (tiers.length < 2) return null;
    for (let i = 0; i < tiers.length - 1; i++) {
      const curr = tiers[i];
      const next = tiers[i + 1];
      if (curr.max_packs === null) return null;
      if (curr.max_packs + 1 !== next.min_packs) {
        return `Brecha u overlap entre "${curr.name}" y "${next.name}": revisa que los rangos sean continuos.`;
      }
    }
    return null;
  })();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Precios</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona precios de personalización por producto.
          </p>
        </div>
      </div>

      {/* Product selector */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto por nombre o SKU..."
          className="pl-9 max-w-lg"
          disabled={!!selectedProduct}
        />
        {!selectedProduct && searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No se encontraron productos.
              </div>
            ) : (
              searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex flex-col gap-0.5"
                  onClick={() => {
                    setSelectedProduct(p);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <span className="font-mono text-sm text-accent">{p.sku}</span>
                  <span className="text-sm text-foreground">{p.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected product card */}
      {selectedProduct && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-accent">{selectedProduct.sku}</p>
              <h2 className="font-semibold text-foreground">{selectedProduct.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProduct.width_cm}×{selectedProduct.height_cm}
                {selectedProduct.depth_cm ? `×${selectedProduct.depth_cm}` : ""} cm ·{" "}
                {selectedProduct.pieces_per_pack} piezas/paquete
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedProduct(null);
                setAddingTier(false);
              }}
            >
              Cambiar producto
            </Button>
          </div>

          {/* Pricing tiers table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">Rangos de precio</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Precio por cara impresa según número de paquetes.
                </p>
              </div>
              <Button
                size="sm"
                className="gradient-hero text-primary-foreground h-8 gap-1.5"
                onClick={() => setAddingTier(true)}
                disabled={addingTier}
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo rango
              </Button>
            </div>

            {tierWarning && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-destructive/8 border-b border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {tierWarning}
              </div>
            )}

            {tiersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                        Nombre
                      </th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                        Rango (paquetes)
                      </th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                        Precio / cara
                      </th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                        Estado
                      </th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier) => (
                      <TierRow
                        key={tier.id}
                        tier={tier}
                        onSave={handleSaveTier}
                        onDelete={handleDeleteTier}
                      />
                    ))}
                    {addingTier && (
                      <NewTierRow
                        onAdd={handleAddTier}
                        onCancel={() => setAddingTier(false)}
                      />
                    )}
                    {tiers.length === 0 && !addingTier && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          No hay rangos configurados. Crea uno para empezar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Los rangos se evalúan por número de paquetes. Cada paquete contiene{" "}
              <strong>{selectedProduct.pieces_per_pack}</strong> piezas.
            </span>
          </div>
        </>
      )}

      {!selectedProduct && (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona un producto para gestionar sus precios.</p>
        </div>
      )}
    </div>
  );
}
