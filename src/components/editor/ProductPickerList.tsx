import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Package, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface ProductPickerListProps {
  onSelect: (productId: string) => void;
  selectedProductId?: string | null;
  loadTrigger?: boolean;
  autoFocus?: boolean;
  requireSearch?: boolean;
  className?: string;
}

export function ProductPickerList({
  onSelect,
  selectedProductId,
  loadTrigger = true,
  autoFocus = false,
  requireSearch = false,
  className,
}: ProductPickerListProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setAllProducts(data ?? []);
    } catch (err) {
      console.error("Error loading products:", err);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadTrigger && allProducts.length === 0 && !loading) {
      loadProducts();
    }
  }, [loadTrigger, allProducts.length, loading, loadProducts]);

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showList = !requireSearch || searchQuery.trim().length > 0;

  return (
    <div className={className}>
      <div className="p-2 border-b border-border">
        <Input
          placeholder="Buscar producto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
          autoFocus={autoFocus}
        />
      </div>
      {showList && (
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay productos</p>
          ) : (
            <div className="space-y-1">
              {filteredProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      isSelected ? "bg-accent/10 border border-accent/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg border border-border overflow-hidden shrink-0"
                      style={{ backgroundColor: "#e5e7eb" }}
                    >
                      {p.preview_image_url ? (
                        <img src={p.preview_image_url} className="w-full h-full object-cover" alt={p.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      <p className="text-xs text-muted-foreground">{p.width_cm}×{p.height_cm} cm</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
