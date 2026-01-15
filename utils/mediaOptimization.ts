
/**
 * Utilitaire d'optimisation média pour Xeption Network
 * Cible spécifiquement les connexions lentes (237) via Cloudinary
 */

export const optimizeImage = (url: string | undefined, width: number = 800): string => {
  if (!url) return 'https://via.placeholder.com/800x800?text=No+Image';
  
  // Si ce n'est pas une image Cloudinary, on retourne l'URL telle quelle
  if (!url.includes('cloudinary.com')) return url;

  // Si l'URL a déjà des paramètres, on essaie de ne pas les casser, 
  // mais idéalement on injecte nos optimisations après "/upload/"
  
  // Configuration pour connexion lente :
  // f_auto : Choisi le meilleur format (AVIF si le navigateur gère, sinon WebP)
  // q_auto:eco : Compresse agressivement sans trop détruire la qualité visuelle
  // w_{width} : Redimensionne à la taille exacte demandée (évite de charger du 4K sur un tel)
  // dpr_auto : Adapte à la densité de pixel de l'écran
  const transformation = `f_auto,q_auto:eco,w_${width},dpr_auto,c_limit`;

  // Insertion de la transformation dans l'URL
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transformation}/${parts[1]}`;
  }

  return url;
};

export const optimizeVideo = (url: string | undefined): string => {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;

  // Optimisation vidéo spécifique pour background
  // vc_auto : Codec vidéo optimisé (H265/VP9)
  // q_auto:low : Qualité réduite car c'est un background (économise énormément de data)
  // ac_none : Supprime l'audio (économise de la bande passante si la vidéo est muted)
  const transformation = `f_auto:video,q_auto:eco,vc_auto,ac_none,w_1280,c_limit`;

  const parts = url.split('/upload/');
  if (parts.length === 2) {
    // Nettoyage des anciens paramètres s'ils existent (comme q_auto:best qui est trop lourd)
    const rawPath = parts[1].replace(/q_[^/]+\//, ''); 
    return `${parts[0]}/upload/${transformation}/${rawPath}`;
  }

  return url;
};
