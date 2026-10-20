/** Bildbearbeitung für Icons: Verkleinern vor dem Speichern, Weiß transparent machen. */

/** Größte gespeicherte Kantenlänge für Rasterbilder; Kacheln sind höchstens 160 px groß. */
export const MAX_STORED_EDGE = 256;

async function canvasToPng(canvas: OffscreenCanvas): Promise<Blob> {
  return canvas.convertToBlob({ type: 'image/png' });
}

/** Verkleinert große Rasterbilder auf MAX_STORED_EDGE; Vektoren und kleine Bilder bleiben wie sie sind. */
export async function shrinkForStorage(blob: Blob, vector: boolean): Promise<Blob> {
  if (vector) return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const edge = Math.max(bitmap.width, bitmap.height);
    if (edge <= MAX_STORED_EDGE) {
      bitmap.close();
      return blob;
    }
    const scale = MAX_STORED_EDGE / edge;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await canvasToPng(canvas);
  } catch {
    return blob;
  }
}

/** Lädt ein beliebiges Bild (auch SVG) als Bitmap; SVG wird dabei gerastert. */
async function toBitmap(blob: Blob, edgeForVector: number): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img, { resizeWidth: edgeForVector, resizeHeight: edgeForVector, resizeQuality: 'high' });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Macht nahezu weiße Pixel transparent. threshold 200..255: alle drei Farbkanäle müssen
 * mindestens so hell sein. Der Rand wird weich ausgeblendet, damit keine Treppen entstehen.
 */
export async function removeWhite(blob: Blob, threshold: number): Promise<Blob> {
  const bitmap = await toBitmap(blob, MAX_STORED_EDGE);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const soft = Math.max(1, 255 - threshold);
  for (let i = 0; i < data.length; i += 4) {
    const minChannel = Math.min(data[i]!, data[i + 1]!, data[i + 2]!);
    if (minChannel >= threshold) {
      data[i + 3] = 0;
    } else if (minChannel >= threshold - soft) {
      const keep = (threshold - minChannel) / soft;
      data[i + 3] = Math.round(data[i + 3]! * keep);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvasToPng(canvas);
}
