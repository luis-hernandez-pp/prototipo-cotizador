import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Search,
} from "lucide-react";

type ProductType = Tables<"product_types">;
type ProductSubtype = Tables<"product_subtypes">;
type Product = Tables<"products">;

const STEPS = [
  "Tipo de empaque",
  "Material y acabado",
  "Medida / SKU",
];

const TYPE_SORT_ORDER: Record<string, number> = {
  "bolsas-envios": 1,
  "sobres-burbuja": 2,
  "cajas-carton-regular": 3,
  "cajas-carton-autoarmables": 4,
  "cajas-pizza": 5,
};

const withTimeout = <T,>(promise: Promise<T> | PromiseLike<T>, ms = 10000): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);

export default function Customize() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data
  const [types, setTypes] = useState<ProductType[]>([]);
  const [subtypes, setSubtypes] = useState<ProductSubtype[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<(Product & { subtype?: ProductSubtype; productType?: ProductType })[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<ProductSubtype | null>(null);

  const [customerId, setCustomerId] = useState<string | undefined>(undefined);

  // Load customer id for the logged-in user
  useEffect(() => {
    if (!user) return;
    supabase
      .from("customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCustomerId(data.id);
      });
  }, [user]);

  // Retry helper — re-runs the current step's query
  const retryQuery = async () => {
    setLoadError(null);
    setLoadingData(true);
    try {
      if (step === 0) {
        const { data, error } = await withTimeout(supabase.from("product_types").select("*").eq("is_active", true).order("name"));
        if (error) setLoadError(`No se pudieron cargar los tipos: ${error.message}`);
        else setTypes(data ?? []);
      } else if (step === 1 && selectedType) {
        const { data, error } = await withTimeout(supabase.from("product_subtypes").select("*").eq("product_type_id", selectedType.id).eq("is_active", true).order("sort_order"));
        if (error) setLoadError(`No se pudieron cargar los materiales: ${error.message}`);
        else setSubtypes(data ?? []);
      } else if (step === 2 && selectedSubtype) {
        const { data, error } = await withTimeout(supabase.from("products").select("*").eq("subtype_id", selectedSubtype.id).eq("is_active", true).order("name"));
        if (error) setLoadError(`No se pudieron cargar las medidas: ${error.message}`);
        else setProducts(data ?? []);
      }
    } catch (err: unknown) {
      console.error("Query error:", err);
      if (err instanceof Error && err.message === "TIMEOUT") {
        setLoadError("La conexión tardó demasiado. Intenta de nuevo.");
      } else {
        setLoadError("Error de conexión. Verifica tu internet e intenta de nuevo.");
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Load types on mount
  useEffect(() => {
    setLoadingData(true);
    setLoadError(null);
    (async () => {
      try {
        const { data, error } = await withTimeout(supabase.from("product_types").select("*").eq("is_active", true).order("name"));
        if (error) {
          console.error("Error fetching product_types:", error.message);
          setLoadError(`No se pudieron cargar los tipos de empaque: ${error.message}`);
        } else {
          setTypes(data ?? []);
        }
      } catch (err: unknown) {
        console.error("Query error:", err);
        if (err instanceof Error && err.message === "TIMEOUT") {
          setLoadError("La conexión tardó demasiado. Intenta de nuevo.");
        } else {
          setLoadError("Error de conexión. Verifica tu internet e intenta de nuevo.");
        }
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // Load subtypes when type is selected
  useEffect(() => {
    if (!selectedType) return;
    setLoadingData(true);
    setLoadError(null);
    (async () => {
      try {
        const { data, error } = await withTimeout(supabase.from("product_subtypes").select("*").eq("product_type_id", selectedType.id).eq("is_active", true).order("sort_order"));
        if (error) {
          console.error("Error fetching product_subtypes:", error.message);
          setLoadError(`No se pudieron cargar los materiales: ${error.message}`);
        } else {
          setSubtypes(data ?? []);
        }
      } catch (err: unknown) {
        console.error("Query error:", err);
        if (err instanceof Error && err.message === "TIMEOUT") {
          setLoadError("La conexión tardó demasiado. Intenta de nuevo.");
        } else {
          setLoadError("Error de conexión. Verifica tu internet e intenta de nuevo.");
        }
      } finally {
        setLoadingData(false);
      }
    })();
  }, [selectedType]);

  // Load products when subtype is selected
  useEffect(() => {
    if (!selectedSubtype) return;
    setLoadingData(true);
    setLoadError(null);
    (async () => {
      try {
        const { data, error } = await withTimeout(supabase.from("products").select("*").eq("subtype_id", selectedSubtype.id).eq("is_active", true).order("name"));
        if (error) {
          console.error("Error fetching products:", error.message);
          setLoadError(`No se pudieron cargar las medidas: ${error.message}`);
        } else {
          setProducts(data ?? []);
        }
      } catch (err: unknown) {
        console.error("Query error:", err);
        if (err instanceof Error && err.message === "TIMEOUT") {
          setLoadError("La conexión tardó demasiado. Intenta de nuevo.");
        } else {
          setLoadError("Error de conexión. Verifica tu internet e intenta de nuevo.");
        }
      } finally {
        setLoadingData(false);
      }
    })();
  }, [selectedSubtype]);

  // Global search: debounced product search across all products
  useEffect(() => {
    if (searchQuery.length < 2) {
      setGlobalResults([]);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = searchQuery.trim();
        const { data: prods, error } = await withTimeout(
          supabase
            .from("products")
            .select("*, product_subtypes!inner(*, product_types!inner(*))")
            .eq("is_active", true)
            .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
            .order("sku")
            .limit(20)
        );
        if (error) throw error;
        if (prods && prods.length > 0) {
          const results = prods.map((p: { product_subtypes?: { product_types?: ProductType } & ProductSubtype }) => ({
            ...p,
            subtype: p.product_subtypes,
            productType: p.product_subtypes?.product_types,
          }));
          setGlobalResults(results as (Product & { subtype?: ProductSubtype; productType?: ProductType })[]);
        } else {
          setGlobalResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setGlobalResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const goToType = (type: ProductType) => {
    setLoadError(null);
    setSearchQuery("");
    setSelectedType(type);
    setSelectedSubtype(null);
    setSubtypes([]);
    setProducts([]);
    setStep(1);
  };

  const goToSubtype = (sub: ProductSubtype) => {
    setLoadError(null);
    setSearchQuery("");
    setSelectedSubtype(sub);
    setProducts([]);
    setStep(2);
  };

  const goToProduct = (prod: Product) => {
    setLoadError(null);
    const printable = selectedType?.printable_faces ?? [];
    const restricted = prod.restricted_faces ?? [];
    const available = printable.filter((f) => !restricted.includes(f));
    const faces = available.length > 0 ? [available[0]] : [1];

    navigate("/customize/editor", {
      state: {
        productId: prod.id,
        product: prod,
        subtype: selectedSubtype,
        type: selectedType,
        selectedFaces: faces,
        quantityPacks: prod.min_packs,
      }
    });
  };

  const goToSearchResult = (prod: Product & { subtype?: ProductSubtype; productType?: ProductType }) => {
    const sub = prod.subtype;
    const typ = prod.productType;
    if (!sub || !typ) return;

    const printable = typ.printable_faces ?? [];
    const restricted = prod.restricted_faces ?? [];
    const available = printable.filter((f: number) => !restricted.includes(f));
    const faces = available.length > 0 ? [available[0]] : [1];

    navigate("/customize/editor", {
      state: {
        productId: prod.id,
        product: prod,
        subtype: sub,
        type: typ,
        selectedFaces: faces,
        quantityPacks: prod.min_packs,
      }
    });
  };

  const goBack = () => {
    setLoadError(null);
    setSearchQuery("");
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Stepper */}
      <div className="border-b border-border bg-card shrink-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center">
                <button
                  onClick={() => {
                    if (i < step) {
                      setSearchQuery("");
                      setStep(i);
                    }
                  }}
                  disabled={i > step}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    i === step
                      ? "text-foreground"
                      : i < step
                      ? "text-accent cursor-pointer hover:text-accent/80"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < step
                        ? "bg-accent text-accent-foreground scale-90"
                        : i === step
                        ? "gradient-hero text-primary-foreground shadow-accent-glow"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:block">{s}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-6 sm:w-14 mx-2 transition-colors duration-300 ${
                      i < step ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container mx-auto px-6 py-10 max-w-5xl">
        {/* Global search bar (steps 0, 1, 2) */}
        {step < STEPS.length && (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto por nombre o SKU..."
                className="pl-9"
              />
            </div>

            {/* Search results or step content */}
            {searchQuery.length >= 2 ? (
              <div className="animate-fade-in">
                {searchLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : globalResults.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No se encontraron productos para &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-3xl">
                    <p className="text-sm text-muted-foreground mb-3">{globalResults.length} resultado{globalResults.length !== 1 ? "s" : ""}</p>
                    {globalResults.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => goToSearchResult(prod)}
                        className="group w-full bg-card border-2 border-border hover:border-accent rounded-xl p-4 text-left transition-all duration-200 hover:shadow-brand flex items-center gap-4"
                      >
                        {prod.preview_image_url ? (
                          <img src={prod.preview_image_url} className="w-14 h-14 rounded-xl object-contain bg-white p-1 border border-border shrink-0" alt={prod.name} />
                        ) : (
                          <div className="w-14 h-14 rounded-xl border border-border shrink-0 flex items-center justify-center bg-muted">
                            <Package className="w-6 h-6 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground">{prod.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{prod.sku}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{prod.productType?.name}</span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{prod.subtype?.name}</span>
                            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{prod.width_cm}×{prod.height_cm} cm</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ── Step 0: Tipo de producto ── */}
                {step === 0 && (
                  <div className="animate-fade-in">
                    <h1 className="text-2xl font-bold text-foreground mb-1">
                      ¿Qué tipo de empaque necesitas?
                    </h1>
                    <p className="text-muted-foreground mb-6">
                      Selecciona la categoría de tu empaque para comenzar.
                    </p>

                    {loadError ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="text-center">
                          <p className="text-destructive font-medium">{loadError}</p>
                          <p className="text-sm text-muted-foreground mt-1">Si el problema persiste, recarga la página.</p>
                        </div>
                        <Button variant="outline" onClick={retryQuery}>Reintentar</Button>
                      </div>
                    ) : loadingData ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {types
                            .sort((a, b) => (TYPE_SORT_ORDER[a.slug] ?? 99) - (TYPE_SORT_ORDER[b.slug] ?? 99))
                    .map((type) => (
                      <button
                        key={type.id}
                        onClick={() => goToType(type)}
                        className="group bg-card border-2 border-border hover:border-accent rounded-2xl overflow-hidden text-left transition-all duration-200 hover:shadow-brand hover:-translate-y-1"
                      >
                        <div className="h-40 w-full overflow-hidden rounded-t-2xl bg-muted">
                          {type.image_url ? (
                            <img
                              src={type.image_url}
                              alt={type.name}
                              className="w-full h-full object-contain bg-white p-2"
                            />
                          ) : (
                            <div className="w-full h-full gradient-hero flex items-center justify-center">
                              <Package className="w-12 h-12 text-accent" />
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-foreground text-lg mb-1">{type.name}</h3>
                          {type.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{type.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {type.base_material}
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {type.total_faces} caras
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 1: Subtipo ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-foreground">
                Material y acabado
              </h1>
            </div>
            <p className="text-muted-foreground mb-6 ml-10">
              Para:{" "}
              <span className="font-semibold text-foreground">
                {selectedType?.name}
              </span>
            </p>

            {loadError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="text-center">
                  <p className="text-destructive font-medium">{loadError}</p>
                  <p className="text-sm text-muted-foreground mt-1">Si el problema persiste, recarga la página.</p>
                </div>
                <Button variant="outline" onClick={retryQuery}>Reintentar</Button>
              </div>
            ) : loadingData ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : subtypes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">
                  No hay subtipos disponibles para este tipo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={goBack}
                >
                  Volver
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {subtypes.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => goToSubtype(sub)}
                        className="group bg-card border-2 border-border hover:border-accent rounded-2xl overflow-hidden text-left transition-all duration-200 hover:shadow-brand hover:-translate-y-1"
                      >
                        <div className="h-32 w-full overflow-hidden rounded-t-2xl bg-muted">
                          {sub.image_url ? (
                            <img
                              src={sub.image_url}
                              alt={sub.name}
                              className="w-full h-full object-contain bg-white p-2"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20" style={{ backgroundColor: sub.color_hex ?? "#e5e7eb" }}>
                              <Package className="w-12 h-12 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-foreground mb-2">{sub.name}</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {sub.material && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                {sub.material}
                              </span>
                            )}
                            {sub.finish && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                {sub.finish}
                              </span>
                            )}
                            {sub.color && (
                              <span className="text-xs flex items-center gap-1 bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                {sub.color_hex && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block border border-white/30"
                                    style={{ backgroundColor: sub.color_hex }}
                                  />
                                )}
                                {sub.color}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: SKU / Medida ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-foreground">
                Selecciona la medida
              </h1>
            </div>
            <p className="text-muted-foreground mb-6 ml-10">
              {selectedType?.name} ·{" "}
              <span className="font-semibold text-foreground">
                {selectedSubtype?.name}
              </span>
            </p>

            {loadError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="text-center">
                  <p className="text-destructive font-medium">{loadError}</p>
                  <p className="text-sm text-muted-foreground mt-1">Si el problema persiste, recarga la página.</p>
                </div>
                <Button variant="outline" onClick={retryQuery}>Reintentar</Button>
              </div>
            ) : loadingData ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">
                  No hay medidas disponibles para este subtipo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={goBack}
                >
                  Volver
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-w-3xl">
                  {products
                    .sort((a, b) => a.sku.localeCompare(b.sku))
                    .map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => goToProduct(prod)}
                        className="group w-full bg-card border-2 border-border hover:border-accent rounded-xl p-4 text-left transition-all duration-200 hover:shadow-brand flex items-center gap-4"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: selectedSubtype?.color_hex ?? "#e5e7eb" }}>
                          {prod.preview_image_url ? (
                            <img src={prod.preview_image_url} className="w-full h-full object-contain bg-white p-1 rounded-xl" alt={prod.name} />
                          ) : prod.mockup_image_url ? (
                            <img src={prod.mockup_image_url} className="w-full h-full object-contain bg-white p-1 rounded-xl" alt={prod.name} />
                          ) : (
                            <Package className="w-5 h-5 text-white/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground">{prod.size_label ?? prod.name}</p>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">{prod.sku}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {prod.width_cm}×{prod.height_cm}
                              {prod.depth_cm ? `×${prod.depth_cm}` : ""} cm
                            </span>
                            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                              Impresión: {prod.print_width_cm}×{prod.print_height_cm} cm
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {prod.pieces_per_pack} u/paquete · mín {prod.min_packs}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
