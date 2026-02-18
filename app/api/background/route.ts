import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/db";

const BUCKET = "backgrounds";
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const SETTINGS_KEY = "custom_background";
const ZEN_SETTINGS_KEY = "zen_background";
const MAX_SIZE = 4 * 1024 * 1024; // 4MB (Vercel serverless body limit ~4.5MB)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const INK_GRADIENT = {
  id: "ink",
  type: "gradient" as const,
  value: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
  overlay: 0.3,
};

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      backgrounds: [INK_GRADIENT],
      hasFetched: true,
    });
  }
  try {
    const { data: rows } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [SETTINGS_KEY, ZEN_SETTINGS_KEY]);

    const byKey = new Map((rows ?? []).map((r) => [r.key, r.value]));
    const customUrl = (byKey.get(SETTINGS_KEY) as { url?: string } | null)?.url ?? null;
    const zenUrl = (byKey.get(ZEN_SETTINGS_KEY) as { url?: string } | null)?.url ?? null;

    const backgrounds = [
      INK_GRADIENT,
      ...(zenUrl
        ? [
            {
              id: "zen",
              type: "image" as const,
              value: zenUrl,
              overlay: 0.4,
            },
          ]
        : []),
      ...(customUrl
        ? [
            {
              id: "custom",
              type: "image" as const,
              value: customUrl,
              overlay: 0.35,
            },
          ]
        : []),
    ];

    return NextResponse.json({ backgrounds, hasFetched: true });
  } catch {
    return NextResponse.json({
      backgrounds: [INK_GRADIENT],
      hasFetched: true,
    });
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
        { error: "File too large (max 4MB)" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
    // Crop and resize to consistent 16:9 so backgrounds display uniformly (no random zoom/blur)
    const buffer = await file.arrayBuffer();
    const processed = await sharp(Buffer.from(buffer))
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "cover", position: "center" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const path = "custom.jpg";
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, processed, { upsert: true, contentType: "image/jpeg" });
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
