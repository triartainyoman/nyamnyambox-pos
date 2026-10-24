export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          name: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          name?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          price: number;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          receipt_number: string;
          cashier_id: string | null;
          channel: Database["public"]["Enums"]["order_channel"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          total_amount: number;
          is_edited: boolean;
          customer_phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_number: string;
          cashier_id?: string | null;
          channel: Database["public"]["Enums"]["order_channel"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          total_amount: number;
          is_edited?: boolean;
          customer_phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_number?: string;
          cashier_id?: string | null;
          channel?: Database["public"]["Enums"]["order_channel"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          total_amount?: number;
          is_edited?: boolean;
          customer_phone?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_cashier_id_fkey";
            columns: ["cashier_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_transaction: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_transaction: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          price_at_transaction?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_order: {
        Args: {
          p_channel: Database["public"]["Enums"]["order_channel"];
          p_payment_method: Database["public"]["Enums"]["payment_method"];
          p_payment_status: Database["public"]["Enums"]["payment_status"];
          p_customer_phone: string | null;
          p_items: Json;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      update_order: {
        Args: {
          p_order_id: string;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
          p_payment_status: Database["public"]["Enums"]["payment_status"];
          p_customer_phone: string | null;
          p_items: Json;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      dashboard_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
    };
    Enums: {
      user_role: "MASTER_ADMIN" | "OWNER" | "EMPLOYEE";
      order_channel: "DINE_IN" | "TAKEAWAY" | "GRABFOOD" | "SHOPEEFOOD" | "WHATSAPP";
      payment_method: "CASH" | "TRANSFER" | "QRIS" | "E_WALLET";
      payment_status: "LUNAS" | "BELUM_LUNAS";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
