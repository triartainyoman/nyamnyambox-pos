import { describe, expect, it } from "vitest";

import {
  CONFIG_ERROR,
  DUPLICATE_ERROR,
  GENERIC_ERROR,
  INVALID_DATA_ERROR,
  NETWORK_ERROR,
  NOT_FOUND_ERROR,
  PERMISSION_ERROR,
  SESSION_ERROR,
  TIMEOUT_ERROR,
  UNAVAILABLE_ERROR,
  UserFacingError,
  friendlyError,
} from "@/lib/errors";

describe("friendlyError", () => {
  it("passes UserFacingError messages through", () => {
    expect(friendlyError(new UserFacingError("Pesanan tidak ditemukan"))).toBe(
      "Pesanan tidak ditemukan",
    );
  });

  it("passes whitelisted business messages through", () => {
    expect(friendlyError("Keranjang pesanan kosong")).toBe("Keranjang pesanan kosong");
    expect(friendlyError({ message: "Transaksi hanya dapat diedit pada hari yang sama" })).toBe(
      "Transaksi hanya dapat diedit pada hari yang sama",
    );
  });

  it("passes whitelisted product-availability messages with an identifier", () => {
    const message = "Produk tidak tersedia: 9cd3656b-26e5-421d-9796-1352434dbadb";
    expect(friendlyError(message)).toBe(message);
  });

  it("rejects a product message with an oversized suffix", () => {
    expect(friendlyError(`Produk tidak tersedia: ${"x".repeat(100)}`)).toBe(GENERIC_ERROR);
  });

  it("rejects unknown strings and uses the fallback", () => {
    expect(friendlyError("relation public.orders does not exist")).toBe(GENERIC_ERROR);
    expect(friendlyError("boom", "Gagal memuat data.")).toBe("Gagal memuat data.");
  });

  it("rejects non-object values", () => {
    expect(friendlyError(null)).toBe(GENERIC_ERROR);
    expect(friendlyError(undefined)).toBe(GENERIC_ERROR);
    expect(friendlyError(42)).toBe(GENERIC_ERROR);
    expect(friendlyError(true)).toBe(GENERIC_ERROR);
  });

  it.each([
    [{ code: "PGRST301" }, SESSION_ERROR],
    [{ code: "PGRST302" }, SESSION_ERROR],
    [{ status: 401 }, SESSION_ERROR],
    [{ message: "JWT expired" }, SESSION_ERROR],
    [{ message: "Auth session missing!" }, SESSION_ERROR],
  ])("maps session errors (%o)", (error, expected) => {
    expect(friendlyError(error)).toBe(expected);
  });

  it.each([
    [{ code: "42501" }, PERMISSION_ERROR],
    [{ message: "new row violates row-level security policy" }, PERMISSION_ERROR],
    [{ code: "23505" }, DUPLICATE_ERROR],
    [{ code: "23503" }, NOT_FOUND_ERROR],
    [{ code: "PGRST116" }, NOT_FOUND_ERROR],
    [{ code: "23514" }, INVALID_DATA_ERROR],
    [{ code: "22001" }, INVALID_DATA_ERROR],
    [{ code: "22P02" }, INVALID_DATA_ERROR],
    [{ code: "22003" }, INVALID_DATA_ERROR],
    [{ code: "42P01" }, CONFIG_ERROR],
    [{ code: "42703" }, CONFIG_ERROR],
    [{ code: "42883" }, CONFIG_ERROR],
    [{ code: "PGRST202" }, CONFIG_ERROR],
    [{ code: "57014" }, TIMEOUT_ERROR],
    [{ status: 500 }, UNAVAILABLE_ERROR],
    [{ status: 503 }, UNAVAILABLE_ERROR],
  ])("maps infrastructure errors (%o)", (error, expected) => {
    expect(friendlyError(error)).toBe(expected);
  });

  it.each([
    "Failed to fetch",
    "NetworkError when attempting to fetch resource",
    "Load failed",
    "fetch failed",
    "net::ERR_INTERNET_DISCONNECTED",
  ])("maps network failures (%s)", (message) => {
    expect(friendlyError({ message })).toBe(NETWORK_ERROR);
  });

  it("never leaks raw Postgres details", () => {
    const raw = {
      code: "23502",
      message: 'null value in column "receipt_number" of relation "orders" violates not-null constraint',
      details: "Failing row contains (…)",
      hint: "Grant the required privileges to the current role with: GRANT INSERT ON public.orders",
    };
    const message = friendlyError(raw, "Gagal menyimpan transaksi.");
    expect(message).toBe("Gagal menyimpan transaksi.");
    expect(message).not.toMatch(/receipt_number|orders|GRANT|relation/i);
  });

  it("ignores a message longer than the safe limit", () => {
    const long = "A".repeat(181);
    expect(friendlyError(long)).toBe(GENERIC_ERROR);
  });

  it("prefers explicit Postgres codes over a whitelisted message", () => {
    expect(friendlyError({ code: "42501", message: "Akses ditolak" })).toBe(PERMISSION_ERROR);
  });

  it("handles a Supabase-style error object with a status and a safe message", () => {
    expect(friendlyError({ code: "", status: 400, message: "Pesanan tidak ditemukan" })).toBe(
      "Pesanan tidak ditemukan",
    );
  });
});
