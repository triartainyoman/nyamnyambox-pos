"use client";

import { DEMO_COOKIE, DEMO_EMPLOYEE_ID, DEMO_OWNER_ID, DEMO_PROFILES } from "@/lib/demo/session";
import type { Order, Product, Profile } from "@/lib/types";

const DB_KEY = "nyb-demo-db-v2";

interface DemoDb {
  version: 2;
  profiles: Profile[];
  products: Product[];
  orders: Order[];
  receiptCounter: number;
}

const PRODUCT_SEED: Array<Omit<Product, "id" | "created_at">> = [
  {
    name: "Thai Basil Chicken",
    price: 20000,
    image_url: "/images/thai-basil.svg",
    is_active: true,
  },
  {
    name: "Chicken Salted Egg",
    price: 20000,
    image_url: "/images/salted-egg.svg",
    is_active: true,
  },
  {
    name: "Chicken BBQ Cheese",
    price: 23000,
    image_url: "/images/bbq-cheese.svg",
    is_active: true,
  },
  {
    name: "Mac & Cheese Ball",
    price: 15000,
    image_url: "/images/mac-cheese.svg",
    is_active: true,
  },
  {
    name: "Kentang & Sosis",
    price: 15000,
    image_url: "/images/kentang-sosis.svg",
    is_active: true,
  },
  {
    name: "Chicken Popcorn",
    price: 15000,
    image_url: "/images/popcorn.svg",
    is_active: true,
  },
  {
    name: "Es Teh Manis",
    price: 4000,
    image_url: "/images/es-teh.svg",
    is_active: true,
  },
  {
    name: "[PROMO] Thai Basil + Free Es Teh",
    price: 20000,
    image_url: "/images/promo-thai-basil.svg",
    is_active: true,
  },
];

const CHANNELS = ["DINE_IN", "TAKEAWAY", "GRABFOOD", "SHOPEEFOOD", "WHATSAPP"] as const;
const METHODS = ["CASH", "QRIS", "TRANSFER", "E_WALLET"] as const;
const NOTES = ["Pedas", "Ekstra pedas", "Tanpa sambal", "Nasi tambah", null, null, null];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDateInJakarta(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function seedProducts(): Product[] {
  return PRODUCT_SEED.map((product, index) => ({
    ...product,
    id: `demo-product-${index + 1}`,
    created_at: "2026-01-04T02:00:00.000Z",
  }));
}

function seedOrders(products: Product[]): { orders: Order[]; receiptCounter: number } {
  const rand = mulberry32(20261024);
  const orders: Order[] = [];
  let counter = 1;

  const cashiers = DEMO_PROFILES.filter((profile) => profile.is_active && profile.role === "EMPLOYEE");
  const pushOrder = (createdAt: Date, channelIndex: number, itemCount: number) => {
    const receiptDay = isoDateInJakarta(createdAt).replace(/-/g, "");
    const channel = CHANNELS[channelIndex % CHANNELS.length];
    const method = METHODS[Math.floor(rand() * METHODS.length)];
    const paid = rand() > 0.08;
    const items = Array.from({ length: itemCount }, () => {
      const product = products[Math.floor(rand() * Math.min(products.length, 7))];
      return {
        id: `demo-item-${counter}-${Math.floor(rand() * 1e6)}`,
        order_id: `demo-order-${counter}`,
        product_id: product.id,
        quantity: rand() > 0.75 ? 2 : 1,
        price_at_transaction: product.price,
        notes: NOTES[Math.floor(rand() * NOTES.length)],
        created_at: createdAt.toISOString(),
        product: { name: product.name, image_url: product.image_url },
      };
    });
    const total = items.reduce((sum, item) => sum + item.quantity * item.price_at_transaction, 0);
    const cashier = cashiers[Math.floor(rand() * cashiers.length)] ?? cashiers[0];

    orders.push({
      id: `demo-order-${counter}`,
      receipt_number: `NYB-${receiptDay}-${String(counter).padStart(4, "0")}`,
      cashier_id: cashier?.id ?? DEMO_EMPLOYEE_ID,
      channel,
      payment_method: method,
      payment_status: paid ? "LUNAS" : "BELUM_LUNAS",
      total_amount: total,
      is_edited: rand() > 0.94,
      customer_phone: channel === "WHATSAPP" || rand() > 0.8 ? "081234567890" : null,
      created_at: createdAt.toISOString(),
      cashier: cashier ? { name: cashier.name, email: cashier.email } : null,
      order_items: items,
    });
    counter += 1;
  };

  const now = new Date();
  const todayNoonJakarta = new Date(`${isoDateInJakarta(now)}T12:00:00+07:00`);

  // Today: 9 orders so the history + dashboard have content immediately.
  for (let i = 0; i < 9; i += 1) {
    const minutesAgo = 45 + i * 52 + Math.floor(rand() * 30);
    const createdAt = new Date(Math.max(todayNoonJakarta.getTime() - 20 * 60 * 1000, now.getTime() - minutesAgo * 60 * 1000));
    pushOrder(createdAt, i, 1 + Math.floor(rand() * 3));
  }

  // Previous five months.
  for (let monthOffset = 1; monthOffset <= 5; monthOffset += 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1));
    const daysInMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
    const orderCount = 22 + Math.floor(rand() * 20);
    for (let i = 0; i < orderCount; i += 1) {
      const day = 1 + Math.floor(rand() * daysInMonth);
      const hour = 10 + Math.floor(rand() * 10);
      const minute = Math.floor(rand() * 60);
      const createdAt = new Date(
        `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`,
      );
      pushOrder(createdAt, Math.floor(rand() * 5), 1 + Math.floor(rand() * 3));
    }
  }

  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { orders, receiptCounter: counter + 1 };
}

