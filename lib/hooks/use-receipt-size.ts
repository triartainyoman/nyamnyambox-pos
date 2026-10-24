"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ReceiptSize = "58" | "80";

const STORAGE_KEY = "nyb-receipt-size";
const CHANGE_EVENT = "nyb-receipt-size-change";

function getSnapshot(): ReceiptSize {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "58" ? "58" : "80";
}

function getServerSnapshot(): ReceiptSize {
  return "80";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/** Remembers the preferred thermal paper width between prints. */
export function useReceiptSize() {
  const size = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateSize = useCallback((next: ReceiptSize) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [size, updateSize] as const;
}
