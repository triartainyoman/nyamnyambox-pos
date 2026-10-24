import { demoCreateOrder, demoListOrders, demoUpdateOrder } from "@/lib/demo/api";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CreateOrderInput,
  Order,
  OrderItem,
  Profile,
  UpdateOrderInput,
} from "@/lib/types";

type OrderQueryRow = Order & {
  cashier?: Pick<Profile, "name" | "email"> | null;
  order_items?: Array<OrderItem & { product?: { name: string; image_url: string | null } | null }>;
};

const ORDER_SELECT =
  "*, cashier:profiles(name, email), order_items(*, product:products(name, image_url))";

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi");
  return supabase;
}

function mapOrder(row: OrderQueryRow): Order {
  return {
    ...row,
    cashier: row.cashier ?? null,
    order_items: (row.order_items ?? []).map((item) => ({
      ...item,
      product: item.product ?? null,
    })),
  };
}

export async function listOrders(fromISO: string, toISO: string): Promise<Order[]> {
  if (!isSupabaseConfigured) return demoListOrders(fromISO, toISO);

  const { data, error } = await client()
    .from("orders")
    .select(ORDER_SELECT)
    .gte("created_at", fromISO)
    .lt("created_at", toISO)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as OrderQueryRow[]).map(mapOrder);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (!isSupabaseConfigured) {
    const order = demoListOrders("1970-01-01T00:00:00.000Z", "2999-01-01T00:00:00.000Z").find(
      (candidate) => candidate.id === orderId,
    );
    return order ?? null;
  }

  const { data, error } = await client()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapOrder(data as unknown as OrderQueryRow) : null;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (!isSupabaseConfigured) return demoCreateOrder(input);

  const { data, error } = await client().rpc("create_order", {
    p_channel: input.channel,
    p_payment_method: input.payment_method,
    p_payment_status: input.payment_status,
    p_customer_phone: input.customer_phone ?? null,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
  });

  if (error) throw new Error(error.message);
  const created = await getOrderById(data.id);
  if (!created) throw new Error("Transaksi tersimpan tetapi gagal dimuat");
  return created;
}

export async function updateOrder(input: UpdateOrderInput): Promise<Order> {
  if (!isSupabaseConfigured) return demoUpdateOrder(input);

  const { data, error } = await client().rpc("update_order", {
    p_order_id: input.order_id,
    p_payment_method: input.payment_method,
    p_payment_status: input.payment_status,
    p_customer_phone: input.customer_phone ?? null,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
  });

  if (error) throw new Error(error.message);
  const updated = await getOrderById(data.id);
  if (!updated) throw new Error("Transaksi tersimpan tetapi gagal dimuat");
  return updated;
}
