import { describe, expect, it } from "vitest";

import {
  channelMeta,
  homePathForRole,
  isOwnerRole,
  paymentMethodLabel,
} from "@/lib/constants";
import type { OrderChannel, PaymentMethod } from "@/lib/types";

describe("isOwnerRole", () => {
  it("is true for OWNER and MASTER_ADMIN", () => {
    expect(isOwnerRole("OWNER")).toBe(true);
    expect(isOwnerRole("MASTER_ADMIN")).toBe(true);
  });

  it("is false for EMPLOYEE and missing roles", () => {
    expect(isOwnerRole("EMPLOYEE")).toBe(false);
    expect(isOwnerRole(null)).toBe(false);
    expect(isOwnerRole(undefined)).toBe(false);
  });
});

describe("homePathForRole", () => {
  it("sends owners to the dashboard and cashiers to the POS", () => {
    expect(homePathForRole("OWNER")).toBe("/dashboard");
    expect(homePathForRole("MASTER_ADMIN")).toBe("/dashboard");
    expect(homePathForRole("EMPLOYEE")).toBe("/pos");
    expect(homePathForRole(null)).toBe("/pos");
  });
});

describe("channelMeta", () => {
  it("returns the matching channel metadata", () => {
    expect(channelMeta("GRABFOOD")).toMatchObject({ label: "GrabFood", short: "Grab" });
    expect(channelMeta("WHATSAPP")).toMatchObject({ label: "WhatsApp", short: "WA" });
  });

  it("falls back to Dine-In for unknown channels", () => {
    expect(channelMeta("UNKNOWN" as OrderChannel).label).toBe("Dine-In");
  });
});

describe("paymentMethodLabel", () => {
  it("returns Indonesian labels", () => {
    expect(paymentMethodLabel("CASH")).toBe("Cash");
    expect(paymentMethodLabel("QRIS")).toBe("QRIS");
    expect(paymentMethodLabel("E_WALLET")).toBe("E-Wallet");
  });

  it("falls back to the raw value", () => {
    expect(paymentMethodLabel("CRYPTO" as PaymentMethod)).toBe("CRYPTO");
  });
});
