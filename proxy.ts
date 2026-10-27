import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { homePathForRole } from "@/lib/constants";
import { DEMO_COOKIE } from "@/lib/demo/constants";
import {
  isDemoMode,
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/env";
import { buildCsp, createNonce } from "@/lib/security";
import type { Database } from "@/lib/supabase/types";
import type { UserRole } from "@/lib/types";

const PROTECTED_PREFIXES = ["/pos", "/history", "/dashboard", "/products", "/employees"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A fresh nonce per document. Next.js picks it up from the request CSP header
  // and attaches it to its own script tags.
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV !== "production",
    supabaseUrl: SUPABASE_URL,
    secure: request.nextUrl.protocol === "https:",
  });

  const withCsp = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  // Rebuilt on demand so cookies refreshed by Supabase are forwarded to the
  // render. `request.cookies.set` rewrites the request's `cookie` header.
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return withCsp(NextResponse.next({ request: { headers } }));
  };

  const redirectTo = (target: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }
    return withCsp(NextResponse.redirect(url));
  };

  if (isDemoMode) {
    const demoRole = request.cookies.get(DEMO_COOKIE)?.value;

    if (!demoRole && isProtected(pathname)) {
      return redirectTo("/login");
    }

    if (demoRole && pathname === "/login") {
      return redirectTo(homePathForRole(demoRole as UserRole));
    }

    return next();
  }

  if (!isSupabaseConfigured) {
    // Fail safe: without Supabase (and outside explicit demo mode) there is no
    // way to authenticate. Send protected routes to the login screen, which
    // renders a configuration notice instead of a form.
    if (isProtected(pathname)) {
      return redirectTo("/login");
    }

    return next();
  }

  let response = next();

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(pathname)) {
    return redirectTo("/login", pathname !== "/pos" ? { next: pathname } : undefined);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
