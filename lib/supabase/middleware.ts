import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/**
 * Middleware only refreshes the session (updates cookies if needed).
 * Auth redirects are handled by layouts (app/(auth)/layout.tsx and app/login/layout.tsx)
 * which run in Node runtime where cookies() works.
 * On Vercel Edge, request.cookies can be empty, so we don't rely on middleware for auth.
 */
export async function updateSession(request: NextRequest) {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseEnv();

  let response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if needed (updates cookies)
  await supabase.auth.getUser();

  return response;
}
