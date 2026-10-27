import { supabase } from './supabaseClient';


// R2 first for authenticated users; only explicit 'false' restores the legacy provider.
// VITE_ values are public config only; tenant credentials remain in Supabase Vault.
const USE_TRIGENYS_STORAGE = import.meta.env.VITE_TRIGENYS_STORAGE_ENABLED !== 'false';
const WEBP_QUALITY = 0.85;
const MAX_SIDE = 2048;

// Photos de troc : 1600 px suffisent à l'expertise et tiennent sous le plafond de 2 Mo.
const TROC_MAX_SIDE = 1600;
const TROC_MAX_BYTES = 2 * 1024 * 1024;

type StorageFolder = 'products' | 'trocs';

async function convertToWebP(file: File, maxSide: number = MAX_SIDE): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Format image non pris en charge');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Conversion image indisponible');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
    if (!result || result.type !== 'image/webp') throw new Error('Conversion WebP indisponible');
    return result;
  } finally {
    bitmap.close();
  }
}

/** Upload using an intent issued by Xeption's authenticated Supabase Edge Function. */
export async function uploadImageToTrigenysStorage(
  file: File,
  folder: StorageFolder = 'products',
  sessionKey?: string,
): Promise<string> {
  const webp = await convertToWebP(file, folder === 'trocs' ? TROC_MAX_SIDE : MAX_SIDE);
  if (folder === 'trocs' && webp.size > TROC_MAX_BYTES) throw new Error('Photo trop lourde');
  const { data, error } = await supabase.functions.invoke('storage-upload-intent', {
    body: { folder, contentType: 'image/webp', maxBytes: webp.size, sessionKey }
  });
  if (error || !data?.token || !data?.uploadUrl || !data?.mediaUrl || !data?.origin) {
    throw new Error('Autorisation de stockage indisponible');
  }
  const origin = new URL(String(data.origin));
  if (origin.protocol !== 'https:') throw new Error('Origine de stockage non sécurisée');
  const upload = new URL(String(data.uploadUrl), origin);
  const publicUrl = new URL(String(data.mediaUrl), origin);
  if (upload.origin !== origin.origin || publicUrl.origin !== origin.origin) {
    throw new Error('Réponse de stockage invalide');
  }
  const response = await fetch(upload.toString(), {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + String(data.token), 'Content-Type': 'image/webp' },
    body: webp,
  });
  if (!response.ok) throw new Error('Envoi vers Trigenys Storage échoué');
  return publicUrl.toString();
}

// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dli0kdkg9';
const CLOUDINARY_UPLOAD_PRESET = 'xeption_preset'; // Assure-toi que ce preset accepte images ET vidéos (ou est "unsigned")
const CLOUDINARY_FOLDER = 'xeption';

/**
 * Upload une image vers Cloudinary
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  if (USE_TRIGENYS_STORAGE) {
    // Unauthenticated consumer upload flows retain Cloudinary temporarily.
    // Only sessions with a verified Supabase login can request the signed intent.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!sessionError && session?.access_token) {
      try {
        return await uploadImageToTrigenysStorage(file);
      } catch {
        // Preserve UX on a storage outage while the legacy migration is incomplete.
        console.warn('Trigenys Storage indisponible : fournisseur historique utilisé');
      }
    }
  }
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_FOLDER);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Erreur Cloudinary Image");
    }

    return data.secure_url;
  } catch (error: any) {
    console.error('Erreur Upload Cloudinary:', error);
    throw new Error("Impossible d'uploader l'image sur Cloudinary. Vérifiez le preset.");
  }
};

/**
 * Upload une vidéo vers Cloudinary
 */
export const uploadVideoToCloudinary = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_FOLDER);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Erreur Cloudinary Vidéo");
    }

    return data.secure_url;
  } catch (error: any) {
    console.error('Erreur Upload Cloudinary:', error);
    throw new Error("Impossible d'uploader la vidéo sur Cloudinary.");
  }
};

/**
 * Upload plusieurs fichiers images en parallèle vers Cloudinary.
 * Retourne un tableau d'URLs dans le même ordre que les fichiers fournis.
 */
export const uploadFiles = async (files: File[]): Promise<string[]> => {
  return Promise.all(files.map(uploadImageToCloudinary));
};

/** Photos de troc (clients anonymes) : Trigenys Storage d'abord, Cloudinary en secours. */
export const uploadTrocPhotos = async (files: File[], sessionKey?: string): Promise<string[]> => {
  return Promise.all(files.map(async (file) => {
    if (USE_TRIGENYS_STORAGE) {
      try {
        return await uploadImageToTrigenysStorage(file, 'trocs', sessionKey);
      } catch (error) {
        console.warn('Trigenys Storage indisponible pour le troc : fournisseur historique utilisé', error);
      }
    }
    return uploadImageToCloudinary(file);
  }));
};
