import { isDemoMode } from "@/lib/env";
import { CONFIG_ERROR, friendlyError, UserFacingError } from "@/lib/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CreateOrderInput,
  Order,
  OrderItem,
  UpdateOrderInput,
} from "@/lib/types";

type OrderQueryRow = Order & {
  order_items?: Array<OrderItem & { product?: { name: string; image_url: string | null } | null }>;
};

const ORDER_SELECT = "*, order_items(*, product:products(name, image_url))";

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new UserFacingError(CONFIG_ERROR);
  return supabase;
}

/**
 * Cashier names come from a minimal `staff_directory` view instead of the
 * `profiles` table. Cashiers can only read their own profile row, so embedding
 * `profiles` here would either fail or hide the name on shared history.
 */
async function loadCashierNames(rows: OrderQueryRow[]): Promise<Map<string, string>> {
  const ids = [
    ...new Set(rows.map((row) => row.cashier_id).filter((id): id is string => Boolean(id))),
  ];
  if (ids.length === 0) return new Map();

  const { data, error } = await client()
    .from("staff_directory")
    .select("id, name")
    .in("id", ids);

  if (error) throw new UserFacingError(friendlyError(error, "Gagal memuat nama kasir."));
  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

function mapOrder(row: OrderQueryRow, cashierNames: Map<string, string>): Order {
  const cashierName = row.cashier_id ? cashierNames.get(row.cashier_id) : undefined;
  return {
    ...row,
    cashier: cashierName ? { name: cashierName } : null,
    order_items: (row.order_items ?? []).map((item) => ({
      ...item,
      product: item.product ?? null,
    })),
  };
}

export async function listOrders(fromISO: string, toISO: string): Promise<Order[]> {
  if (isDemoMode) {
    const { demoListOrders } = await import("@/lib/demo/api");
    return demoListOrders(fromISO, toISO);
  }

  const { data, error } = await client()
    .from("orders")
    .select(ORDER_SELECT)
    .gte("created_at", fromISO)
    .lt("created_at", toISO)
    .order("created_at", { ascending: false });

  if (error) throw new UserFacingError(friendlyError(error, "Gagal memuat transaksi."));
  const rows = (data ?? []) as unknown as OrderQueryRow[];
  const cashierNames = await loadCashierNames(rows);
  return rows.map((row) => mapOrder(row, cashierNames));
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (isDemoMode) {
    const { demoListOrders } = await import("@/lib/demo/api");
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

  if (error) throw new UserFacingError(friendlyError(error, "Gagal memuat transaksi."));
  if (!data) return null;
  const row = data as unknown as OrderQueryRow;
  const cashierNames = await loadCashierNames([row]);
  return mapOrder(row, cashierNames);
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (isDemoMode) {
    const { demoCreateOrder } = await import("@/lib/demo/api");
    return demoCreateOrder(input);
  }

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

  if (error) throw new UserFacingError(friendlyError(error, "Gagal menyimpan pesanan."));
  const created = await getOrderById(data.id);
  if (!created) throw new UserFacingError("Transaksi tersimpan tetapi gagal dimuat");
  return created;
}

export async function updateOrder(input: UpdateOrderInput): Promise<Order> {
  if (isDemoMode) {
    const { demoUpdateOrder } = await import("@/lib/demo/api");
    return demoUpdateOrder(input);
  }

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

  if (error) throw new UserFacingError(friendlyError(error, "Gagal memperbarui pesanan."));
  const updated = await getOrderById(data.id);
  if (!updated) throw new UserFacingError("Transaksi tersimpan tetapi gagal dimuat");
  return updated;
}
