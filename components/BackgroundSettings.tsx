"use client";

import { useState, useCallback, useEffect } from "react";
import {
  setCustomBackground,
  clearCustomBackground,
  getCustomBackground,
} from "@/lib/home-backgrounds";

const MAX_DATA_URL_BYTES = 1.5 * 1024 * 1024; // ~1.5MB to stay under typical 5MB localStorage

export function BackgroundSettings() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    setHasCustom(!!getCustomBackground());
  }, [success]);

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);
      const trimmed = url.trim();
      if (!trimmed) {
        setError("Enter an image URL");
        return;
      }
      // Basic URL check
      try {
        new URL(trimmed);
      } catch {
        setError("Invalid URL");
        return;
      }
      setCustomBackground(trimmed);
      setSuccess(true);
      setUrl("");
    },
    [url]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setSuccess(false);
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (JPEG, PNG, etc.)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        if (data.length > MAX_DATA_URL_BYTES) {
          setError(
            "Image is too large for local storage. Try a smaller file or use a URL to a hosted image."
          );
          return;
        }
        setCustomBackground(data);
        setSuccess(true);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    []
  );

  const handleClear = useCallback(() => {
    clearCustomBackground();
    setSuccess(true);
    setError(null);
    setUrl("");
    window.dispatchEvent(new Event("storage"));
    // Force re-render; custom is stored so component will update on next render
    window.location.reload();
  }, []);

  return (
    <section className="mt-8 pt-6 border-t border-stone-200">
      <h2 className="text-lg font-medium text-stone-800 mb-2">
        Custom background
      </h2>
      <p className="text-stone-600 text-sm mb-3">
        Add your own image (e.g. Vagabond fan art). Paste a URL or upload a file.
        Stored locally—refresh to see it in the rotation.
      </p>
      <form onSubmit={handleUrlSubmit} className="flex flex-wrap gap-2 mb-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-stone-300 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-stone-700 text-white text-sm font-medium hover:bg-stone-800 transition"
        >
          Add URL
        </button>
      </form>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="px-4 py-2 rounded-lg bg-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-300 cursor-pointer transition inline-block">
          Upload image
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {hasCustom && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-100 transition"
          >
            Remove custom
          </button>
        )}
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {success && (
        <p className="text-emerald-600 text-sm mt-2">
          Background saved. Refresh the page to see it.
        </p>
      )}
    </section>
  );
}
