/**
 * Chaînes de modèles Gemini — mutualisé entre Edge Functions.
 *
 * Le 2026-08-24, `gemini-2.0-flash` et `gemini-2.0-flash-lite`, codés en dur,
 * ont été retirés par Google et ont fait tomber tout le pipeline vision. Un slug
 * figé est une bombe à retardement : ce module existe pour qu'aucune fonction
 * n'en réintroduise un.
 *
 * Les alias (`-latest`) ne peuvent pas être retirés silencieusement, mais ils
 * sont congestionnés (timeouts mesurés). D'où l'ordre : des modèles éprouvés
 * d'abord, l'alias en dernier recours.
 *
 * Sondé le 2026-08-24 avec la clé réellement utilisée par les Edge Functions,
 * via un vrai `generateContent` — `models.list` ment, il annonce comme servis des
 * modèles dont l'appel répond 404 (voir docs/engineering/ERRORS_LOG.md).
 */

export const parseModelChain = (raw: string | undefined, fallback: string[]): string[] => {
  const parsed = (raw ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};

/** Chaîne texte / raisonnement par défaut. */
export const DEFAULT_TEXT_MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];

/** Chaîne légère (tâches simples, quota plus généreux). */
export const DEFAULT_LITE_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];

/**
 * Faut-il essayer le modèle suivant ?
 *
 * Oui dans presque tous les cas : 404 = modèle retiré, 503 = forte demande sur
 * ce modèle précis (un autre a d'autres capacités), 400 = refus propre au
 * modèle. Non sur 401/403 : c'est la clé qui est en cause, aucun autre modèle
 * n'y changera quoi que ce soit.
 */
export const shouldTryNextModel = (status: number): boolean => status !== 401 && status !== 403;
