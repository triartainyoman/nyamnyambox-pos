import type {
  OrderChannel,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "@/lib/types";

export const APP_NAME = "Nyamnyambox";
export const APP_TAGLINE = "POS & Order Management";

export const TIME_ZONE = "Asia/Jakarta";

export const ORDER_CHANNELS: Array<{
  value: OrderChannel;
  label: string;
  short: string;
  tone: string;
}> = [
  { value: "DINE_IN", label: "Dine-In", short: "Dine-In", tone: "bg-emerald-100 text-emerald-700" },
  { value: "TAKEAWAY", label: "Takeaway", short: "Takeaway", tone: "bg-sky-100 text-sky-700" },
  { value: "GRABFOOD", label: "GrabFood", short: "Grab", tone: "bg-green-100 text-green-700" },
  { value: "SHOPEEFOOD", label: "ShopeeFood", short: "Shopee", tone: "bg-orange-100 text-orange-700" },
  { value: "WHATSAPP", label: "WhatsApp", short: "WA", tone: "bg-teal-100 text-teal-700" },
];

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "QRIS", label: "QRIS" },
  { value: "E_WALLET", label: "E-Wallet" },
];

export const PAYMENT_STATUSES: Array<{ value: PaymentStatus; label: string }> = [
  { value: "LUNAS", label: "Lunas" },
  { value: "BELUM_LUNAS", label: "Belum Lunas" },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  MASTER_ADMIN: "Master Admin",
  OWNER: "Owner",
  DEVELOPER: "Developer",
  EMPLOYEE: "Kasir",
};

export const SPICE_PRESETS = ["Sedang", "Pedas", "Ekstra Pedas", "Tanpa Sambal"];

export const OWNER_ROLES: UserRole[] = ["OWNER", "MASTER_ADMIN", "DEVELOPER"];

export function isOwnerRole(role: UserRole | undefined | null) {
  return role === "OWNER" || role === "MASTER_ADMIN" || role === "DEVELOPER";
}

/** Hidden super-owner: never listed in `/employees`, managed out-of-band. */
export function isDeveloperRole(role: UserRole | undefined | null) {
  return role === "DEVELOPER";
}

export function homePathForRole(role: UserRole | undefined | null) {
  return isOwnerRole(role) ? "/dashboard" : "/pos";
}

export function channelMeta(channel: OrderChannel) {
  return ORDER_CHANNELS.find((item) => item.value === channel) ?? ORDER_CHANNELS[0];
}

export function paymentMethodLabel(method: PaymentMethod) {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}
