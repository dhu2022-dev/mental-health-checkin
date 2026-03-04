import type { PixelCrop } from "react-image-crop";

/**
 * Produces a JPEG blob from the cropped region of an image.
 * Accounts for scaling when displayed size differs from natural dimensions.
 */
export async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  quality = 0.9
): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const x = Math.max(0, crop.x * scaleX);
  const y = Math.max(0, crop.y * scaleY);
  const w = Math.min(image.naturalWidth - x, crop.width * scaleX);
  const h = Math.min(image.naturalHeight - y, crop.height * scaleY);

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(w);
  canvas.height = Math.floor(h);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context not available");

  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}
