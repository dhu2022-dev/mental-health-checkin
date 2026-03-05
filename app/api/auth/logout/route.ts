import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl, { status: 302 });
}