function createSeedDb(): DemoDb {
  const products = seedProducts();
  const { orders, receiptCounter } = seedOrders(products);
  return {
    version: 2,
    profiles: DEMO_PROFILES.map((profile) => ({ ...profile })),
    products,
    orders,
    receiptCounter,
  };
}

let memoryDb: DemoDb | null = null;

export function getDemoDb(): DemoDb {
  if (typeof window === "undefined") {
    if (!memoryDb) memoryDb = createSeedDb();
    return memoryDb;
  }

  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb;
      if (parsed.version === 2) {
        // Older demo databases predate username-based cashier login.
        const profiles = parsed.profiles.map((profile, index) => {
          if (profile.username) return profile;
          const emailPrefix =
            profile.email
              .split("@")[0]
              ?.toLowerCase()
              .replace(/[^a-z0-9._-]/g, "") || "";
          const base = emailPrefix.length >= 3 ? emailPrefix : `kasir${index + 1}`;
          return { ...profile, username: base };
        });
        if (profiles.some((profile, index) => profile.username !== parsed.profiles[index]?.username)) {
          parsed.profiles = profiles;
          saveDemoDb(parsed);
        }
        return parsed;
      }
    }
  } catch {
    // Corrupt storage — fall back to a fresh seed.
  }

  const seeded = createSeedDb();
  saveDemoDb(seeded);
  return seeded;
}

export function saveDemoDb(db: DemoDb) {
  memoryDb = db;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Storage might be unavailable (private mode); keep the in-memory copy.
  }
}

export function currentDemoProfile(): Profile {
  const role =
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((entry) => entry.startsWith(`${DEMO_COOKIE}=`))
          ?.split("=")[1]
      : undefined;
  if (role === "OWNER") {
    return getDemoDb().profiles.find((profile) => profile.id === DEMO_OWNER_ID) ?? getDemoDb().profiles[0];
  }
  return getDemoDb().profiles.find((profile) => profile.id === DEMO_EMPLOYEE_ID) ?? getDemoDb().profiles[1];
}

export { DB_KEY };
