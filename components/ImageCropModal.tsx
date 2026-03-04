"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { getCroppedImg } from "@/lib/crop-image";

const ASPECT = 16 / 9;

type Props = {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
};

function isPortrait(width: number, height: number): boolean {
  return height > width * 1.2;
}

export function ImageCropModal({ file, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState<Crop>();
  const [imgSrc, setImgSrc] = useState<string>("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const updatePreview = useCallback(
    (c: PixelCrop) => {
      if (!imgRef.current || !c.width || !c.height) {
        setPreviewSrc(null);
        return;
      }
      const canvas = document.createElement("canvas");
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = Math.floor(c.width * scaleX);
      canvas.height = Math.floor(c.height * scaleY);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(
        imgRef.current,
        c.x * scaleX,
        c.y * scaleY,
        c.width * scaleX,
        c.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewSrc(dataUrl);
    },
    []
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      const { width, height } = el;
      const crop = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, ASPECT, width, height),
        width,
        height
      );
      setCrop(crop);
      const pixelCrop = convertToPixelCrop(crop, width, height);
      updatePreview(pixelCrop);
    },
    [updatePreview]
  );

  const handleConfirm = useCallback(async () => {
    if (!crop || !imgRef.current || !crop.width || !crop.height) return;
    const pixelCrop = convertToPixelCrop(
      crop,
      imgRef.current.width,
      imgRef.current.height
    );
    const blob = await getCroppedImg(
      imgRef.current,
      pixelCrop,
      file.name.replace(/\.[^/.]+$/, "") + ".jpg"
    );
    onConfirm(blob);
  }, [crop, file.name, onConfirm]);

  const handleChange = useCallback((_pixelCrop: PixelCrop, percentCrop: Crop) => {
    setCrop(percentCrop);
  }, []);

  const handleComplete = useCallback(
    (pixelCrop: PixelCrop) => {
      if (pixelCrop.width && pixelCrop.height) updatePreview(pixelCrop);
    },
    [updatePreview]
  );

  const [portraitWarning, setPortraitWarning] = useState(false);
  useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.onload = () => {
      setPortraitWarning(isPortrait(img.naturalWidth, img.naturalHeight));
    };
    img.src = imgSrc;
  }, [imgSrc]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-modal-title"
      >
        <div className="p-4 border-b border-stone-200">
          <h2 id="crop-modal-title" className="text-lg font-medium text-stone-800">
            Choose the area for your background (16:9)
          </h2>
          {portraitWarning && (
            <p className="text-amber-600 text-sm mt-1">
              Portrait images will use a narrow strip. Landscape photos work best.
            </p>
          )}
        </div>
        <div className="p-4">
          <div className="max-h-[50vh] overflow-auto flex justify-center bg-stone-100 rounded-lg">
            {imgSrc ? (
              <ReactCrop
                crop={crop}
                onChange={handleChange}
                onComplete={handleComplete}
                aspect={ASPECT}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  style={{ maxHeight: "50vh", width: "auto" }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            ) : (
              <div className="flex items-center justify-center py-12 text-stone-500 text-sm">
                Loading image…
              </div>
            )}
          </div>
          {previewSrc && (
            <div className="mt-4">
              <p className="text-stone-500 text-sm mb-2">Preview</p>
              <img
                src={previewSrc}
                alt="Cropped preview"
                className="w-48 aspect-video object-cover rounded-lg border border-stone-200"
              />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-stone-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!crop}
            className="px-4 py-2 rounded-lg bg-stone-700 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
