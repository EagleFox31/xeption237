/**
 * Clé service_role pour les scripts d'écriture, sans jamais la stocker.
 *
 * Priorité : SUPABASE_SERVICE_ROLE_KEY dans l'environnement, sinon récupération à la volée
 * via la CLI Supabase déjà connectée (`projects api-keys`). La clé reste en mémoire : ni
 * fichier, ni log, et aucun message d'erreur ne reprend la sortie de la CLI (elle la contient).
 */
import { execSync } from 'node:child_process';

const PROJECT_REF_RE = /^[a-z0-9]{20}$/;
// Même contournement que pour le déploiement : le réseau coupe le ClientHello post-quantique (Go).
const CLI_GODEBUG = 'tlsmlkem=0,tlskyber=0';

export function projectRefFromUrl(url) {
  return url?.match(/^https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

/** Choisit la clé service dans la sortie JSON de la CLI : legacy `service_role`, sinon clé `secret`. */
export function pickServiceKey(cliOutput) {
  let keys;
  try {
    keys = JSON.parse(cliOutput);
  } catch {
    throw new Error('Sortie de la CLI Supabase illisible (JSON attendu)');
  }
  if (!Array.isArray(keys)) throw new Error('Sortie de la CLI Supabase inattendue (liste attendue)');
  const usable = (k) => typeof k?.api_key === 'string' && k.api_key.length > 0;
  const key = keys.find((k) => k?.name === 'service_role' && usable(k)) ?? keys.find((k) => k?.type === 'secret' && usable(k));
  if (!key) throw new Error('Aucune clé service_role / secret dans la réponse de la CLI Supabase');
  return key.api_key;
}

const runCli = (ref) => execSync(`npx supabase projects api-keys --project-ref ${ref} -o json`, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, GODEBUG: process.env.GODEBUG || CLI_GODEBUG },
});

/**
 * @param {{ env?: NodeJS.ProcessEnv, run?: (ref: string) => string }} [deps] injectables pour les tests
 * @returns {string} la clé (à ne jamais afficher)
 */
export function resolveServiceRoleKey({ env = process.env, run = runCli } = {}) {
  const fromEnv = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) return fromEnv;

  const ref = projectRefFromUrl(env.VITE_SUPABASE_URL);
  if (!ref || !PROJECT_REF_RE.test(ref)) throw new Error('VITE_SUPABASE_URL absent ou invalide : project ref introuvable');
  let output;
  try {
    output = run(ref);
  } catch (e) {
    // stderr seulement : stdout pourrait contenir des clés.
    const detail = String(e?.stderr || e?.message || e).trim().split('\n').slice(-2).join(' ');
    throw new Error(`CLI Supabase indisponible (connecté ? \`npx supabase login\`) : ${detail}`);
  }
  return pickServiceKey(output);
}
