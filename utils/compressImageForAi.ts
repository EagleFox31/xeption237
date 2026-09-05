/** Réduit la taille des images avant envoi à Gemini (quota + latence). */

const DEFAULT_MAX_SIDE = 1024;
const DEFAULT_QUALITY = 0.82;

export async function compressFileForAiVision(
  file: File,
  maxSide = DEFAULT_MAX_SIDE,
  quality = DEFAULT_QUALITY,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxSide && file.size <= 400_000) {
      return file;
    }

    const scale = Math.min(1, maxSide / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export async function compressFilesForAiVision(
  files: File[],
  maxSide = DEFAULT_MAX_SIDE,
): Promise<File[]> {
  return Promise.all(files.map((file) => compressFileForAiVision(file, maxSide)));
}
