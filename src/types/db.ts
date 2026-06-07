export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          active: boolean;
          created_at: string;
          deleted_at: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          active: boolean;
          created_at: string;
          deleted_at: string | null;
          icon_name: string;
          id: string;
          name: string;
          product_ids: string[];
          route_path: string | null;
          slug: string;
          sort_order: number;
          tagline: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          icon_name?: string;
          id?: string;
          name: string;
          product_ids?: string[];
          route_path?: string | null;
          slug: string;
          sort_order?: number;
          tagline?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          icon_name?: string;
          id?: string;
          name?: string;
          product_ids?: string[];
          route_path?: string | null;
          slug?: string;
          sort_order?: number;
          tagline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          coupon_id: string;
          id: string;
          order_id: string;
          profile_id: string | null;
          redeemed_at: string;
        };
        Insert: {
          coupon_id: string;
          id?: string;
          order_id: string;
          profile_id?: string | null;
          redeemed_at?: string;
        };
        Update: {
          coupon_id?: string;
          id?: string;
          order_id?: string;
          profile_id?: string | null;
          redeemed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          deleted_at: string | null;
          eligibility: string;
          hint: string;
          id: string;
          label: string;
          max_uses: number | null;
          max_uses_per_user: number | null;
          min_order_value_cents: number | null;
          status: string;
          type: string;
          updated_at: string;
          used_count: number;
          valid_from: string;
          valid_until: string | null;
          value: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          deleted_at?: string | null;
          eligibility?: string;
          hint?: string;
          id?: string;
          label?: string;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          min_order_value_cents?: number | null;
          status?: string;
          type: string;
          updated_at?: string;
          used_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          value?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          deleted_at?: string | null;
          eligibility?: string;
          hint?: string;
          id?: string;
          label?: string;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          min_order_value_cents?: number | null;
          status?: string;
          type?: string;
          updated_at?: string;
          used_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          value?: number;
        };
        Relationships: [];
      };
      delivery_persons: {
        Row: {
          active: boolean;
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          name: string;
          phone: string;
          plate: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          phone: string;
          plate: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          phone?: string;
          plate?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_rings: {
        Row: {
          active: boolean;
          created_at: string;
          eta_max: number;
          eta_min: number;
          fee_cents: number;
          id: string;
          inner_radius_m: number;
          label: string;
          outer_radius_m: number;
          ring_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          eta_max: number;
          eta_min: number;
          fee_cents: number;
          id?: string;
          inner_radius_m: number;
          label: string;
          outer_radius_m: number;
          ring_order: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          eta_max?: number;
          eta_min?: number;
          fee_cents?: number;
          id?: string;
          inner_radius_m?: number;
          label?: string;
          outer_radius_m?: number;
          ring_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      gift_kit_slots: {
        Row: {
          created_at: string;
          eligible_product_ids: string[];
          helper: string | null;
          id: string;
          label: string;
          qty: number;
          slot_order: number;
          template_id: string;
        };
        Insert: {
          created_at?: string;
          eligible_product_ids?: string[];
          helper?: string | null;
          id?: string;
          label: string;
          qty?: number;
          slot_order: number;
          template_id: string;
        };
        Update: {
          created_at?: string;
          eligible_product_ids?: string[];
          helper?: string | null;
          id?: string;
          label?: string;
          qty?: number;
          slot_order?: number;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_kit_slots_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "gift_kit_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_kit_templates: {
        Row: {
          active: boolean;
          cover_photo_alt: string;
          cover_photo_url: string;
          created_at: string;
          deleted_at: string | null;
          description: string;
          icon_name: string;
          id: string;
          name: string;
          price_cents: number;
          price_ifood_anchor_cents: number;
          slug: string;
          tagline: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          cover_photo_alt?: string;
          cover_photo_url: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          icon_name?: string;
          id?: string;
          name: string;
          price_cents: number;
          price_ifood_anchor_cents: number;
          slug: string;
          tagline?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          cover_photo_alt?: string;
          cover_photo_url?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          icon_name?: string;
          id?: string;
          name?: string;
          price_cents?: number;
          price_ifood_anchor_cents?: number;
          slug?: string;
          tagline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ifood_imports: {
        Row: {
          file_name: string;
          id: string;
          imported_at: string;
          imported_by: string | null;
          kind: string;
          period_end: string;
          period_start: string;
          row_count: number;
          totals: Json;
        };
        Insert: {
          file_name: string;
          id?: string;
          imported_at?: string;
          imported_by?: string | null;
          kind: string;
          period_end: string;
          period_start: string;
          row_count?: number;
          totals?: Json;
        };
        Update: {
          file_name?: string;
          id?: string;
          imported_at?: string;
          imported_by?: string | null;
          kind?: string;
          period_end?: string;
          period_start?: string;
          row_count?: number;
          totals?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "ifood_imports_imported_by_fkey";
            columns: ["imported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ifood_order_financials: {
        Row: {
          created_at: string;
          fees_cents: number;
          id: string;
          ifood_order_id: string;
          import_id: string | null;
          net_cents: number;
          ordered_at: string;
          payment_method: string | null;
          status: string;
          total_paid_cents: number;
        };
        Insert: {
          created_at?: string;
          fees_cents?: number;
          id?: string;
          ifood_order_id: string;
          import_id?: string | null;
          net_cents?: number;
          ordered_at: string;
          payment_method?: string | null;
          status: string;
          total_paid_cents?: number;
        };
        Update: {
          created_at?: string;
          fees_cents?: number;
          id?: string;
          ifood_order_id?: string;
          import_id?: string | null;
          net_cents?: number;
          ordered_at?: string;
          payment_method?: string | null;
          status?: string;
          total_paid_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ifood_order_financials_import_id_fkey";
            columns: ["import_id"];
            isOneToOne: false;
            referencedRelation: "ifood_imports";
            referencedColumns: ["id"];
          },
        ];
      };
      ifood_product_map: {
        Row: {
          ifood_name: string;
          product_id: string | null;
          updated_at: string;
        };
        Insert: {
          ifood_name: string;
          product_id?: string | null;
          updated_at?: string;
        };
        Update: {
          ifood_name?: string;
          product_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ifood_product_map_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      ifood_product_sales: {
        Row: {
          id: string;
          ifood_item_name: string;
          import_id: string;
          period_end: string;
          period_start: string;
          product_id: string | null;
          qty: number;
          revenue_cents: number;
        };
        Insert: {
          id?: string;
          ifood_item_name: string;
          import_id: string;
          period_end: string;
          period_start: string;
          product_id?: string | null;
          qty?: number;
          revenue_cents?: number;
        };
        Update: {
          id?: string;
          ifood_item_name?: string;
          import_id?: string;
          period_end?: string;
          period_start?: string;
          product_id?: string | null;
          qty?: number;
          revenue_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ifood_product_sales_import_id_fkey";
            columns: ["import_id"];
            isOneToOne: false;
            referencedRelation: "ifood_imports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ifood_product_sales_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_anon_reads: {
        Row: {
          anon_id: string;
          notification_id: string;
          read_at: string;
        };
        Insert: {
          anon_id: string;
          notification_id: string;
          read_at?: string;
        };
        Update: {
          anon_id?: string;
          notification_id?: string;
          read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_anon_reads_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_clicks: {
        Row: {
          anon_id: string | null;
          clicked_at: string;
          id: string;
          notification_id: string;
          profile_id: string | null;
        };
        Insert: {
          anon_id?: string | null;
          clicked_at?: string;
          id?: string;
          notification_id: string;
          profile_id?: string | null;
        };
        Update: {
          anon_id?: string | null;
          clicked_at?: string;
          id?: string;
          notification_id?: string;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_clicks_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_clicks_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_reads: {
        Row: {
          notification_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          notification_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          notification_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          audience: string;
          body: string;
          coupon_code: string | null;
          created_at: string;
          created_by: string | null;
          cta_href: string | null;
          cta_label: string | null;
          expires_at: string;
          id: string;
          published_at: string;
          title: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          audience?: string;
          body: string;
          coupon_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          cta_href?: string | null;
          cta_label?: string | null;
          expires_at?: string;
          id?: string;
          published_at?: string;
          title: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          body?: string;
          coupon_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          cta_href?: string | null;
          cta_label?: string | null;
          expires_at?: string;
          id?: string;
          published_at?: string;
          title?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          gift_kit_template_id: string | null;
          id: string;
          is_kit: boolean;
          kit_card_message: string | null;
          kit_packaging: boolean;
          kit_picks_snapshot: Json | null;
          kit_recipient_snapshot: Json | null;
          notes: string | null;
          order_id: string;
          product_category: string | null;
          product_id: string | null;
          product_name: string;
          qty: number;
          unit_price_ifood_cents: number;
          unit_price_site_cents: number;
        };
        Insert: {
          created_at?: string;
          gift_kit_template_id?: string | null;
          id?: string;
          is_kit?: boolean;
          kit_card_message?: string | null;
          kit_packaging?: boolean;
          kit_picks_snapshot?: Json | null;
          kit_recipient_snapshot?: Json | null;
          notes?: string | null;
          order_id: string;
          product_category?: string | null;
          product_id?: string | null;
          product_name: string;
          qty: number;
          unit_price_ifood_cents?: number;
          unit_price_site_cents: number;
        };
        Update: {
          created_at?: string;
          gift_kit_template_id?: string | null;
          id?: string;
          is_kit?: boolean;
          kit_card_message?: string | null;
          kit_packaging?: boolean;
          kit_picks_snapshot?: Json | null;
          kit_recipient_snapshot?: Json | null;
          notes?: string | null;
          order_id?: string;
          product_category?: string | null;
          product_id?: string | null;
          product_name?: string;
          qty?: number;
          unit_price_ifood_cents?: number;
          unit_price_site_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_gift_kit_template_id_fkey";
            columns: ["gift_kit_template_id"];
            isOneToOne: false;
            referencedRelation: "gift_kit_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          at: string;
          changed_by_profile_id: string | null;
          id: string;
          note: string | null;
          order_id: string;
          status: string;
        };
        Insert: {
          at?: string;
          changed_by_profile_id?: string | null;
          id?: string;
          note?: string | null;
          order_id: string;
          status: string;
        };
        Update: {
          at?: string;
          changed_by_profile_id?: string | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          cancel_reason: string | null;
          coupon_code: string | null;
          coupon_discount_cents: number | null;
          coupon_id: string | null;
          created_at: string;
          customer_name: string;
          customer_phone: string;
          delivered_at: string | null;
          delivery_call_id: string | null;
          discount_total_cents: number;
          id: string;
          order_number: number;
          order_type: string;
          payment_status: string;
          profile_id: string | null;
          scheduled_date: string | null;
          scheduled_hour: number | null;
          shipping_address_snapshot: Json;
          shipping_fee_cents: number;
          source: string;
          status: string;
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          fbp: string | null;
          fbc: string | null;
          purchase_event_id: string;
        };
        Insert: {
          cancel_reason?: string | null;
          coupon_code?: string | null;
          coupon_discount_cents?: number | null;
          coupon_id?: string | null;
          created_at?: string;
          customer_name: string;
          customer_phone: string;
          delivered_at?: string | null;
          delivery_call_id?: string | null;
          discount_total_cents?: number;
          id?: string;
          order_number?: number;
          order_type?: string;
          payment_status?: string;
          profile_id?: string | null;
          scheduled_date?: string | null;
          scheduled_hour?: number | null;
          shipping_address_snapshot: Json;
          shipping_fee_cents?: number;
          source?: string;
          status?: string;
          subtotal_cents: number;
          total_cents: number;
          updated_at?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          fbp?: string | null;
          fbc?: string | null;
          purchase_event_id?: string;
        };
        Update: {
          cancel_reason?: string | null;
          coupon_code?: string | null;
          coupon_discount_cents?: number | null;
          coupon_id?: string | null;
          created_at?: string;
          customer_name?: string;
          customer_phone?: string;
          delivered_at?: string | null;
          delivery_call_id?: string | null;
          discount_total_cents?: number;
          id?: string;
          order_number?: number;
          order_type?: string;
          payment_status?: string;
          profile_id?: string | null;
          scheduled_date?: string | null;
          scheduled_hour?: number | null;
          shipping_address_snapshot?: Json;
          shipping_fee_cents?: number;
          source?: string;
          status?: string;
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          fbp?: string | null;
          fbc?: string | null;
          purchase_event_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          id: string;
          idempotency_key: string | null;
          method: string | null;
          order_id: string;
          paid_at: string | null;
          provider: string;
          provider_charge_id: string | null;
          raw_payload: Json | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          method?: string | null;
          order_id: string;
          paid_at?: string | null;
          provider?: string;
          provider_charge_id?: string | null;
          raw_payload?: Json | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          method?: string | null;
          order_id?: string;
          paid_at?: string | null;
          provider?: string;
          provider_charge_id?: string | null;
          raw_payload?: Json | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          abacatepay_product_id: string | null;
          active: boolean;
          attributes: string[];
          available_for_preorder: boolean;
          category: string;
          contains: string[];
          cost_cents: number;
          created_at: string;
          deleted_at: string | null;
          description: string;
          freezable: boolean | null;
          gramatura_g: number;
          id: string;
          ifood_order_count: number | null;
          ifood_rating: number | null;
          low_stock_threshold: number;
          name: string;
          photo_alt: string;
          photo_secondary_alt: string | null;
          photo_secondary_url: string | null;
          photo_url: string;
          price_ifood_cents: number;
          price_site_cents: number;
          serves: number | null;
          slug: string;
          stock: number;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          abacatepay_product_id?: string | null;
          active?: boolean;
          attributes?: string[];
          available_for_preorder?: boolean;
          category: string;
          contains?: string[];
          cost_cents?: number;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          freezable?: boolean | null;
          gramatura_g?: number;
          id?: string;
          ifood_order_count?: number | null;
          ifood_rating?: number | null;
          low_stock_threshold?: number;
          name: string;
          photo_alt?: string;
          photo_secondary_alt?: string | null;
          photo_secondary_url?: string | null;
          photo_url: string;
          price_ifood_cents: number;
          price_site_cents: number;
          serves?: number | null;
          slug: string;
          stock?: number;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          abacatepay_product_id?: string | null;
          active?: boolean;
          attributes?: string[];
          available_for_preorder?: boolean;
          category?: string;
          contains?: string[];
          cost_cents?: number;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          freezable?: boolean | null;
          gramatura_g?: number;
          id?: string;
          ifood_order_count?: number | null;
          ifood_rating?: number | null;
          low_stock_threshold?: number;
          name?: string;
          photo_alt?: string;
          photo_secondary_alt?: string | null;
          photo_secondary_url?: string | null;
          photo_url?: string;
          price_ifood_cents?: number;
          price_site_cents?: number;
          serves?: number | null;
          slug?: string;
          stock?: number;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          cpf: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          is_anonymized: boolean;
          last_name: string | null;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          cpf?: string | null;
          created_at?: string;
          first_name?: string | null;
          id: string;
          is_anonymized?: boolean;
          last_name?: string | null;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          cpf?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          is_anonymized?: boolean;
          last_name?: string | null;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          auto_accept: boolean;
          hours: Json;
          id: string;
          preorder_daily_capacity: number | null;
          preorder_hour_from: number;
          preorder_hour_to: number;
          preorder_max_lead_days: number;
          preorder_min_lead_days: number;
          preorder_min_value_cents: number;
          printer_enabled: boolean;
          printer_name: string;
          store_status: string;
          updated_at: string;
        };
        Insert: {
          auto_accept?: boolean;
          hours?: Json;
          id?: string;
          preorder_daily_capacity?: number | null;
          preorder_hour_from?: number;
          preorder_hour_to?: number;
          preorder_max_lead_days?: number;
          preorder_min_lead_days?: number;
          preorder_min_value_cents?: number;
          printer_enabled?: boolean;
          printer_name?: string;
          store_status?: string;
          updated_at?: string;
        };
        Update: {
          auto_accept?: boolean;
          hours?: Json;
          id?: string;
          preorder_daily_capacity?: number | null;
          preorder_hour_from?: number;
          preorder_hour_to?: number;
          preorder_max_lead_days?: number;
          preorder_min_lead_days?: number;
          preorder_min_value_cents?: number;
          printer_enabled?: boolean;
          printer_name?: string;
          store_status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_addresses: {
        Row: {
          cep: string;
          city: string;
          complement: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_default: boolean;
          label: string;
          lat: number | null;
          lng: number | null;
          neighborhood: string;
          number: string;
          profile_id: string;
          state: string;
          street: string;
          updated_at: string;
        };
        Insert: {
          cep: string;
          city?: string;
          complement?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string;
          lat?: number | null;
          lng?: number | null;
          neighborhood: string;
          number: string;
          profile_id: string;
          state?: string;
          street: string;
          updated_at?: string;
        };
        Update: {
          cep?: string;
          city?: string;
          complement?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string;
          lat?: number | null;
          lng?: number | null;
          neighborhood?: string;
          number?: string;
          profile_id?: string;
          state?: string;
          street?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_addresses_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      redeem_coupon: { Args: { p_order_id: string }; Returns: undefined };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      unredeem_coupon: { Args: { p_order_id: string }; Returns: undefined };
      validate_coupon: {
        Args: { p_cart_total_cents: number; p_code: string; p_user_id?: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
