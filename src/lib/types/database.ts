// ============================================================
// NETO.APP — Tipos de base de datos (Supabase)
// Generado manualmente desde supabase/migrations/001_schema.sql
// Cuando Supabase esté conectado: npx supabase gen types typescript
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          cuit: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          currency: string;
          fiscal_year_start: number;
          tax_regime: string | null;
          industry: string | null;
          monthly_goal: number | null;
          plan: "trial" | "starter" | "pro" | "enterprise" | null;
          subscription_status: "trialing" | "active" | "past_due" | "canceled" | null;
          trial_ends_at: string | null;
          plan_activated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["companies"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };

      partners: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "customer" | "supplier" | "both";
          cuit: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["partners"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["partners"]["Insert"]>;
      };

      product_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          parent_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["product_categories"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["product_categories"]["Insert"]>;
      };

      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          category_id: string | null;
          type: "physical" | "service" | "digital";
          list_price: number;
          price_cash: number | null;
          price_installments: number | null;
          standard_cost: number;
          active: boolean;
          image_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at" | "price_cash" | "price_installments"> & { price_cash?: number | null; price_installments?: number | null };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };

      inventory_levels: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          qty_on_hand: number;
          qty_reserved: number;
          avg_cost: number;
          last_updated: string;
        };
        Insert: Omit<Database["public"]["Tables"]["inventory_levels"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["inventory_levels"]["Insert"]>;
      };

      stock_moves: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          type: "in" | "out" | "adjustment" | "return";
          qty: number;
          cost_unit: number;
          ref_type: "order" | "purchase" | "adjustment" | "manual" | null;
          ref_id: string | null;
          date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["stock_moves"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["stock_moves"]["Insert"]>;
      };

      orders: {
        Row: {
          id: string;
          user_id: string;
          partner_id: string | null;
          order_number: string | null;
          date: string;
          state: "draft" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";
          channel: "tiendanube" | "mercadolibre" | "whatsapp" | "instagram" | "web" | "other";
          amount_subtotal: number;
          amount_discount: number;
          amount_shipping: number;
          amount_tax: number;
          amount_total: number;
          amount_cost: number;
          margin: number;           // generated
          margin_percent: number;   // generated
          payment_state: "not_paid" | "paid" | "partial" | "refunded";
          payment_method: string | null;
          cost_center_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "margin" | "margin_percent" | "created_at" | "updated_at" | "payment_method" | "cost_center_id"> & { payment_method?: string | null; cost_center_id?: string | null };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          user_id: string;
          product_id: string | null;
          product_name: string;
          qty: number;
          price_unit: number;
          discount_pct: number;
          cost_unit: number;
          price_subtotal: number;
          cost_subtotal: number;
          margin: number;  // generated
        };
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id" | "margin">;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
      };

      purchases: {
        Row: {
          id: string;
          user_id: string;
          partner_id: string | null;
          purchase_number: string | null;
          date: string;
          date_expected: string | null;
          state: "draft" | "confirmed" | "received" | "invoiced" | "cancelled";
          amount_subtotal: number;
          amount_tax: number;
          amount_total: number;
          invoice_status: "pending" | "partial" | "invoiced";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["purchases"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["purchases"]["Insert"]>;
      };

      purchase_items: {
        Row: {
          id: string;
          purchase_id: string;
          user_id: string;
          product_id: string | null;
          product_name: string;
          qty: number;
          price_unit: number;
          price_subtotal: number;
        };
        Insert: Omit<Database["public"]["Tables"]["purchase_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["purchase_items"]["Insert"]>;
      };

      expenses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          type: "fixed" | "variable";
          amount: number;
          frequency: "one_time" | "monthly" | "quarterly" | "yearly";
          date: string;
          active: boolean;
          cost_center_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at" | "cost_center_id"> & { cost_center_id?: string | null };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };

      cost_centers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cost_centers"]["Row"], "id" | "created_at" | "active"> & { active?: boolean };
        Update: Partial<Database["public"]["Tables"]["cost_centers"]["Insert"]>;
      };

      cost_center_transfers: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          from_cost_center_id: string;
          to_cost_center_id: string;
          amount: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cost_center_transfers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["cost_center_transfers"]["Insert"]>;
      };

      ad_campaigns: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          platform: "meta" | "google" | "tiktok" | "other";
          objective: string | null;
          budget_daily: number;
          budget_total: number | null;
          spend: number;
          impressions: number;
          clicks: number;
          orders_attributed: number;
          revenue_attributed: number;
          ctr: number;    // generated
          roas: number;   // generated
          cpa: number;    // generated
          state: "active" | "paused" | "ended";
          date_start: string;
          date_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ad_campaigns"]["Row"], "id" | "ctr" | "roas" | "cpa" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ad_campaigns"]["Insert"]>;
      };

      analytic_lines: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          name: string;
          category: string;
          amount: number;
          channel: string | null;
          ref_type: "order" | "purchase" | "expense" | "campaign" | "manual" | null;
          ref_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["analytic_lines"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["analytic_lines"]["Insert"]>;
      };

      employees: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          rol: string;
          email: string | null;
          celular: string | null;
          fecha_ingreso: string;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["employees"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
      };

      quotes: {
        Row: {
          id: string;
          user_id: string;
          number: string;
          client_name: string;
          date: string;
          valid_days: number;
          state: "draft" | "sent" | "accepted" | "rejected";
          notes: string;
          amount_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quotes"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
      };

      quote_items: {
        Row: {
          id: string;
          quote_id: string;
          user_id: string;
          product_id: string | null;
          product_name: string;
          sku: string | null;
          qty: number;
          price_unit: number;
          price_mode: string;
          price_list: number;
          price_cash: number | null;
          price_installments: number | null;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["quote_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["quote_items"]["Insert"]>;
      };
    };

    Functions: {
      get_pnl_monthly: {
        Args: { p_user_id: string; p_months?: number };
        Returns: {
          mes: string;
          ingresos: number;
          cogs: number;
          cm1: number;
          cm1_pct: number;
          marketing: number;
          logistica: number;
          cm2: number;
          cm2_pct: number;
          gastos_fijos: number;
          cm3: number;
          cm3_pct: number;
        }[];
      };
      get_kpis_current_month: {
        Args: { p_user_id: string };
        Returns: {
          ingresos: number;
          ordenes: number;
          ticket_promedio: number;
          cm3: number;
          cm3_pct: number;
          roas: number;
          spend_ads: number;
          vs_mes_anterior: number;
        }[];
      };
      get_top_products: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: {
          product_id: string;
          product_name: string;
          qty_vendida: number;
          ingresos: number;
          costo: number;
          margen: number;
          margen_pct: number;
        }[];
      };
      get_sales_by_channel: {
        Args: { p_user_id: string; p_months?: number };
        Returns: {
          channel: string;
          ordenes: number;
          ingresos: number;
          margen: number;
          margen_pct: number;
        }[];
      };
      update_inventory_level: {
        Args: {
          p_user_id: string;
          p_product_id: string;
          p_qty: number;
          p_cost_unit: number;
          p_type: string;
        };
        Returns: undefined;
      };
    };

    Views: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

// ── Tipos de conveniencia ──────────────────────────────────────
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Alias directos
export type Company       = Tables<"companies">;
export type Partner       = Tables<"partners">;
export type Product       = Tables<"products">;
export type ProductCategory = Tables<"product_categories">;
export type InventoryLevel = Tables<"inventory_levels">;
export type StockMove     = Tables<"stock_moves">;
export type Order         = Tables<"orders">;
export type OrderItem     = Tables<"order_items">;
export type Purchase      = Tables<"purchases">;
export type PurchaseItem  = Tables<"purchase_items">;
export type Expense       = Tables<"expenses">;
export type AdCampaign    = Tables<"ad_campaigns">;
export type AnalyticLine  = Tables<"analytic_lines">;
export type Employee      = Tables<"employees">;
export type Quote         = Tables<"quotes">;
export type QuoteItem     = Tables<"quote_items">;
export type CostCenter    = Tables<"cost_centers">;
export type CostCenterTransfer = Tables<"cost_center_transfers">;

// Tipos compuestos (con joins)
export type OrderWithItems = Order & { items: OrderItem[] };
export type PurchaseWithItems = Purchase & { items: PurchaseItem[]; partner: Partner | null };
export type ProductWithStock = Product & { stock: InventoryLevel | null; category: ProductCategory | null };
