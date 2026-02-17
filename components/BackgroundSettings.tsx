"use client";

import { useState, useCallback, useEffect } from "react";
import { refreshBackgrounds } from "@/lib/use-backgrounds";

export function BackgroundSettings() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasCustom, setHasCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/background")
      .then((r) => r.json())
      .then((data: { url: string | null }) => setHasCustom(!!data.url))
      .catch(() => {});
  }, [success]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setSuccess(false);
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (JPEG, PNG, WebP, or GIF)");
        return;
      }
      setLoading(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const res = await fetch("/api/background", {
          method: "POST",
          body: formData,
        });
        let data: { error?: string };
        try {
          data = await res.json();
        } catch {
          throw new Error(res.status === 413 ? "File too large" : "Server error");
        }
        if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
        setSuccess(true);
        refreshBackgrounds();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    },
    []
  );

  const handleClear = useCallback(async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/background", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSuccess(true);
      setHasCustom(false);
      refreshBackgrounds();
    } catch {
      setError("Failed to remove background");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="mt-8 pt-6 border-t border-stone-200">
      <h2 className="text-lg font-medium text-stone-800 mb-2">
        Custom background
      </h2>
      <p className="text-stone-600 text-sm mb-3">
        Upload your own image. Max 4MB.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <label
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition inline-block ${
            loading
              ? "bg-stone-300 text-stone-500 cursor-not-allowed"
              : "bg-stone-700 text-white hover:bg-stone-800"
          }`}
        >
          {loading ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />
        </label>
        {hasCustom && (
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-100 disabled:opacity-50 transition"
          >
            Remove custom
          </button>
        )}
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {success && (
        <p className="text-emerald-600 text-sm mt-2">
          Background saved. It will appear in the rotation.
        </p>
      )}
    </section>
  );
}
