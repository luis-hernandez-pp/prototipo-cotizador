
-- Add CHECK constraints for input validation (server-side)
-- product_types: name and slug must be non-empty
ALTER TABLE public.product_types
  ADD CONSTRAINT product_types_name_nonempty CHECK (trim(name) <> ''),
  ADD CONSTRAINT product_types_slug_nonempty CHECK (trim(slug) <> '');

-- product_subtypes: name and slug must be non-empty
ALTER TABLE public.product_subtypes
  ADD CONSTRAINT product_subtypes_name_nonempty CHECK (trim(name) <> ''),
  ADD CONSTRAINT product_subtypes_slug_nonempty CHECK (trim(slug) <> '');

-- products: sku and name must be non-empty, dimensions must be positive
ALTER TABLE public.products
  ADD CONSTRAINT products_sku_nonempty CHECK (trim(sku) <> ''),
  ADD CONSTRAINT products_name_nonempty CHECK (trim(name) <> ''),
  ADD CONSTRAINT products_width_positive CHECK (width_cm > 0),
  ADD CONSTRAINT products_height_positive CHECK (height_cm > 0),
  ADD CONSTRAINT products_print_width_positive CHECK (print_width_cm > 0),
  ADD CONSTRAINT products_print_height_positive CHECK (print_height_cm > 0);
