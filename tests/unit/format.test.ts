import { afterEach, describe, expect, it, vi } from "vitest";

import {
  businessDayRange,
  formatDate,
  formatMonthLabel,
  formatNumber,
  formatRupiah,
  formatTime,
  initials,
  normalizePhone,
  toBusinessDate,
  todayLabel,
} from "@/lib/utils";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatRupiah", () => {
  it("formats whole amounts with Indonesian separators", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(20_000)).toBe("Rp 20.000");
    expect(formatRupiah(1_234_567)).toBe("Rp 1.234.567");
  });

  it("treats null/undefined as zero", () => {
    expect(formatRupiah(null)).toBe("Rp 0");
    expect(formatRupiah(undefined)).toBe("Rp 0");
  });
});

describe("formatNumber", () => {
  it("formats numbers with Indonesian separators", () => {
    expect(formatNumber(1_234_567)).toBe("1.234.567");
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Nyoman Triarta")).toBe("NT");
  });

  it("ignores extra spaces and handles a single word", () => {
    expect(initials("  Rizky   Pagi  ")).toBe("RP");
    expect(initials("Rizky")).toBe("R");
  });

  it("returns an empty string for an empty name", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });
});

describe("normalizePhone", () => {
  it("converts a local 0-prefixed number to 62", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
  });

  it("keeps an existing 62 prefix", () => {
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
  });

  it("strips punctuation and keeps other numbers as-is", () => {
    expect(normalizePhone("(0812) 3456 7890")).toBe("6281234567890");
    expect(normalizePhone("812.3456.7890")).toBe("81234567890");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
    expect(normalizePhone("abc")).toBe("");
  });
});

describe("toBusinessDate", () => {
  it("uses the Asia/Jakarta calendar day, not UTC", () => {
    expect(toBusinessDate("2026-10-24T16:59:59.000Z")).toBe("2026-10-24");
    expect(toBusinessDate("2026-10-24T17:00:00.000Z")).toBe("2026-10-25");
  });

  it("accepts a Date instance", () => {
    expect(toBusinessDate(new Date("2026-10-24T18:12:37.000Z"))).toBe("2026-10-25");
  });
});

describe("businessDayRange", () => {
  it("returns an inclusive start / exclusive end in UTC", () => {
    expect(businessDayRange("2026-10-25")).toEqual({
      startISO: "2026-10-24T17:00:00.000Z",
      endISO: "2026-10-25T17:00:00.000Z",
    });
  });

  it("covers exactly 24 hours across month boundaries", () => {
    const { startISO, endISO } = businessDayRange("2026-10-31");
    expect(new Date(endISO).getTime() - new Date(startISO).getTime()).toBe(24 * 60 * 60 * 1000);
    expect(toBusinessDate(endISO)).toBe("2026-11-01");
  });
});

describe("Jakarta date formatting", () => {
  it("formats date and time in Asia/Jakarta", () => {
    expect(formatDate("2026-10-24T18:12:37.000Z")).toBe("25 Okt 2026, 01.12");
    expect(formatDate("2026-10-24T18:12:37.000Z", false)).toBe("25 Okt 2026");
    expect(formatTime("2026-10-24T18:12:37.000Z")).toBe("01.12");
  });

  it("formats a YYYY-MM month label", () => {
    expect(formatMonthLabel("2026-10")).toBe("Okt 26");
    expect(formatMonthLabel("2026-01")).toBe("Jan 26");
  });

  it("labels today using the Jakarta weekday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-24T18:00:00.000Z"));
    expect(todayLabel()).toBe("Minggu, 25 Oktober 2026");
  });
});
