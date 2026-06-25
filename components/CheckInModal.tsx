"use client";

import { useEffect, useRef, useState } from "react";

interface CheckInModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: "Terrible",
  2: "Very bad",
  3: "Bad",
  4: "Poor",
  5: "Okay",
  6: "Fine",
  7: "Good",
  8: "Great",
  9: "Excellent",
  10: "Amazing",
};

function moodColor(mood: number): string {
  if (mood <= 3) return "bg-red-500 text-white border-red-500";
  if (mood <= 5) return "bg-amber-400 text-white border-amber-400";
  if (mood <= 7) return "bg-yellow-400 text-stone-800 border-yellow-400";
  return "bg-emerald-500 text-white border-emerald-500";
}

function moodIdleColor(mood: number): string {
  if (mood <= 3) return "border-red-200 text-red-400 hover:bg-red-50";
  if (mood <= 5) return "border-amber-200 text-amber-500 hover:bg-amber-50";
  if (mood <= 7) return "border-yellow-200 text-yellow-600 hover:bg-yellow-50";
  return "border-emerald-200 text-emerald-600 hover:bg-emerald-50";
}

export function CheckInModal({ onClose, onSuccess }: CheckInModalProps) {
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Trap focus inside modal and close on Escape
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mood === null) {
      setError("Please select a mood.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to save check-in");
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-8"
      >
        {/* Close button */}
        <button
          ref={firstButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <h2
          id="checkin-modal-title"
          className="text-xl font-semibold text-stone-900 mb-1"
        >
          How are you feeling?
        </h2>

        {/* Date — read-only, always today */}
        <p className="text-sm text-stone-500 mb-6">{today}</p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Mood picker */}
          <fieldset className="mb-6">
            <legend className="text-sm font-medium text-stone-700 mb-3">
              Mood <span className="text-stone-400 font-normal">(1 = terrible, 10 = amazing)</span>
            </legend>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMood(n)}
                  aria-pressed={mood === n ? "true" : "false"}
                  aria-label={`${n} — ${MOOD_LABELS[n]}`}
                  className={`rounded-lg border-2 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 ${
                    mood === n
                      ? moodColor(n)
                      : `bg-white ${moodIdleColor(n)}`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {mood !== null && (
              <p className="mt-2 text-sm text-stone-500">
                {mood} — {MOOD_LABELS[mood]}
              </p>
            )}
          </fieldset>

          {/* Notes */}
          <div className="mb-6">
            <label
              htmlFor="checkin-notes"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              Notes <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="checkin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What's on your mind?"
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 resize-none transition"
            />
          </div>

          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || mood === null}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
            >
              {submitting ? "Saving…" : "Save check-in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
