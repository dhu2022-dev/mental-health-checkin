"use client";

import { useState, useCallback, useEffect } from "react";
import { refreshBackgrounds } from "@/lib/use-backgrounds";
import { useBackgroundContext } from "@/lib/background-context";
import { ImageCropModal } from "@/components/ImageCropModal";

type CustomBg = { id: string; value: string; displayName?: string | null };

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export function BackgroundSettings() {
  const bgContext = useBackgroundContext();
  const [error, setError] = useState<string | null>(null);
  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBg[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const fetchCustom = useCallback(() => {
    fetch("/api/background")
      .then((r) => r.json())
        .then((data: { backgrounds?: { id: string; value: string; displayName?: string | null }[] }) => {
        setCustomBackgrounds(data.backgrounds ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCustom();
  }, [fetchCustom]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (JPEG, PNG, WebP, or GIF)");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File too large. Max 4MB.");
        e.target.value = "";
        return;
      }
      setCropFile(file);
      e.target.value = "";
    },
    []
  );

  const handleCropConfirm = useCallback(
    async (blob: Blob) => {
      const fileToCrop = cropFile;
      if (!fileToCrop) return;
      setCropFile(null);
      setLoading(true);
      setError(null);
      try {
        const file = new File([blob], fileToCrop.name.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: "image/jpeg",
        });
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
        refreshBackgrounds();
        fetchCustom();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [cropFile, fetchCustom]
  );

  const handleCropCancel = useCallback(() => {
    setCropFile(null);
  }, []);

  const handleRemove = useCallback(async (clientId: string) => {
    const uuid = clientId.startsWith("custom_") ? clientId.slice(7) : clientId;
    if (!uuid) return;
    setError(null);
    setRemovingId(clientId);
    try {
      const res = await fetch(`/api/background?id=${encodeURIComponent(uuid)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setCustomBackgrounds((prev) => prev.filter((b) => b.id !== clientId));
      refreshBackgrounds();
      fetchCustom();
    } catch {
      setError("Failed to remove background");
    } finally {
      setRemovingId(null);
    }
  }, [fetchCustom]);

  const currentBgId = bgContext?.currentBgId ?? null;
  let visibleBackgrounds: CustomBg[];
  if (showAll) {
    visibleBackgrounds = customBackgrounds;
  } else {
    const matched = customBackgrounds.filter((b) => b.id === currentBgId);
    visibleBackgrounds =
      matched.length > 0
        ? matched
        : customBackgrounds.length > 0
          ? [customBackgrounds[0]]
          : [];
  }

  return (
    <section>
      <h2 className="text-lg font-medium text-stone-800 mb-2">
        Background gallery
      </h2>
      <p className="text-stone-600 text-sm mb-3">
        Choose a background or upload your own (max 4MB). Use a landscape image—you&apos;ll crop it to 16:9 before upload.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <label
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition inline-block ${
            loading || cropFile
              ? "bg-stone-300 text-stone-500 cursor-not-allowed"
              : "bg-stone-700 text-white hover:bg-stone-800"
          }`}
        >
          {loading ? "Uploading…" : cropFile ? "Crop your image…" : "Upload image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={loading || !!cropFile}
            className="hidden"
          />
        </label>
      </div>
      {customBackgrounds.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2">
            {visibleBackgrounds.map((bg) => {
              const isSelected = bgContext?.currentBgId === bg.id;
              const setBg = () =>
                bgContext?.setBackground({
                  id: bg.id,
                  type: "image",
                  value: bg.value,
                  overlay: 0.35,
                });
              return (
                <li
                  key={bg.id}
                  {...(bgContext && {
                    role: "button",
                    tabIndex: 0,
                    onClick: setBg,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setBg();
                      }
                    },
                  })}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                    bgContext
                      ? "cursor-pointer hover:bg-stone-100"
                      : ""
                  } ${
                    isSelected
                      ? "bg-stone-100 border-stone-400 ring-1 ring-stone-300"
                      : "bg-stone-50 border-stone-200"
                  }`}
                >
                  <div
                    className="w-16 h-10 rounded bg-stone-200 bg-cover bg-center flex-shrink-0"
                    style={{ backgroundImage: `url(${bg.value})` }}
                  />
                  <span className="text-stone-600 text-sm flex-1 truncate">
                    {bg.displayName || "Custom image"}
                  </span>
                  {isSelected && (
                    <span className="text-stone-500 text-xs" aria-hidden>
                      Selected
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(bg.id);
                    }}
                    disabled={loading || removingId === bg.id}
                    className="px-3 py-1 rounded text-sm text-stone-600 hover:bg-stone-200 disabled:opacity-50 transition"
                  >
                    {removingId === bg.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              );
            })}
          </ul>
          {customBackgrounds.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-2 text-sm text-stone-500 hover:text-stone-700 transition"
            >
              {showAll ? "Show less" : `View all (${customBackgrounds.length})`}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </section>
  );
}
