/**
 * Security headers and the Content Security Policy.
 *
 * The static headers are applied to every response by `next.config.ts`. The CSP
 * is built per request in `proxy.ts` because production uses a nonce, and a
 * nonce must be unique for every document.
 */

export interface HeaderPair {
  key: string;
  value: string;
}

/**
 * Headers that do not depend on the request. HSTS is ignored on plain HTTP
 * (local dev), so shipping it unconditionally is safe.
 */
export const SECURITY_HEADERS: HeaderPair[] = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

export function createNonce() {
  // 16 random bytes, base64. `btoa` keeps this usable from any runtime.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function realtimeOrigin(url: string) {
  if (!url) return "";
  try {
    return new URL(url).origin.replace(/^http/, "ws");
  } catch {
    return "";
  }
}

/**
 * Builds the CSP for one request.
 *
 * - Production uses a nonce plus `strict-dynamic` so only scripts loaded by a
 *   nonced script run. Next.js reads the nonce from this header and attaches it
 *   to its own script tags automatically.
 * - Development is more permissive: Turbopack's HMR runtime injects inline
 *   scripts and uses `eval`, and the dev CSP must not block them.
 * - `style-src` keeps `'unsafe-inline'` in both modes: Radix and Recharts set
 *   inline `style` attributes, which a nonce cannot cover.
 */
export function buildCsp({
  nonce,
  dev,
  supabaseUrl,
  secure,
}: {
  nonce: string;
  dev: boolean;
  supabaseUrl: string;
  /** True when the document itself is served over HTTPS. */
  secure: boolean;
}) {
  const supabaseOrigin = supabaseUrl ? safeOrigin(supabaseUrl) : "";
  const supabaseWs = realtimeOrigin(supabaseUrl);

  const scriptSrc = dev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];

  const connectSrc = ["'self'", supabaseOrigin, supabaseWs].filter(Boolean);
  if (dev) connectSrc.push("ws:", "wss:");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    // Owners can paste any https image URL in the product form.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (secure && !dev) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}
