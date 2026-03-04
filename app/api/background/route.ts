import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/db";
import { randomUUID } from "crypto";

const BUCKET = "backgrounds";
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const MAX_SIZE = 4 * 1024 * 1024; // 4MB (Vercel serverless body limit ~4.5MB)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      backgrounds: [],
      hasFetched: true,
    });
  }
  try {
    const { data: rows } = await supabase
      .from("background_images")
      .select("id, storage_path, display_name, created_at")
      .order("created_at", { ascending: false });

    const sorted =
      rows?.sort((a, b) => {
        if (a.storage_path === "zen.jpg") return -1;
        if (b.storage_path === "zen.jpg") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }) ?? [];

    const backgrounds = sorted.map((row) => {
      const publicUrl = supabase!.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl;
      return {
        id: `custom_${row.id}`,
        type: "image" as const,
        value: publicUrl,
        overlay: row.storage_path === "zen.jpg" ? 0.4 : 0.35,
        displayName: row.display_name ?? null,
      };
    });

    return NextResponse.json({ backgrounds, hasFetched: true });
  } catch {
    return NextResponse.json({
      backgrounds: [],
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
    const buffer = await file.arrayBuffer();
    const processed = await sharp(Buffer.from(buffer))
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "cover", position: "center" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const path = `custom_${randomUUID().slice(0, 8)}.jpg`;
    const displayName = file.name.replace(/\.[^/.]+$/, "").trim() || null;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, processed, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: row, error: insertError } = await supabase
      .from("background_images")
      .insert({ storage_path: path, display_name: displayName })
      .select("id")
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({ id: row.id, url: publicUrl });
  } catch (e) {
    const err = e as { message?: string; error?: string };
    const msg = err?.message ?? err?.error ?? "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }
  try {
    const { data: row, error: fetchError } = await supabase
      .from("background_images")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!row) {
      return NextResponse.json({ error: "Background not found" }, { status: 404 });
    }
    await supabase.storage.from(BUCKET).remove([row.storage_path]);
    await supabase.from("background_images").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
