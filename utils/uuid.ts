/**
 * Génère un UUID v4 standard et sécurisé dans tous les contextes d'exécution.
 * 
 * Les navigateurs n'exposent `crypto.randomUUID` QUE dans les contextes sécurisés (HTTPS ou localhost/127.0.0.1).
 * Lors d'un accès en réseau local non-HTTPS (ex: http://192.168.1.125:4173), `crypto.randomUUID` est undefined.
 * Cette fonction fournit une génération conforme RFC4122 avec cascade de replis fiables.
 */
export function safeRandomUUID(): string {
  // 1. Tenter crypto.randomUUID() si exposé (HTTPS, localhost, Node.js récents)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // repli
    }
  }

  // 2. Tenter crypto.getRandomValues() si disponible
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC4122
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // repli
    }
  }

  // 3. Repli universel Math.random() conforme RFC4122
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
