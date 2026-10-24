"use client";

import { getDemoDb, saveDemoDb, currentDemoProfile } from "@/lib/demo/store";
import { normalizeUsername } from "@/lib/username";
import { toBusinessDate } from "@/lib/utils";
import type {
  CreateOrderInput,
  DashboardSummary,
  Order,
  OrderChannel,
  Product,
  ProductInput,
  Profile,
  UpdateOrderInput,
} from "@/lib/types";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function withProductNames(order: Order): Order {
  const db = getDemoDb();
  return {
    ...order,
    order_items: (order.order_items ?? []).map((item) => {
      const product = db.products.find((candidate) => candidate.id === item.product_id);
      return {
        ...item,
        product: product ? { name: product.name, image_url: product.image_url } : item.product,
      };
    }),
  };
}

export function demoListProducts(activeOnly = false): Product[] {
  const products = getDemoDb().products;
  return [...products]
    .filter((product) => (activeOnly ? product.is_active : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function demoCreateProduct(input: ProductInput): Product {
  const db = getDemoDb();
  const product: Product = {
    id: newId(),
    name: input.name,
    price: input.price,
    image_url: input.image_url ?? null,
    is_active: input.is_active ?? true,
    created_at: new Date().toISOString(),
  };
  db.products.unshift(product);
  saveDemoDb(db);
  return product;
}

export function demoUpdateProduct(id: string, input: ProductInput): Product {
  const db = getDemoDb();
  const index = db.products.findIndex((product) => product.id === id);
  if (index < 0) throw new Error("Produk tidak ditemukan");
  const updated: Product = {
    ...db.products[index],
    name: input.name,
    price: input.price,
    image_url: input.image_url === undefined ? db.products[index].image_url : input.image_url,
    is_active: input.is_active ?? db.products[index].is_active,
  };
  db.products[index] = updated;
  saveDemoDb(db);
  return updated;
}

export function demoSetProductActive(id: string, isActive: boolean) {
  const db = getDemoDb();
  db.products = db.products.map((product) =>
    product.id === id ? { ...product, is_active: isActive } : product,
  );
  saveDemoDb(db);
}

export function demoListOrders(fromISO: string, toISO: string): Order[] {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return getDemoDb()
    .orders.filter((order) => {
      const created = new Date(order.created_at).getTime();
      return created >= from && created < to;
    })
    .map(withProductNames);
}

export function demoCreateOrder(input: CreateOrderInput): Order {
  if (!input.items.length) throw new Error("Keranjang masih kosong");
  const db = getDemoDb();
  const cashier = currentDemoProfile();

  const items = input.items.map((item) => {
    const product = db.products.find((candidate) => candidate.id === item.product_id);
    if (!product) throw new Error("Produk tidak tersedia");
    return {
      id: newId(),
      order_id: "",
      product_id: product.id,
      quantity: item.quantity,
      price_at_transaction: product.price,
      notes: item.notes ?? null,
      created_at: new Date().toISOString(),
      product: { name: product.name, image_url: product.image_url },
    };
  });

  const id = newId();
  const createdAt = new Date();
  const receiptDay = toBusinessDate(createdAt).replace(/-/g, "");
  const receiptNumber = `NYB-${receiptDay}-${String(db.receiptCounter).padStart(4, "0")}`;
  db.receiptCounter += 1;

  const order: Order = {
    id,
    receipt_number: receiptNumber,
    cashier_id: cashier.id,
    channel: input.channel,
    payment_method: input.payment_method,
    payment_status: input.payment_status,
    total_amount: items.reduce((sum, item) => sum + item.price_at_transaction * item.quantity, 0),
    is_edited: false,
    customer_phone: input.customer_phone ?? null,
    created_at: createdAt.toISOString(),
    cashier: { name: cashier.name },
    order_items: items.map((item) => ({ ...item, order_id: id })),
  };

  db.orders.unshift(order);
  saveDemoDb(db);
  return order;
}

export function demoUpdateOrder(input: UpdateOrderInput): Order {
  if (!input.items.length) throw new Error("Pesanan harus memiliki minimal satu item");
  const db = getDemoDb();
  const index = db.orders.findIndex((order) => order.id === input.order_id);
  if (index < 0) throw new Error("Transaksi tidak ditemukan");

  const items = input.items.map((item) => {
    const product = db.products.find((candidate) => candidate.id === item.product_id);
    if (!product) throw new Error("Produk tidak tersedia");
    return {
      id: newId(),
      order_id: input.order_id,
      product_id: product.id,
      quantity: item.quantity,
      price_at_transaction: product.price,
      notes: item.notes ?? null,
      created_at: new Date().toISOString(),
      product: { name: product.name, image_url: product.image_url },
    };
  });

  const updated: Order = {
    ...db.orders[index],
    payment_method: input.payment_method,
    payment_status: input.payment_status,
    customer_phone: input.customer_phone ?? null,
    total_amount: items.reduce((sum, item) => sum + item.price_at_transaction * item.quantity, 0),
    is_edited: true,
    order_items: items,
  };

  db.orders[index] = updated;
  saveDemoDb(db);
  return updated;
}

export function demoDashboard(): DashboardSummary {
  const orders = getDemoDb().orders.filter((order) => order.payment_status === "LUNAS");
  const today = toBusinessDate(new Date());
  const todayOrders = getDemoDb().orders.filter((order) => toBusinessDate(order.created_at) === today);
  const todayPaid = todayOrders.filter((order) => order.payment_status === "LUNAS");
  const revenue = todayPaid.reduce((sum, order) => sum + order.total_amount, 0);

  const monthly: DashboardSummary["monthly"] = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthOrders = orders.filter((order) => order.created_at.slice(0, 7) === month);
    monthly.push({
      month,
      label: new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" }).format(date),
      revenue: monthOrders.reduce((sum, order) => sum + order.total_amount, 0),
      orders: monthOrders.length,
    });
  }

  const currentMonth = monthly[monthly.length - 1]?.month ?? today.slice(0, 7);
  const monthOrders = orders.filter((order) => order.created_at.slice(0, 7) === currentMonth);

  const channelMap = new Map<OrderChannel, { revenue: number; orders: number }>();
  monthOrders.forEach((order) => {
    const current = channelMap.get(order.channel) ?? { revenue: 0, orders: 0 };
    channelMap.set(order.channel, {
      revenue: current.revenue + order.total_amount,
      orders: current.orders + 1,
    });
  });

  const productMap = new Map<string, { product_id: string; name: string; quantity: number; revenue: number }>();
  monthOrders.forEach((order) => {
    (order.order_items ?? []).forEach((item) => {
      const current = productMap.get(item.product_id) ?? {
        product_id: item.product_id,
        name: item.product?.name ?? "Produk",
        quantity: 0,
        revenue: 0,
      };
      productMap.set(item.product_id, {
        ...current,
        quantity: current.quantity + item.quantity,
        revenue: current.revenue + item.quantity * item.price_at_transaction,
      });
    });
  });

  return {
    today: {
      revenue,
      orders: todayOrders.length,
      paid_orders: todayPaid.length,
      unpaid_orders: todayOrders.length - todayPaid.length,
      aov: todayPaid.length ? Math.round(revenue / todayPaid.length) : 0,
    },
    monthly,
    channels: Array.from(channelMap.entries()).map(([channel, value]) => ({
      channel,
      ...value,
    })),
    top_products: Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
  };
}

export function demoListProfiles(): Profile[] {
  return [...getDemoDb().profiles].sort((a, b) => a.name.localeCompare(b.name));
}

export function demoCreateEmployee(input: {
  name: string;
  username: string;
  email: string;
}): Profile {
  const db = getDemoDb();
  const username = normalizeUsername(input.username);
  if (db.profiles.some((profile) => profile.username === username)) {
    throw new Error("Username sudah dipakai");
  }
  if (db.profiles.some((profile) => profile.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("Email sudah terdaftar");
  }
  const profile: Profile = {
    id: newId(),
    username,
    name: input.name,
    email: input.email,
    role: "EMPLOYEE",
    is_active: true,
    created_at: new Date().toISOString(),
  };
  db.profiles.push(profile);
  saveDemoDb(db);
  return profile;
}

export function demoUpdateProfile(
  id: string,
  patch: Partial<Pick<Profile, "name" | "role" | "is_active">>,
): Profile {
  const db = getDemoDb();
  const index = db.profiles.findIndex((profile) => profile.id === id);
  if (index < 0) throw new Error("Akun tidak ditemukan");
  const updated = { ...db.profiles[index], ...patch };
  db.profiles[index] = updated;
  saveDemoDb(db);
  return updated;
}
