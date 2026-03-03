export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customer_assets: {
        Row: {
          created_at: string
          customer_id: string | null
          dpi: number | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          file_url: string
          guest_session_id: string | null
          has_transparency: boolean | null
          id: string
          is_vector: boolean | null
          no_bg_file_url: string | null
          original_height_px: number | null
          original_width_px: number | null
          quality_notes: string | null
          quality_score: Database["public"]["Enums"]["image_quality"] | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          dpi?: number | null
          file_name: string
          file_size_bytes?: number | null
          file_type: string
          file_url: string
          guest_session_id?: string | null
          has_transparency?: boolean | null
          id?: string
          is_vector?: boolean | null
          no_bg_file_url?: string | null
          original_height_px?: number | null
          original_width_px?: number | null
          quality_notes?: string | null
          quality_score?: Database["public"]["Enums"]["image_quality"] | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          dpi?: number | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          file_url?: string
          guest_session_id?: string | null
          has_transparency?: boolean | null
          id?: string
          is_vector?: boolean | null
          no_bg_file_url?: string | null
          original_height_px?: number | null
          original_width_px?: number | null
          quality_notes?: string | null
          quality_score?: Database["public"]["Enums"]["image_quality"] | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_assets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pricing: {
        Row: {
          created_at: string
          custom_price_per_face: number | null
          customer_id: string
          discount_percentage: number | null
          id: string
          notes: string | null
          pricing_tier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_price_per_face?: number | null
          customer_id: string
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          pricing_tier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_price_per_face?: number | null
          customer_id?: string
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          pricing_tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          company_name: string | null
          contact_name: string | null
          created_at: string
          email: string
          id: string
          is_wholesale: boolean
          phone: string | null
          shopify_customer_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email: string
          id?: string
          is_wholesale?: boolean
          phone?: string | null
          shopify_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string
          id?: string
          is_wholesale?: boolean
          phone?: string | null
          shopify_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      design_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          layout_type: Database["public"]["Enums"]["template_layout_type"]
          name: string
          pattern_cols: number | null
          pattern_gap_cm: number | null
          pattern_rotation: number | null
          pattern_rows: number | null
          position_x: string | null
          position_y: string | null
          preview_image_url: string | null
          product_type_id: string
          scale_percentage: number | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          layout_type?: Database["public"]["Enums"]["template_layout_type"]
          name: string
          pattern_cols?: number | null
          pattern_gap_cm?: number | null
          pattern_rotation?: number | null
          pattern_rows?: number | null
          position_x?: string | null
          position_y?: string | null
          preview_image_url?: string | null
          product_type_id: string
          scale_percentage?: number | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          layout_type?: Database["public"]["Enums"]["template_layout_type"]
          name?: string
          pattern_cols?: number | null
          pattern_gap_cm?: number | null
          pattern_rotation?: number | null
          pattern_rows?: number | null
          position_x?: string | null
          position_y?: string | null
          preview_image_url?: string | null
          product_type_id?: string
          scale_percentage?: number | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_templates_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          created_at: string
          customer_id: string | null
          design_data: Json
          faces_to_print: number
          guest_session_id: string | null
          id: string
          mockup_image_url: string | null
          name: string | null
          print_file_url: string | null
          product_id: string
          status: Database["public"]["Enums"]["design_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          design_data?: Json
          faces_to_print?: number
          guest_session_id?: string | null
          id?: string
          mockup_image_url?: string | null
          name?: string | null
          print_file_url?: string | null
          product_id: string
          status?: Database["public"]["Enums"]["design_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          design_data?: Json
          faces_to_print?: number
          guest_session_id?: string | null
          id?: string
          mockup_image_url?: string | null
          name?: string | null
          print_file_url?: string | null
          product_id?: string
          status?: Database["public"]["Enums"]["design_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          notes: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          customer_id: string | null
          customer_notes: string | null
          delivered_at: string | null
          design_id: string
          discount_amount: number
          estimated_production_days: number | null
          faces_to_print: number
          guest_email: string | null
          guest_name: string | null
          id: string
          internal_notes: string | null
          order_number: string
          paid_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          price_override: boolean
          price_override_by: string | null
          price_per_face_per_piece: number
          pricing_tier_id: string | null
          print_proof_image_url: string | null
          print_proof_uploaded_at: string | null
          print_proof_uploaded_by: string | null
          product_id: string
          production_completed_at: string | null
          production_started_at: string | null
          quantity_packs: number
          shipped_at: string | null
          shipping_carrier: string | null
          shopify_order_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          terms_accepted: boolean
          terms_accepted_at: string | null
          total: number
          total_pieces: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          design_id: string
          discount_amount?: number
          estimated_production_days?: number | null
          faces_to_print: number
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          internal_notes?: string | null
          order_number: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price_override?: boolean
          price_override_by?: string | null
          price_per_face_per_piece: number
          pricing_tier_id?: string | null
          print_proof_image_url?: string | null
          print_proof_uploaded_at?: string | null
          print_proof_uploaded_by?: string | null
          product_id: string
          production_completed_at?: string | null
          production_started_at?: string | null
          quantity_packs: number
          shipped_at?: string | null
          shipping_carrier?: string | null
          shopify_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          total: number
          total_pieces: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          design_id?: string
          discount_amount?: number
          estimated_production_days?: number | null
          faces_to_print?: number
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          internal_notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price_override?: boolean
          price_override_by?: string | null
          price_per_face_per_piece?: number
          pricing_tier_id?: string | null
          print_proof_image_url?: string | null
          print_proof_uploaded_at?: string | null
          print_proof_uploaded_by?: string | null
          product_id?: string
          production_completed_at?: string | null
          production_started_at?: string | null
          quantity_packs?: number
          shipped_at?: string | null
          shipping_carrier?: string | null
          shopify_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          total?: number
          total_pieces?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_price_override_by_fkey"
            columns: ["price_override_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_print_proof_uploaded_by_fkey"
            columns: ["print_proof_uploaded_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_quantity: number | null
          min_quantity: number
          name: string
          price_per_face: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity: number
          name: string
          price_per_face: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity?: number | null
          min_quantity?: number
          name?: string
          price_per_face?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_mockup_faces: {
        Row: {
          created_at: string | null
          face_number: number
          id: string
          image_url: string
          print_area_h: number | null
          print_area_w: number | null
          print_area_x: number | null
          print_area_y: number | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          face_number: number
          id?: string
          image_url: string
          print_area_h?: number | null
          print_area_w?: number | null
          print_area_x?: number | null
          print_area_y?: number | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          face_number?: number
          id?: string
          image_url?: string
          print_area_h?: number | null
          print_area_w?: number | null
          print_area_x?: number | null
          print_area_y?: number | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_mockup_faces_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pricing_tiers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_packs: number | null
          min_packs: number
          name: string
          price_per_face: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_packs?: number | null
          min_packs: number
          name: string
          price_per_face: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_packs?: number | null
          min_packs?: number
          name?: string
          price_per_face?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_subtypes: {
        Row: {
          color: string | null
          color_hex: string | null
          created_at: string
          finish: string | null
          id: string
          image_url: string | null
          is_active: boolean
          material: string | null
          name: string
          product_type_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          created_at?: string
          finish?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          material?: string | null
          name: string
          product_type_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          created_at?: string
          finish?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          material?: string | null
          name?: string
          product_type_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_subtypes_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          base_material: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          printable_faces: number[]
          safety_margin_cm: number
          slug: string
          total_faces: number
          updated_at: string
        }
        Insert: {
          base_material: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          printable_faces: number[]
          safety_margin_cm?: number
          slug: string
          total_faces: number
          updated_at?: string
        }
        Update: {
          base_material?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          printable_faces?: number[]
          safety_margin_cm?: number
          slug?: string
          total_faces?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          depth_cm: number | null
          height_cm: number
          id: string
          is_active: boolean
          min_packs: number
          mockup_image_url: string | null
          mockup_print_area_h: number | null
          mockup_print_area_w: number | null
          mockup_print_area_x: number | null
          mockup_print_area_y: number | null
          name: string
          pieces_per_pack: number
          preview_image_url: string | null
          print_height_cm: number
          print_width_cm: number
          restricted_faces: number[]
          shopify_product_id: string | null
          shopify_variant_id: string | null
          size_label: string | null
          sku: string
          subtype_id: string
          template_svg_url: string | null
          updated_at: string
          width_cm: number
        }
        Insert: {
          created_at?: string
          depth_cm?: number | null
          height_cm: number
          id?: string
          is_active?: boolean
          min_packs?: number
          mockup_image_url?: string | null
          mockup_print_area_h?: number | null
          mockup_print_area_w?: number | null
          mockup_print_area_x?: number | null
          mockup_print_area_y?: number | null
          name: string
          pieces_per_pack: number
          preview_image_url?: string | null
          print_height_cm: number
          print_width_cm: number
          restricted_faces?: number[]
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          size_label?: string | null
          sku: string
          subtype_id: string
          template_svg_url?: string | null
          updated_at?: string
          width_cm: number
        }
        Update: {
          created_at?: string
          depth_cm?: number | null
          height_cm?: number
          id?: string
          is_active?: boolean
          min_packs?: number
          mockup_image_url?: string | null
          mockup_print_area_h?: number | null
          mockup_print_area_w?: number | null
          mockup_print_area_x?: number | null
          mockup_print_area_y?: number | null
          name?: string
          pieces_per_pack?: number
          preview_image_url?: string | null
          print_height_cm?: number
          print_width_cm?: number
          restricted_faces?: number[]
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          size_label?: string | null
          sku?: string
          subtype_id?: string
          template_svg_url?: string | null
          updated_at?: string
          width_cm?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_subtype_id_fkey"
            columns: ["subtype_id"]
            isOneToOne: false
            referencedRelation: "product_subtypes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["team_role"]
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          role: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_team_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_team_member: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      design_status: "draft" | "finalized"
      image_quality: "high" | "medium" | "low"
      order_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "in_queue"
        | "printing"
        | "printed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      team_role: "admin" | "sales" | "print_operator" | "designer"
      template_layout_type: "single" | "pattern" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      design_status: ["draft", "finalized"],
      image_quality: ["high", "medium", "low"],
      order_status: [
        "draft",
        "pending_payment",
        "paid",
        "in_queue",
        "printing",
        "printed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      team_role: ["admin", "sales", "print_operator", "designer"],
      template_layout_type: ["single", "pattern", "custom"],
    },
  },
} as const
