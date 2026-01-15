
import { supabase } from './supabaseClient';

// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dli0kdkg9';
const CLOUDINARY_UPLOAD_PRESET = 'xeption_preset'; // Assure-toi de créer ce preset en mode "Unsigned" dans Cloudinary
const CLOUDINARY_FOLDER = 'xeption';

/**
 * Upload une image vers le bucket Supabase 'xeption237'
 */
export const uploadImageToSupabase = async (file: File): Promise<string> => {
  try {
    // Check Auth State for debugging
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.warn("Upload Warning: No active Supabase session. RLS policies might block this upload.");
    }

    // Nettoyage du nom de fichier et ajout timestamp
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload
    const { error: uploadError } = await supabase.storage
      .from('xeption237')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
        console.error('Supabase Storage Error:', uploadError);
        
        // Handle RLS specifically
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('new row violates')) {
            throw new Error("ERREUR PERMISSION (RLS): L'upload est bloqué par Supabase. \n1. Assurez-vous d'être connecté.\n2. Vérifiez que le Bucket 'xeption237' est 'Public' ou a une Policy 'INSERT' pour 'anon'/'authenticated'.");
        }

        // Tentative de fallback sur xeptionbis si le premier échoue (optionnel)
        console.warn("Echec upload bucket principal, tentative bucket secours...");
        const { error: fallbackError } = await supabase.storage
            .from('xeptionbis')
            .upload(filePath, file);
        
        if (fallbackError) throw uploadError; // On lance l'erreur originale si les deux échouent
    }

    // Récupération de l'URL publique
    const { data } = supabase.storage
      .from('xeption237')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error: any) {
    console.error('Erreur Upload Supabase:', error);
    throw new Error(error.message || "Impossible d'uploader l'image. Vérifiez votre connexion.");
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
        throw new Error(data.error?.message || "Erreur Cloudinary");
    }

    return data.secure_url;
  } catch (error) {
    console.error('Erreur Upload Cloudinary:', error);
    throw new Error("Impossible d'uploader la vidéo. Vérifiez le preset Cloudinary.");
  }
};
