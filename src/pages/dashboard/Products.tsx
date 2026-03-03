import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Package,
  Loader2,
  FileText,
  Image,
  Search,
} from "lucide-react";

type ProductType = Tables<"product_types">;
type ProductSubtype = Tables<"product_subtypes">;
type Product = Tables<"products">;

// ── Helpers ──────────────────────────────────────────────────────────────────
const toSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function uploadToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("product-images").getPublicUrl(path).data
    .publicUrl;
}

// ── Face Selector ─────────────────────────────────────────────────────────────
function FaceSelector({
  selected,
  total = 4,
  onChange,
  activeColor = "accent",
}: {
  selected: number[];
  total?: number;
  onChange: (faces: number[]) => void;
  activeColor?: "accent" | "destructive";
}) {
  const toggle = (f: number) => {
    onChange(
      selected.includes(f)
        ? selected.filter((x) => x !== f)
        : [...selected, f].sort((a, b) => a - b)
    );
  };
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((f) => {
        const active = selected.includes(f);
        return (
          <button
            key={f}
            type="button"
            onClick={() => toggle(f)}
            className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition-colors ${
              active && activeColor === "accent"
                ? "border-accent bg-accent text-accent-foreground"
                : active && activeColor === "destructive"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground hover:border-accent/50"
            }`}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}

// ── Image Upload Widget ───────────────────────────────────────────────────────
function ImageUploadWidget({
  preview,
  onFile,
  onClear,
}: {
  preview: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      {preview && (
        <div className="relative">
          <img
            src={preview}
            className="w-16 h-16 object-cover rounded-lg border border-border"
            alt="preview"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
          >
            ×
          </button>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => ref.current?.click()}
      >
        <Upload className="w-4 h-4 mr-1.5" />
        {preview ? "Cambiar" : "Subir imagen"}
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

// ── ProductType Dialog ────────────────────────────────────────────────────────
const defaultType = (): Partial<ProductType> => ({
  name: "",
  slug: "",
  description: "",
  base_material: "",
  total_faces: 4,
  printable_faces: [1, 2],
  safety_margin_cm: 1,
  is_active: true,
});

function ProductTypeDialog({
  open,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  item?: ProductType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<ProductType>>(defaultType());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(item ? { ...item } : defaultType());
    setImagePreview(item?.image_url ?? null);
    setImageFile(null);
    setError(null);
  }, [item, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const set = (k: keyof ProductType, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const trimmedName = form.name?.trim() ?? "";
    const trimmedMaterial = form.base_material?.trim() ?? "";
    const trimmedSlug = form.slug?.trim() || toSlug(trimmedName);
    if (!trimmedName) { setError("El nombre es requerido."); return; }
    if (!trimmedMaterial) { setError("El material base es requerido."); return; }
    if (trimmedName.length > 200) { setError("El nombre no puede exceder 200 caracteres."); return; }
    if (!trimmedSlug) { setError("El slug no puede estar vacío."); return; }
    const totalFacesVal = form.total_faces ?? 4;
    if (totalFacesVal < 1 || totalFacesVal > 6) { setError("Total de caras debe ser entre 1 y 6."); return; }
    const marginVal = form.safety_margin_cm ?? 1;
    if (marginVal < 0) { setError("El margen de seguridad no puede ser negativo."); return; }
    setSaving(true);
    let imageUrl = form.image_url ?? null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `product-type-images/${form.slug || "type"}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-mockups")
        .upload(path, imageFile, { upsert: true });
      if (uploadErr) {
        setError("Error al subir imagen: " + uploadErr.message);
        setSaving(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage
        .from("product-mockups")
        .getPublicUrl(path);
      imageUrl = publicUrl;
    }
    const payload = {
      name: trimmedName,
      slug: trimmedSlug,
      description: form.description?.trim() || null,
      base_material: form.base_material!,
      total_faces: form.total_faces ?? 4,
      printable_faces: form.printable_faces ?? [1, 2],
      safety_margin_cm: form.safety_margin_cm ?? 1,
      is_active: form.is_active ?? true,
      image_url: imageUrl,
    };
    const { error: err } = item?.id
      ? await supabase.from("product_types").update(payload).eq("id", item.id)
      : await supabase.from("product_types").insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar tipo de producto" : "Nuevo tipo de producto"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!item) set("slug", toSlug(e.target.value));
                }}
                placeholder="Caja de Cartón Regular"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug ?? ""}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="caja-carton-regular"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Material base *</Label>
              <Input
                value={form.base_material ?? ""}
                onChange={(e) => set("base_material", e.target.value)}
                placeholder="Cartón corrugado"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Imagen del tipo</Label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); setForm((f) => ({ ...f, image_url: null })); }}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent/50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {imagePreview ? "Cambiar imagen" : "Subir imagen"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG o WebP</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                placeholder="Descripción del tipo de producto…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total de caras</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={form.total_faces ?? 4}
                onChange={(e) => set("total_faces", +e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Margen de seguridad (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.safety_margin_cm ?? 1}
                onChange={(e) => set("safety_margin_cm", +e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Caras imprimibles</Label>
            <FaceSelector
              selected={form.printable_faces ?? []}
              total={form.total_faces ?? 4}
              onChange={(faces) => set("printable_faces", faces)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) => set("is_active", v)}
              id="type-active"
            />
            <Label htmlFor="type-active">Tipo activo</Label>
          </div>
          {error && (
            <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {item ? "Guardar cambios" : "Crear tipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ProductSubtype Dialog ─────────────────────────────────────────────────────
const defaultSubtype = (): Partial<ProductSubtype> => ({
  name: "",
  slug: "",
  color: "",
  color_hex: "#ed8936",
  material: "",
  finish: "",
  is_active: true,
  product_type_id: "",
});

function ProductSubtypeDialog({
  open,
  item,
  types,
  onClose,
  onSaved,
}: {
  open: boolean;
  item?: ProductSubtype | null;
  types: ProductType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<ProductSubtype>>(defaultSubtype());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(item ? { ...item } : defaultSubtype());
    setImageFile(null);
    setImagePreview(item?.image_url ?? null);
    setError(null);
  }, [item, open]);

  const set = (k: keyof ProductSubtype, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const trimmedName = form.name?.trim() ?? "";
    const trimmedSlug = form.slug?.trim() || toSlug(trimmedName);
    if (!form.product_type_id) { setError("El tipo padre es requerido."); return; }
    if (!trimmedName) { setError("El nombre es requerido."); return; }
    if (trimmedName.length > 200) { setError("El nombre no puede exceder 200 caracteres."); return; }
    if (!trimmedSlug) { setError("El slug no puede estar vacío."); return; }
    setSaving(true);
    let image_url = form.image_url ?? null;
    if (imageFile) {
      try {
        image_url = await uploadToStorage(imageFile, "subtypes");
      } catch (e) {
        setError("Error al subir imagen: " + (e as Error).message);
        setSaving(false);
        return;
      }
    }
    const payload = {
      product_type_id: form.product_type_id!,
      name: trimmedName,
      slug: trimmedSlug,
      color: form.color?.trim() || null,
      color_hex: form.color_hex?.trim() || null,
      material: form.material?.trim() || null,
      finish: form.finish?.trim() || null,
      image_url,
      is_active: form.is_active ?? true,
    };
    const { error: err } = item?.id
      ? await supabase
          .from("product_subtypes")
          .update(payload)
          .eq("id", item.id)
      : await supabase.from("product_subtypes").insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Editar subtipo" : "Nuevo subtipo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Tipo padre *</Label>
              <Select
                value={form.product_type_id ?? ""}
                onValueChange={(v) => set("product_type_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!item) set("slug", toSlug(e.target.value));
                }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug ?? ""}
                onChange={(e) => set("slug", e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre del color</Label>
              <Input
                value={form.color ?? ""}
                onChange={(e) => set("color", e.target.value)}
                placeholder="Kraft Natural"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color hex</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.color_hex ?? "#ed8936"}
                  onChange={(e) => set("color_hex", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border p-0.5"
                />
                <Input
                  value={form.color_hex ?? ""}
                  onChange={(e) => set("color_hex", e.target.value)}
                  placeholder="#ed8936"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Material</Label>
              <Input
                value={form.material ?? ""}
                onChange={(e) => set("material", e.target.value)}
                placeholder="Cartón kraft"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Acabado</Label>
              <Input
                value={form.finish ?? ""}
                onChange={(e) => set("finish", e.target.value)}
                placeholder="Mate, Brillante…"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Imagen de muestra</Label>
              <ImageUploadWidget
                preview={imagePreview}
                onFile={(f) => {
                  setImageFile(f);
                  setImagePreview(URL.createObjectURL(f));
                }}
                onClear={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  set("image_url", null);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(v) => set("is_active", v)}
                id="sub-active"
              />
              <Label htmlFor="sub-active">Activo</Label>
            </div>
          </div>
          {error && (
            <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {item ? "Guardar" : "Crear subtipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ProductSku Dialog ─────────────────────────────────────────────────────────
const defaultProduct = (): Partial<Product> => ({
  sku: "",
  name: "",
  size_label: "",
  width_cm: 0,
  height_cm: 0,
  depth_cm: null,
  print_width_cm: 0,
  print_height_cm: 0,
  restricted_faces: [],
  pieces_per_pack: 100,
  min_packs: 1,
  is_active: true,
  subtype_id: "",
});

function ProductSkuDialog({
  open,
  item,
  subtypes,
  types,
  onClose,
  onSaved,
}: {
  open: boolean;
  item?: Product | null;
  subtypes: ProductSubtype[];
  types: ProductType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(defaultProduct());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTypeId, setFilterTypeId] = useState("");

  useEffect(() => {
    setForm(item ? { ...item } : defaultProduct());
    setImageFile(null);
    setImagePreview(item?.preview_image_url ?? null);
    setError(null);
    if (item) {
      const sub = subtypes.find((s) => s.id === item.subtype_id);
      setFilterTypeId(sub?.product_type_id ?? "");
    } else {
      setFilterTypeId("");
    }
  }, [item, open]);

  const set = (k: keyof Product, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const filteredSubtypes = filterTypeId
    ? subtypes.filter((s) => s.product_type_id === filterTypeId)
    : subtypes;

  const selectedSubtype = subtypes.find((s) => s.id === form.subtype_id);
  const parentType = selectedSubtype
    ? types.find((t) => t.id === selectedSubtype.product_type_id)
    : null;
  const totalFaces = parentType?.total_faces ?? 4;

  const handleSave = async () => {
    const trimmedSku = form.sku?.trim() ?? "";
    const trimmedName = form.name?.trim() ?? "";
    if (!trimmedSku) { setError("El SKU es requerido."); return; }
    if (trimmedSku.length > 100) { setError("El SKU no puede exceder 100 caracteres."); return; }
    if (!trimmedName) { setError("El nombre es requerido."); return; }
    if (trimmedName.length > 200) { setError("El nombre no puede exceder 200 caracteres."); return; }
    if (!form.subtype_id) { setError("El subtipo es requerido."); return; }
    const wVal = form.width_cm ?? 0;
    const hVal = form.height_cm ?? 0;
    const pwVal = form.print_width_cm ?? 0;
    const phVal = form.print_height_cm ?? 0;
    if (wVal <= 0) { setError("El ancho debe ser mayor a 0."); return; }
    if (hVal <= 0) { setError("El alto debe ser mayor a 0."); return; }
    if (pwVal <= 0) { setError("El ancho imprimible debe ser mayor a 0."); return; }
    if (phVal <= 0) { setError("El alto imprimible debe ser mayor a 0."); return; }
    if ((form.pieces_per_pack ?? 0) < 1) { setError("Las piezas por paquete deben ser al menos 1."); return; }
    if ((form.min_packs ?? 0) < 1) { setError("El mínimo de paquetes debe ser al menos 1."); return; }
    setSaving(true);
    let preview_image_url = form.preview_image_url ?? null;
    if (imageFile) {
      try {
        preview_image_url = await uploadToStorage(imageFile, "products");
      } catch (e) {
        setError("Error al subir imagen: " + (e as Error).message);
        setSaving(false);
        return;
      }
    }
    const payload = {
      subtype_id: form.subtype_id!,
      sku: trimmedSku,
      name: trimmedName,
      size_label: form.size_label?.trim() || null,
      width_cm: form.width_cm ?? 0,
      height_cm: form.height_cm ?? 0,
      depth_cm: form.depth_cm ?? null,
      print_width_cm: form.print_width_cm ?? 0,
      print_height_cm: form.print_height_cm ?? 0,
      restricted_faces: form.restricted_faces ?? [],
      pieces_per_pack: form.pieces_per_pack ?? 100,
      min_packs: form.min_packs ?? 1,
      preview_image_url,
      is_active: form.is_active ?? true,
    };
    const { error: err } = item?.id
      ? await supabase.from("products").update(payload).eq("id", item.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar SKU" : "Nuevo SKU / Producto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Subtype selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Filtrar por tipo</Label>
              <Select
                value={filterTypeId}
              onValueChange={(v) => {
                  setFilterTypeId(v === "all" ? "" : v);
                  set("subtype_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subtipo *</Label>
              <Select
                value={form.subtype_id ?? ""}
                onValueChange={(v) => set("subtype_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar subtipo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubtypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SKU *</Label>
              <Input
                value={form.sku ?? ""}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="BOX-REG-20x30x15"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Caja Regular 20×30×15 cm"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Etiqueta de medida</Label>
              <Input
                value={form.size_label ?? ""}
                onChange={(e) => set("size_label", e.target.value)}
                placeholder="20×30×15 cm"
              />
            </div>
          </div>

          {/* Physical dimensions */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">
              Dimensiones físicas
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Ancho (cm) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.width_cm ?? ""}
                  onChange={(e) => set("width_cm", +e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Alto (cm) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.height_cm ?? ""}
                  onChange={(e) => set("height_cm", +e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Profundidad (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.depth_cm ?? ""}
                  placeholder="Solo cajas"
                  onChange={(e) =>
                    set(
                      "depth_cm",
                      e.target.value === "" ? null : +e.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Print area */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">
              Área de impresión
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ancho imprimible (cm) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.print_width_cm ?? ""}
                  onChange={(e) => set("print_width_cm", +e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Alto imprimible (cm) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.print_height_cm ?? ""}
                  onChange={(e) => set("print_height_cm", +e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Packing */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">
              Empaque
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Piezas por paquete *</Label>
                <Input
                  type="number"
                  value={form.pieces_per_pack ?? 100}
                  onChange={(e) => set("pieces_per_pack", +e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mínimo de paquetes</Label>
                <Input
                  type="number"
                  value={form.min_packs ?? 1}
                  onChange={(e) => set("min_packs", +e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Restricted faces */}
          <div className="space-y-2">
            <Label>Caras restringidas (no imprimibles en este SKU)</Label>
            <FaceSelector
              selected={form.restricted_faces ?? []}
              total={totalFaces}
              onChange={(faces) => set("restricted_faces", faces)}
              activeColor="destructive"
            />
            <p className="text-xs text-muted-foreground">
              Caras en rojo quedan bloqueadas para impresión en este SKU.
            </p>
          </div>

          {/* Preview image */}
          <div className="space-y-1.5">
            <Label>Imagen de vista previa</Label>
            <ImageUploadWidget
              preview={imagePreview}
              onFile={(f) => {
                setImageFile(f);
                setImagePreview(URL.createObjectURL(f));
              }}
              onClear={() => {
                setImageFile(null);
                setImagePreview(null);
                set("preview_image_url", null);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) => set("is_active", v)}
              id="sku-active"
            />
            <Label htmlFor="sku-active">SKU activo</Label>
          </div>

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {item ? "Guardar cambios" : "Crear SKU"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── CSV Import Tab ────────────────────────────────────────────────────────────
function CsvImportTab({
  subtypes,
  types,
  onImported,
}: {
  subtypes: ProductSubtype[];
  types: ProductType[];
  onImported: () => void;
}) {
  const [subtypeId, setSubtypeId] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    msg: string;
    ok: boolean;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredSubtypes = filterTypeId
    ? subtypes.filter((s) => s.product_type_id === filterTypeId)
    : subtypes;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const lines = text
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim());
      const parsed = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim());
        return headers.reduce(
          (o, h, i) => ({ ...o, [h]: vals[i] ?? "" }),
          {} as Record<string, string>
        );
      });
      setRows(parsed);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!subtypeId || rows.length === 0) return;
    // Validate CSV rows before inserting
    const invalidRows: number[] = [];
    rows.forEach((r, i) => {
      const sku = r.sku?.trim() ?? "";
      const name = r.name?.trim() ?? "";
      const w = parseFloat(r.width_cm);
      const h = parseFloat(r.height_cm);
      const pw = parseFloat(r.print_width_cm);
      const ph = parseFloat(r.print_height_cm);
      if (!sku || !name || isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(pw) || pw <= 0 || isNaN(ph) || ph <= 0) {
        invalidRows.push(i + 2); // +2 for header row + 1-based
      }
    });
    if (invalidRows.length > 0) {
      setResult({ msg: `❌ Filas con datos inválidos (SKU/nombre vacíos o dimensiones ≤ 0): líneas ${invalidRows.join(", ")}`, ok: false });
      return;
    }
    setImporting(true);
    const payload = rows.map((r) => ({
      subtype_id: subtypeId,
      sku: r.sku.trim(),
      name: r.name.trim(),
      size_label: r.size_label || null,
      width_cm: parseFloat(r.width_cm) || 0,
      height_cm: parseFloat(r.height_cm) || 0,
      depth_cm: r.depth_cm ? parseFloat(r.depth_cm) : null,
      print_width_cm: parseFloat(r.print_width_cm) || 0,
      print_height_cm: parseFloat(r.print_height_cm) || 0,
      pieces_per_pack: parseInt(r.pieces_per_pack) || 100,
      restricted_faces: [] as number[],
      min_packs: 1,
      is_active: true,
    }));
    const { error } = await supabase.from("products").insert(payload);
    setImporting(false);
    if (error) {
      setResult({ msg: "Error: " + error.message, ok: false });
      return;
    }
    setResult({ msg: `✅ ${rows.length} SKUs importados correctamente.`, ok: true });
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
    onImported();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Format guide */}
      <div className="bg-muted/40 border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          Formato del archivo CSV
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          La primera línea debe ser exactamente estos encabezados:
        </p>
        <code className="block bg-card border border-border rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto">
          sku,name,size_label,width_cm,height_cm,depth_cm,print_width_cm,print_height_cm,pieces_per_pack
        </code>
      </div>

      {/* Subtype selector */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Filtrar por tipo</Label>
          <Select
            value={filterTypeId}
            onValueChange={(v) => {
              setFilterTypeId(v === "all" ? "" : v);
              setSubtypeId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Subtipo destino *</Label>
          <Select value={subtypeId} onValueChange={setSubtypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar subtipo" />
            </SelectTrigger>
            <SelectContent>
              {filteredSubtypes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* File picker */}
      <div>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          Seleccionar archivo CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            <span className="font-semibold text-foreground">{rows.length}</span>{" "}
            filas cargadas. Vista previa (primeras 5):
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {Object.keys(rows[0]).map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 font-mono">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            className="mt-4"
            onClick={handleImport}
            disabled={!subtypeId || importing}
          >
            {importing && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Importar {rows.length} SKUs
          </Button>
        </div>
      )}

      {result && (
        <p
          className={`text-sm p-3 rounded-lg ${
            result.ok
              ? "bg-green-500/10 text-green-700"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {result.msg}
        </p>
      )}
    </div>
  );
}

// ── Main Products Page ────────────────────────────────────────────────────────
export default function Products() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [subtypes, setSubtypes] = useState<ProductSubtype[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [globalSearch, setGlobalSearch] = useState("");
  const [activeTab, setActiveTab] = useState("types");

  // SKUs filters
  const [filterType, setFilterType] = useState("");
  const [filterSubtype, setFilterSubtype] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");

  // Dialog state
  const [typeDialog, setTypeDialog] = useState<{
    open: boolean;
    item?: ProductType | null;
  }>({ open: false });
  const [subtypeDialog, setSubtypeDialog] = useState<{
    open: boolean;
    item?: ProductSubtype | null;
  }>({ open: false });
  const [productDialog, setProductDialog] = useState<{
    open: boolean;
    item?: Product | null;
  }>({ open: false });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const [t, s, p] = await Promise.all([
      supabase.from("product_types").select("*").order("name"),
      supabase.from("product_subtypes").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
    ]);
    if (t.error) {
      console.error("Error fetching product_types:", t.error.message);
      setFetchError(`Error al cargar tipos de producto: ${t.error.message}`);
      setLoading(false);
      return;
    }
    if (s.error) {
      console.error("Error fetching product_subtypes:", s.error.message);
      setFetchError(`Error al cargar subtipos: ${s.error.message}`);
      setLoading(false);
      return;
    }
    if (p.error) {
      console.error("Error fetching products:", p.error.message);
      setFetchError(`Error al cargar SKUs: ${p.error.message}`);
      setLoading(false);
      return;
    }
    setTypes(t.data ?? []);
    setSubtypes(s.data ?? []);
    setProducts(p.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const deleteType = async (id: string) => {
    if (!confirm("¿Eliminar este tipo? También se eliminarán sus subtipos y SKUs.")) return;
    await supabase.from("product_types").delete().eq("id", id);
    fetchAll();
  };
  const deleteSubtype = async (id: string) => {
    if (!confirm("¿Eliminar este subtipo?")) return;
    await supabase.from("product_subtypes").delete().eq("id", id);
    fetchAll();
  };
  const deleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este SKU?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchAll();
  };

  const filteredTypes = types.filter((t) => {
    if (!globalSearch) return true;
    const q = globalSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.base_material ?? "").toLowerCase().includes(q)
    );
  });

  const filteredSubtypesGlobal = subtypes.filter((s) => {
    if (!globalSearch) return true;
    const q = globalSearch.toLowerCase();
    const parentType = types.find((t) => t.id === s.product_type_id);
    return (
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      (s.material ?? "").toLowerCase().includes(q) ||
      (s.finish ?? "").toLowerCase().includes(q) ||
      (parentType?.name ?? "").toLowerCase().includes(q)
    );
  });

  const filteredProducts = products.filter((p) => {
    const searchTerm = globalSearch;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    if (filterSubtype && p.subtype_id !== filterSubtype) return false;
    if (filterType) {
      const sub = subtypes.find((s) => s.id === p.subtype_id);
      if (!sub || sub.product_type_id !== filterType) return false;
    }
    if (filterActive === "active" && !p.is_active) return false;
    if (filterActive === "inactive" && p.is_active) return false;
    return true;
  });

  // Auto-switch tab when searching: if current tab has 0 results, switch to tab with most results
  useEffect(() => {
    if (!globalSearch) return;

    const currentTabHasResults =
      (activeTab === "types" && filteredTypes.length > 0) ||
      (activeTab === "subtypes" && filteredSubtypesGlobal.length > 0) ||
      (activeTab === "skus" && filteredProducts.length > 0);

    if (currentTabHasResults) return;

    const counts = [
      { tab: "types", count: filteredTypes.length },
      { tab: "subtypes", count: filteredSubtypesGlobal.length },
      { tab: "skus", count: filteredProducts.length },
    ];
    const best = counts.sort((a, b) => b.count - a.count)[0];
    if (best.count > 0) setActiveTab(best.tab);
  }, [globalSearch, activeTab, filteredTypes.length, filteredSubtypesGlobal.length, filteredProducts.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-destructive text-sm bg-destructive/10 px-4 py-3 rounded-lg max-w-lg text-center">
          {fetchError}
        </p>
        <button
          onClick={() => fetchAll()}
          className="text-sm text-accent underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Catálogo de Productos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona tipos, subtipos y SKUs del catálogo de empaques.
        </p>
      </div>

      {/* Global search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Buscar en todo el catálogo (nombre, SKU, material...)"
          className="pl-9 max-w-lg"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="types">
            Tipos{" "}
            <Badge variant="secondary" className="ml-2 text-xs">
              {filteredTypes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="subtypes">
            Subtipos{" "}
            <Badge variant="secondary" className="ml-2 text-xs">
              {filteredSubtypesGlobal.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="skus">
            SKUs{" "}
            <Badge variant="secondary" className="ml-2 text-xs">
              {filteredProducts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="import">Importar CSV</TabsTrigger>
        </TabsList>

        {/* ── Tipos ─────────────────────────────────────────────── */}
        <TabsContent value="types">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">
              Tipos de Producto
            </h2>
            <Button
              size="sm"
              onClick={() => setTypeDialog({ open: true, item: null })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo tipo
            </Button>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Material</th>
                  <th className="text-center px-4 py-3 font-medium">Caras</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Imprimibles
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Margen</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-t border-border ${
                      i % 2 === 1 ? "bg-muted/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{t.name}</p>
                      <p className="text-muted-foreground text-xs font-mono">
                        {t.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {t.base_material}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {t.total_faces}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(t.printable_faces ?? []).map((f) => (
                          <span
                            key={f}
                            className="w-6 h-6 rounded bg-accent/20 text-accent text-xs font-bold flex items-center justify-center"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {t.safety_margin_cm} cm
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={t.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {t.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setTypeDialog({ open: true, item: t })
                          }
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteType(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTypes.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {globalSearch ? "No hay tipos que coincidan con la búsqueda." : "No hay tipos de producto. Crea el primero."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Subtipos ───────────────────────────────────────────── */}
        <TabsContent value="subtypes">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Subtipos</h2>
            <Button
              size="sm"
              onClick={() => setSubtypeDialog({ open: true, item: null })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo subtipo
            </Button>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Subtipo</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Tipo padre
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Color</th>
                  <th className="text-left px-4 py-3 font-medium">Material</th>
                  <th className="text-left px-4 py-3 font-medium">Acabado</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredSubtypesGlobal.map((s, i) => {
                  const parent = types.find(
                    (t) => t.id === s.product_type_id
                  );
                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-border ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.image_url ? (
                            <img
                              src={s.image_url}
                              className="w-9 h-9 rounded-lg object-cover border border-border shrink-0"
                              alt={s.name}
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg border border-border shrink-0"
                              style={{
                                backgroundColor: s.color_hex ?? "#e5e7eb",
                              }}
                            />
                          )}
                          <div>
                            <p className="font-medium text-foreground">
                              {s.name}
                            </p>
                            <p className="text-muted-foreground text-xs font-mono">
                              {s.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {parent?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {s.color_hex && (
                            <div
                              className="w-4 h-4 rounded-full border border-border shrink-0"
                              style={{ backgroundColor: s.color_hex }}
                            />
                          )}
                          <span className="text-muted-foreground text-xs">
                            {s.color ?? s.color_hex ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {s.material ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {s.finish ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={s.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {s.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setSubtypeDialog({ open: true, item: s })
                            }
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteSubtype(s.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSubtypesGlobal.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {globalSearch ? "No hay subtipos que coincidan con la búsqueda." : "No hay subtipos. Crea el primero."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── SKUs ───────────────────────────────────────────────── */}
        <TabsContent value="skus">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">SKUs / Productos</h2>
            <Button
              size="sm"
              onClick={() => setProductDialog({ open: true, item: null })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo SKU
            </Button>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Select
              value={filterType}
              onValueChange={(v) => {
                setFilterType(v === "all" ? "" : v);
                setFilterSubtype("");
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSubtype} onValueChange={(v) => setFilterSubtype(v === "all" ? "" : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todos los subtipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(filterType
                  ? subtypes.filter((s) => s.product_type_id === filterType)
                  : subtypes
                ).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterActive}
              onValueChange={(v) =>
                setFilterActive(v as typeof filterActive)
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <span className="flex items-center text-sm text-muted-foreground">
              {filteredProducts.length} resultado
              {filteredProducts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    SKU / Nombre
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Subtipo</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Dimensiones
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Impresión
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Paquete</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                   <th className="px-4 py-3 w-28" />
                 </tr>
               </thead>
               <tbody>
                 {filteredProducts.map((p, i) => {
                  const sub = subtypes.find((s) => s.id === p.subtype_id);
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-border ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.preview_image_url ? (
                            <img
                              src={p.preview_image_url}
                              className="w-9 h-9 rounded-lg object-cover border border-border shrink-0"
                              alt={p.name}
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg border border-border shrink-0 flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  sub?.color_hex ?? "hsl(var(--muted))",
                              }}
                            >
                              <Package className="w-4 h-4 text-white/50" />
                            </div>
                          )}
                          <div>
                            <p className="font-mono font-semibold text-foreground text-xs">
                              {p.sku}
                            </p>
                            <p className="text-muted-foreground text-xs truncate max-w-[140px]">
                              {p.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {sub?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {p.width_cm}×{p.height_cm}
                        {p.depth_cm ? `×${p.depth_cm}` : ""} cm
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {p.print_width_cm}×{p.print_height_cm} cm
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {p.pieces_per_pack} u · mín {p.min_packs}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={p.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {p.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                         <div className="flex gap-1 justify-end">
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7"
                             title="Editor de mockup"
                             onClick={() => navigate(`/dashboard/products/${p.id}/mockup`)}
                           >
                             <Image className="w-3.5 h-3.5" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7"
                             onClick={() =>
                               setProductDialog({ open: true, item: p })
                             }
                           >
                             <Edit2 className="w-3.5 h-3.5" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7 text-destructive hover:text-destructive"
                             onClick={() => deleteProduct(p.id)}
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No hay SKUs con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── CSV Import ─────────────────────────────────────────── */}
        <TabsContent value="import">
          <div className="mb-6">
            <h2 className="font-semibold text-foreground">
              Importar SKUs desde CSV
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Carga masiva de productos desde un archivo CSV.
            </p>
          </div>
          <CsvImportTab
            subtypes={subtypes}
            types={types}
            onImported={fetchAll}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ProductTypeDialog
        open={typeDialog.open}
        item={typeDialog.item}
        onClose={() => setTypeDialog({ open: false })}
        onSaved={fetchAll}
      />
      <ProductSubtypeDialog
        open={subtypeDialog.open}
        item={subtypeDialog.item}
        types={types}
        onClose={() => setSubtypeDialog({ open: false })}
        onSaved={fetchAll}
      />
      <ProductSkuDialog
        open={productDialog.open}
        item={productDialog.item}
        subtypes={subtypes}
        types={types}
        onClose={() => setProductDialog({ open: false })}
        onSaved={fetchAll}
      />
    </div>
  );
}
