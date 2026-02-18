import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/db";

const BUCKET = "backgrounds";
const ZEN_SETTINGS_KEY = "zen_background";
const ZEN_SOURCE_URL =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80";
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

/** One-time seed: fetch mountain image from Unsplash, upload to Supabase, store URL in app_settings */
export async function POST() {
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }
  try {
    const res = await fetch(ZEN_SOURCE_URL);
    if (!res.ok) throw new Error("Failed to fetch source image");
    const buffer = await res.arrayBuffer();
    const processed = await sharp(Buffer.from(buffer))
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "cover", position: "center" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const path = "zen.jpg";
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
          key: ZEN_SETTINGS_KEY,
          value: { url: publicUrl },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    const err = e as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Seed failed" },
      { status: 500 }
    );
  }
}
