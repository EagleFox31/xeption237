import { supabase } from './supabaseClient';
import { STORAGE_VARIANT_WIDTHS } from '../utils/mediaOptimization';


const WEBP_QUALITY = 0.85;
const MAX_SIDE = 2048;

// Photos de troc : 1600 px suffisent à l'expertise et tiennent sous le plafond de 2 Mo.
const TROC_MAX_SIDE = 1600;
const TROC_MAX_BYTES = 2 * 1024 * 1024;

type StorageFolder = 'products' | 'trocs';

/** Étape d'un envoi vers Trigenys Storage qui a échoué : permet un message précis et un diagnostic. */
export type StorageUploadErrorCode =
  | 'format'
  | 'decode'
  | 'webp'
  | 'too_large'
  | 'rate_limited'
  | 'authorization'
  | 'network'
  | 'upload';

export class StorageUploadError extends Error {
  constructor(public readonly code: StorageUploadErrorCode, message: string) {
    super(message);
    this.name = 'StorageUploadError';
  }
}

const TROC_UPLOAD_MESSAGES: Record<StorageUploadErrorCode, string> = {
  format: "ce format de photo n'est pas pris en charge. Reprenez la photo avec l'appareil photo.",
  decode: "votre navigateur n'a pas pu ouvrir la photo. Reprenez-la ou essayez avec Chrome.",
  webp: "votre navigateur n'a pas pu préparer la photo. Essayez avec Chrome.",
  too_large: 'la photo est trop lourde. Reprenez-la de plus près, sans zoom.',
  rate_limited: "trop d'envois en peu de temps. Réessayez dans une heure.",
  authorization: 'le service photo ne répond pas. Réessayez dans quelques minutes.',
  network: 'la connexion a été coupée. Vérifiez votre réseau puis réessayez.',
  upload: "l'envoi a été refusé par le service photo. Réessayez dans quelques minutes.",
};

/** Message client pour la photo n°index (1-based), avec le code d'étape pour le support. */
export const trocUploadErrorMessage = (error: unknown, index: number): string => {
  const code: StorageUploadErrorCode = error instanceof StorageUploadError ? error.code : 'upload';
  return `Photo ${index} non envoyée : ${TROC_UPLOAD_MESSAGES[code]} (code ${code})`;
};

type DecodedImage = { source: CanvasImageSource; width: number; height: number; release: () => void };

/** createImageBitmap d'abord ; certains navigateurs mobiles échouent dessus, l'élément <img> sert de repli. */
async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new StorageUploadError('decode', 'Décodage de la photo impossible');
    }
  }
}

async function renderWebP(image: DecodedImage, scale: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new StorageUploadError('webp', 'Conversion image indisponible');
  ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  // Libère la mémoire du canvas tout de suite : plusieurs photos de 12 Mpx saturent un mobile.
  canvas.width = 0;
  canvas.height = 0;
  if (!result || result.type !== 'image/webp') throw new StorageUploadError('webp', 'Conversion WebP indisponible');
  return result;
}

/** Original (côté max borné) + variantes plus étroites que l'original, décodées une seule fois. */
async function convertToWebP(file: File, maxSide: number = MAX_SIDE, withVariants = true): Promise<{ original: Blob; variants: { width: number; blob: Blob }[] }> {
  if (!file.type.startsWith('image/')) throw new StorageUploadError('format', 'Format image non pris en charge');
  const bitmap = await decodeImage(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const original = await renderWebP(bitmap, scale);
    const originalWidth = bitmap.width * scale;
    const variants: { width: number; blob: Blob }[] = [];
    for (const width of withVariants ? STORAGE_VARIANT_WIDTHS : []) {
      if (width >= originalWidth) continue;
      try {
        variants.push({ width, blob: await renderWebP(bitmap, width / bitmap.width) });
      } catch {
        // Variante facultative : le Worker sert l'original à sa place.
      }
    }
    return { original, variants };
  } finally {
    bitmap.release();
  }
}

