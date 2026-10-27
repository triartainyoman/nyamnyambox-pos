import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./lib/security";

/**
 * Surface misconfiguration at build/start time. The app still fails safe at
 * runtime (login shows a configuration notice), but a loud warning makes a
 * forgotten env var obvious in Vercel build logs.
 */
if (process.env.NODE_ENV === "production") {
  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.warn(
      `[nyamnyambox] Missing production environment variable(s): ${missing.join(", ")}. ` +
        "Login will show a configuration notice; employee creation and username login will be unavailable.",
    );
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    console.warn(
      "[nyamnyambox] NEXT_PUBLIC_DEMO_MODE is ignored in production builds. Provide Supabase credentials.",
    );
  }
}

const nextConfig: NextConfig = {
  // Tests run their own dev server next to a developer's server. A separate
  // dist dir keeps the Next dev lock from colliding.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The app is fully dynamic (auth + live order data), so we opt out of
  // Cache Components and use the classic dynamic rendering model.
  cacheComponents: false,
  // Static security headers for every response (pages, redirects, assets).
  // The CSP is request-specific (nonce), so it is set in `proxy.ts`.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS.map(({ key, value }) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
