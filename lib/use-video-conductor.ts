"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const DEBUG_CONDUCTOR = false;
const log = DEBUG_CONDUCTOR ? (...args: unknown[]) => console.log("[conductor]", ...args) : () => {};

export interface VideoConductorThreshold {
  seconds: number;
  callback: () => void;
}

export interface UseVideoConductorOptions {
  onReady?: () => void;
  onPlaying?: () => void;
  thresholds: VideoConductorThreshold[];
  /** When false, the conductor does not attach. Use when video is conditionally mounted. */
  enabled?: boolean;
}

/**
 * Makes a video the "conductor" for time-based events. Phase transitions fire
 * when video.currentTime crosses thresholds—resilient to load times and buffering.
 * Call start() when ready to play (e.g. after a lead-in fade).
 */
export function useVideoConductor(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseVideoConductorOptions
) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const firedRef = useRef<Set<number>>(new Set());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const start = useCallback(() => {
    videoRef.current?.play();
  }, [videoRef]);

  useEffect(() => {
    if (options.enabled === false) return;
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlayThrough = () => {
      log("canplaythrough");
      setIsReady(true);
      optionsRef.current.onReady?.();
    };

    const handlePlaying = () => {
      log("playing");
      setIsPlaying(true);
      optionsRef.current.onPlaying?.();
    };

    const handleTimeUpdate = () => {
      if (video.paused) return;
      const t = video.currentTime;
      const { thresholds } = optionsRef.current;
      thresholds.forEach(({ seconds, callback }, i) => {
        if (!firedRef.current.has(i) && t >= seconds) {
          firedRef.current.add(i);
          log("threshold", i, seconds, "at", t.toFixed(2));
          callback();
        }
      });
    };

    video.addEventListener("canplaythrough", handleCanPlayThrough);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("timeupdate", handleTimeUpdate);

    if (video.readyState >= 4) {
      log("already ready, readyState=", video.readyState);
      handleCanPlayThrough();
    }

    return () => {
      log("cleanup");
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [options.enabled]);

  return { isReady, isPlaying, start };
}
