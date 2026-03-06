import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // signOut can throw on Vercel (AuthSessionMissingError, cookie issues).
    // Always redirect so user isn't stuck with a 500.
  }
  return NextResponse.redirect(loginUrl, { status: 302 });
}
