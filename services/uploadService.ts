
// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dli0kdkg9';
const CLOUDINARY_UPLOAD_PRESET = 'xeption_preset'; // Assure-toi que ce preset accepte images ET vidéos (ou est "unsigned")
const CLOUDINARY_FOLDER = 'xeption';

/**
 * Upload une image vers Cloudinary
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
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
