import { businessDayRange } from "@/lib/utils";
import type { Order } from "@/lib/types";

export { businessDayRange };

export function dayRangeFromDate(dateISO: string) {
  return businessDayRange(dateISO);
}

export function currentDayRange() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return businessDayRange(today);
}

export function isOrderPaid(order: Pick<Order, "payment_status">) {
  return order.payment_status === "LUNAS";
}