/** Upload using an intent issued by Xeption's authenticated Supabase Edge Function. */
export async function uploadImageToTrigenysStorage(
  file: File,
  folder: StorageFolder = 'products',
  sessionKey?: string,
): Promise<string> {
  // Photos de troc vues par le staff seulement : pas de variantes (écritures R2 économisées).
  const isTroc = folder === 'trocs';
  const { original: webp, variants } = await convertToWebP(file, isTroc ? TROC_MAX_SIDE : MAX_SIDE, !isTroc);
  if (isTroc && webp.size > TROC_MAX_BYTES) throw new StorageUploadError('too_large', 'Photo trop lourde');
  let intent: Awaited<ReturnType<typeof supabase.functions.invoke>>;
  try {
    intent = await supabase.functions.invoke('storage-upload-intent', {
      body: { folder, contentType: 'image/webp', maxBytes: webp.size, sessionKey }
    });
  } catch {
    throw new StorageUploadError('network', 'Autorisation de stockage injoignable');
  }
  const { data, error } = intent;
  if (error || !data?.token || !data?.uploadUrl || !data?.mediaUrl || !data?.origin) {
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    if (status === 429) throw new StorageUploadError('rate_limited', 'Quota d\'envoi atteint');
    if (error?.name === 'FunctionsFetchError') throw new StorageUploadError('network', 'Autorisation de stockage injoignable');
    throw new StorageUploadError('authorization', 'Autorisation de stockage indisponible');
  }
  const origin = new URL(String(data.origin));
  if (origin.protocol !== 'https:') throw new StorageUploadError('authorization', 'Origine de stockage non sécurisée');
  const upload = new URL(String(data.uploadUrl), origin);
  const publicUrl = new URL(String(data.mediaUrl), origin);
  if (upload.origin !== origin.origin || publicUrl.origin !== origin.origin) {
    throw new StorageUploadError('authorization', 'Réponse de stockage invalide');
  }
  let response: Response;
  try {
    response = await fetch(upload.toString(), {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + String(data.token), 'Content-Type': 'image/webp' },
      body: webp,
    });
  } catch {
    throw new StorageUploadError('network', 'Envoi vers Trigenys Storage interrompu');
  }
  if (!response.ok) throw new StorageUploadError('upload', 'Envoi vers Trigenys Storage échoué');
  // Même jeton, après l'original ; un échec ici ne bloque pas (repli sur l'original côté Worker).
  await Promise.all(variants.map(({ width, blob }) => fetch(upload.toString() + '/w' + width, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + String(data.token), 'Content-Type': 'image/webp' },
    body: blob,
  }).catch(() => undefined)));
  return publicUrl.toString();
}

// Cloudinary est retiré des envois (compte désactivé pour dépassement de quota, novembre 2026).
// Les anciennes URLs res.cloudinary.com restent lisibles par l'affichage, rien n'y est plus envoyé.

/** Photo produit / pack (staff connecté) vers Trigenys Storage, avec variantes w320/w800. */
export const uploadProductImage = async (file: File): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Envoi de photo impossible : reconnectez-vous puis réessayez.');
  }
  try {
    return await uploadImageToTrigenysStorage(file);
  } catch (error) {
    const code = error instanceof StorageUploadError ? error.code : 'upload';
    console.error('[media] envoi photo produit échoué', { code, error });
    throw new Error(`Envoi de la photo impossible (code ${code}). Réessayez dans quelques minutes.`);
  }
};

/** L'hébergement vidéo passait par Cloudinary : coller un lien vidéo (YouTube, etc.) à la place. */
export const uploadProductVideo = async (_file: File): Promise<string> => {
  throw new Error("L'envoi de vidéo n'est plus disponible : collez le lien de la vidéo dans le champ prévu.");
};


/**
 * Photos de troc (clients anonymes) vers Trigenys Storage.
 * Une photo à la fois : décoder 4 photos de 12 Mpx en parallèle sature la mémoire d'un mobile.
 * Plus de repli Cloudinary (compte désactivé) : il masquait la vraie cause sous un message « preset ».
 * L'erreur levée porte un message client avec le numéro de photo et le code d'étape.
 */
export class TrocPhotoUploadError extends Error {
  constructor(
    message: string,
    /** Photo qui a échoué : l'interface la repère par référence pour y placer « Réessayer ». */
    public readonly file: File,
    public readonly index: number,
    public readonly code: StorageUploadErrorCode,
  ) {
    super(message);
    this.name = 'TrocPhotoUploadError';
  }
}

/**
 * `uploaded` (optionnel) mémorise les photos déjà envoyées : un nouvel essai reprend à la photo
 * en échec au lieu de tout renvoyer (quota 16 envois/heure, données mobiles du client).
 */
export const uploadTrocPhotos = async (
  files: File[],
  sessionKey?: string,
  uploaded?: WeakMap<File, string>,
): Promise<string[]> => {
  const urls: string[] = [];
  for (const [i, file] of files.entries()) {
    const known = uploaded?.get(file);
    if (known) {
      urls.push(known);
      continue;
    }
    try {
      const url = await uploadImageToTrigenysStorage(file, 'trocs', sessionKey);
      uploaded?.set(file, url);
      urls.push(url);
    } catch (error) {
      const code: StorageUploadErrorCode = error instanceof StorageUploadError ? error.code : 'upload';
      console.warn('[troc] envoi photo échoué', { index: i + 1, code, error });
      throw new TrocPhotoUploadError(trocUploadErrorMessage(error, i + 1), file, i + 1, code);
    }
  }
  return urls;
};
