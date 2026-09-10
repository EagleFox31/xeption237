/**
 * Copie un texte dans le presse-papier de façon universelle.
 * Fonctionne en contexte sécurisé (HTTPS / localhost) via `navigator.clipboard`,
 * et intègre un repli `document.execCommand` pour les accès réseau local HTTP (ex: 192.168.x.x).
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 1. Tente l'API moderne du navigateur si disponible et autorisée
  try {
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Échec ou contexte non sécurisé (ex. IP locale HTTP) -> repli ci-dessous
  }

  // 2. Repli universel via textarea temporaire
  try {
    if (typeof document === 'undefined') return false;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
};
