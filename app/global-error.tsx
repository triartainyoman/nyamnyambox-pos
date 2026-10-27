"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/client-logging";
import { friendlyError } from "@/lib/errors";

/**
 * Last-resort boundary for errors thrown in the root layout. It replaces the
 * whole document, so it must define <html>/<body> and cannot rely on the
 * app's global CSS. Styles are intentionally inline.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "global-error");
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffaf5",
          color: "#1c1917",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          padding: "24px",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#ffffff",
            border: "1px solid #e7e5e4",
            borderRadius: "24px",
            padding: "24px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(28, 25, 23, 0.08)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: "22px",
              fontWeight: 800,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
            Aplikasi gagal dimuat
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#78716c" }}>
            Terjadi kesalahan tak terduga. Muat ulang halaman untuk melanjutkan.
          </p>
          <p
            style={{
              margin: "14px 0 0",
              padding: "8px 12px",
              borderRadius: "12px",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {friendlyError(error)}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "18px",
              width: "100%",
              height: "44px",
              border: 0,
              borderRadius: "12px",
              background: "#ea580c",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
