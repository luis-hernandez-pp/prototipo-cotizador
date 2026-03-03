import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, AlertCircle } from "lucide-react";

type ProductPricingTier = Tables<"product_pricing_tiers">;

export interface PriceDetails {
  totalPieces: number;
  pricePerFace: number;
  subtotal: number;
  iva: number;
  total: number;
  tierName: string;
}

interface Props {
  productId: string;
  piecesPerPack: number;
  facesToPrint: number;
  quantityPacks: number;
  onPriceCalculated?: (details: PriceDetails | null) => void;
}

const MXN = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);

export default function PriceCalculator({
  productId,
  piecesPerPack,
  facesToPrint,
  quantityPacks,
  onPriceCalculated,
}: Props) {
  const [tiers, setTiers] = useState<ProductPricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<PriceDetails | null>(null);

  // Load tiers for this product
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    supabase
      .from("product_pricing_tiers")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("min_packs")
      .then(({ data }) => {
        setTiers(data ?? []);
        setLoading(false);
      });
  }, [productId]);

  // Recalculate whenever inputs change
  useEffect(() => {
    if (loading || tiers.length === 0) return;
    if (quantityPacks <= 0 || facesToPrint <= 0 || piecesPerPack <= 0) {
      setDetails(null);
      onPriceCalculated?.(null);
      return;
    }

    const totalPieces = quantityPacks * piecesPerPack;

    const tier = tiers.find(
      (t) =>
        quantityPacks >= t.min_packs &&
        (t.max_packs === null || quantityPacks <= t.max_packs)
    );

    if (!tier) {
      setDetails(null);
      onPriceCalculated?.(null);
      return;
    }

    const pricePerFace = Number(tier.price_per_face);
    const subtotal = pricePerFace * facesToPrint * totalPieces;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    const result: PriceDetails = {
      totalPieces,
      pricePerFace,
      subtotal,
      iva,
      total,
      tierName: tier.name,
    };

    setDetails(result);
    onPriceCalculated?.(result);
  }, [loading, tiers, quantityPacks, piecesPerPack, facesToPrint, onPriceCalculated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-3 text-muted-foreground text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {tiers.length === 0
          ? "No hay precios configurados para este producto."
          : "Ingresa una cantidad válida para ver el precio."}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="gradient-hero px-4 py-3">
        <span className="text-primary-foreground font-semibold text-sm">
          Cotización estimada
        </span>
      </div>

      {/* Breakdown */}
      <div className="p-4 space-y-2.5 text-sm">
        <Row
          label="Cantidad"
          value={`${quantityPacks} paquete${quantityPacks !== 1 ? "s" : ""} (${details.totalPieces.toLocaleString("es-MX")} piezas)`}
        />
        <Row
          label="Caras a imprimir"
          value={`${facesToPrint} cara${facesToPrint !== 1 ? "s" : ""}`}
        />
        <Row
          label="Tarifa aplicada"
          value={details.tierName}
          muted
        />
        <Row
          label="Precio por cara"
          value={MXN(details.pricePerFace)}
          muted
        />

        <div className="border-t border-border my-2 pt-2 space-y-2">
          <Row label="Subtotal" value={MXN(details.subtotal)} />
          <Row label="IVA (16%)" value={MXN(details.iva)} muted />
        </div>

        {/* Total */}
        <div className="bg-accent/8 border border-accent/20 rounded-lg px-3 py-2.5 flex items-center justify-between">
          <span className="font-bold text-foreground">Total</span>
          <span className="text-xl font-bold text-accent">{MXN(details.total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-medium text-right ${
          accent
            ? "text-accent"
            : muted
            ? "text-muted-foreground"
            : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
