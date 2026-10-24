import { afterEach, describe, expect, it, vi } from "vitest";

import { currentDayRange, dayRangeFromDate, isOrderPaid } from "@/lib/data/date";

afterEach(() => {
  vi.useRealTimers();
});

describe("dayRangeFromDate", () => {
  it("delegates to the Jakarta business-day range", () => {
    expect(dayRangeFromDate("2026-10-25")).toEqual({
      startISO: "2026-10-24T17:00:00.000Z",
      endISO: "2026-10-25T17:00:00.000Z",
    });
  });
});

describe("currentDayRange", () => {
  it("uses the current Jakarta day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-24T18:00:00.000Z"));
    expect(currentDayRange()).toEqual({
      startISO: "2026-10-24T17:00:00.000Z",
      endISO: "2026-10-25T17:00:00.000Z",
    });
  });
});

describe("isOrderPaid", () => {
  it("is true only for LUNAS", () => {
    expect(isOrderPaid({ payment_status: "LUNAS" })).toBe(true);
    expect(isOrderPaid({ payment_status: "BELUM_LUNAS" })).toBe(false);
  });
});
