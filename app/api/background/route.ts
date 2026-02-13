import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

const BUCKET = "backgrounds";
const SETTINGS_KEY = "custom_background";
const MAX_SIZE = 4 * 1024 * 1024; // 4MB (Vercel serverless body limit ~4.5MB)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ url: null });
  }
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    const url = (data?.value as { url?: string } | null)?.url ?? null;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `custom.${ext}`;

    // Convert to ArrayBuffer for reliable upload in serverless (FormData File can be quirky)
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await supabase
      .from("app_settings")
      .upsert(
        {
          key: SETTINGS_KEY,
          value: { url: publicUrl },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    const err = e as { message?: string; error?: string };
    const msg = err?.message ?? err?.error ?? "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }
  try {
    const { data: row } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    const url = (row?.value as { url?: string } | null)?.url;
    if (url) {
      const path = url.split("/").pop() || "custom.png";
      await supabase.storage.from(BUCKET).remove([path]);
    }
    await supabase.from("app_settings").delete().eq("key", SETTINGS_KEY);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
