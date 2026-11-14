#!/usr/bin/env node
/**
 * Déploiement idempotent de l'ingestion automatique des rapports de caisse WhatsApp
 * (webhook WAHA → Edge Function `whatsapp-cash-webhook`).
 *
 *   npm run deploy:whatsapp-cash              # plan (lecture seule) : état réel → actions à faire
 *   npm run deploy:whatsapp-cash -- --apply   # exécute uniquement ce qui manque
 *
 * Quatre étapes, chacune inspectée avant d'agir (état courant → état désiré → diff → no-op ou
 * réconciliation minimale) :
 *   1. migration `20261111_001` via scripts/apply-migration.mjs (déjà tracée = sautée) ;
 *   2. secrets Supabase (comparés par empreinte SHA-256, la seule chose que la CLI expose) ;
 *   3. déploiement de la fonction (sources plus récentes que le déploiement, ou --redeploy) ;
 *   4. webhook de la session WAHA sur le VPS, via SSH (l'API WAHA n'écoute que sur 127.0.0.1) :
 *      ajout/mise à jour de NOTRE entrée seulement, les autres webhooks (Trigenys Notify) sont conservés.
 *
 * Options : --apply · --rotate-key (nouvelle clé HMAC des deux côtés) · --skip-vps · --skip-deploy · --redeploy
 *           --session=<nom WAHA> · --group=<id@g.us>[,…]
 * Variables (.env ou environnement) : SUPABASE_PROJECT_REF, WHATSAPP_CASH_WEBHOOK_HMAC_KEY (pour réutiliser
 *   une clé existante), WHATSAPP_CASH_GROUP_IDS, WHATSAPP_CASH_AUTHOR_STORES, WAHA_SESSION, WAHA_VPS_SSH,
 *   WAHA_VPS_SSH_KEY, WAHA_CONTAINER, WAHA_LOCAL_URL, WHATSAPP_CASH_WEBHOOK_URL.
 *
 * Aucun secret n'est affiché ni passé en argument de commande : empreintes seulement, valeurs via
 * fichier temporaire (secrets Supabase) ou stdin (SSH).
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** `.env` du dossier courant, sinon celui du dépôt principal (cas d'un worktree git, qui n'a pas le sien). */
function resolveEnvFile() {
  const local = resolve(root, '.env');
  if (existsSync(local)) return local;
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
    const shared = resolve(dirname(resolve(root, common)), '.env');
    if (existsSync(shared)) return shared;
  } catch { /* hors git : on reste sur le .env local, absent */ }
  return local;
}
const ENV_FILE = resolveEnvFile();
dotenv.config({ path: ENV_FILE, quiet: true });

// ── Options ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const APPLY = flag('apply');
const ROTATE_KEY = flag('rotate-key');
const SKIP_VPS = flag('skip-vps');
const SKIP_DEPLOY = flag('skip-deploy');
const REDEPLOY = flag('redeploy');

// ── Configuration (déclarative, surchargée par l'environnement) ──────────────
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'tawnusmfyvugqczaydat';
const FUNCTION_NAME = 'whatsapp-cash-webhook';
const MIGRATION = 'supabase/migrations/20261111_001_store_cash_reports_source_whatsapp_live.sql';
const WEBHOOK_URL =
  process.env.WHATSAPP_CASH_WEBHOOK_URL ||
  `https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}`;
const SECRET_HMAC = 'WHATSAPP_CASH_WEBHOOK_HMAC_KEY';
const SECRET_GROUPS = 'WHATSAPP_CASH_GROUP_IDS';
const SECRET_AUTHORS = 'WHATSAPP_CASH_AUTHOR_STORES';
const HMAC_KEY_BYTES = 32; // 64 hex chars (la fonction exige ≥ 32 caractères)
const WAHA_RETRIES = { policy: 'exponential', delaySeconds: 2, attempts: 5 };
const WAHA_EVENTS = ['message'];
const VPS = {
  ssh: process.env.WAHA_VPS_SSH || 'ubuntu@15.235.90.215',
  key: process.env.WAHA_VPS_SSH_KEY || join(homedir(), '.ssh', 'id_ed25519_fleet_vps'),
  container: process.env.WAHA_CONTAINER || 'trigenys-waha',
  apiUrl: process.env.WAHA_LOCAL_URL || 'http://127.0.0.1:3000',
  session: opt('session') || process.env.WAHA_SESSION || null,
};
const SAFE_NAME = /^[A-Za-z0-9._-]+$/; // noms injectés dans une commande distante

const sha = (s) => createHash('sha256').update(s).digest('hex');
const fingerprint = (s) => (s ? sha(s).slice(0, 12) : null);
const isWin = process.platform === 'win32';

// Sous Windows, `npx` est un .cmd : on passe par le npx-cli.js livré avec Node pour éviter un shell
// (et la concaténation non échappée des arguments qui va avec).
const NPX_CLI = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
function run(cmd, args, { input, inherit = false } = {}) {
  let file = cmd;
  let shell = false;
  if (cmd === 'npx' && isWin) {
    if (existsSync(NPX_CLI)) { file = process.execPath; args = [NPX_CLI, ...args]; }
    else shell = true;
  }
  return execFileSync(file, args, {
    cwd: root,
    encoding: 'utf8',
    input,
    stdio: inherit ? 'inherit' : [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    shell,
    maxBuffer: 16 * 1024 * 1024,
  });
}
const supabase = (args, extra) => run('npx', ['supabase', ...args, '--project-ref', PROJECT_REF], extra);

/** Journal commun : chaque étape pousse { step, state, action, detail }. */
const report = [];
const log = (step, state, action, detail = '') => {
  report.push({ step, state, action, detail });
  const mark = action === 'no-op' ? '✓' : action === 'skip' ? '·' : '→';
  console.log(`${mark} ${step.padEnd(10)} ${state}${detail ? `  (${detail})` : ''}  [${action}]`);
};

// ── 1. Migration ─────────────────────────────────────────────────────────────
async function inspectMigration() {
  const file = resolve(root, MIGRATION);
  if (!existsSync(file)) throw new Error(`Migration introuvable : ${MIGRATION}`);
  const version = MIGRATION.split('/').pop();
  const databaseUrl = resolveDatabaseUrl(root);
  if (!databaseUrl) throw new Error('Accès base absent : DATABASE_URL ou SUPABASE_DB_PASSWORD dans .env');
  const pg = await import('pg');
  const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT checksum, applied_at FROM public.schema_migrations WHERE version = $1`,
      [version],
    );
    if (!rows.length) return { action: 'apply', state: 'non appliquée' };
    const same = !rows[0].checksum || rows[0].checksum === sha(readFileSync(file, 'utf8'));
    if (!same) throw new Error(`${version} appliquée mais le fichier a changé depuis : écrire une nouvelle migration.`);
    return { action: 'no-op', state: `appliquée le ${new Date(rows[0].applied_at).toISOString().slice(0, 10)}` };
  } finally {
    await client.end();
  }
}
const applyMigration = () => run('node', ['scripts/apply-migration.mjs', MIGRATION], { inherit: true });

// ── 2. Secrets Supabase ──────────────────────────────────────────────────────
function listSecretDigests() {
  const out = supabase(['secrets', 'list', '-o', 'json']);
  const parsed = JSON.parse(out.slice(out.search(/[[{]/))); // la CLI peut précéder le JSON d'avertissements
  const list = Array.isArray(parsed) ? parsed : parsed.secrets || [];
  return new Map(list.map((s) => [s.name, String(s.value || '')]));
}

/** Décide la valeur de chaque secret ; `hmacKey` est la clé que WAHA devra connaître. */
function planSecrets(existing) {
  const desired = [];
  let hmacKey = process.env[SECRET_HMAC] || null;
  let hmacState;
  const hasHmac = existing.has(SECRET_HMAC);
  if (hmacKey && hasHmac && existing.get(SECRET_HMAC) === sha(hmacKey) && !ROTATE_KEY) {
    hmacState = 'identique (empreinte)';
  } else if (hasHmac && !ROTATE_KEY && !hmacKey) {
    hmacState = 'présente (valeur non relisible, réutilisée telle quelle)';
  } else {
    if (!hmacKey || ROTATE_KEY) hmacKey = randomBytes(HMAC_KEY_BYTES).toString('hex');
    desired.push([SECRET_HMAC, hmacKey]);
    hmacState = hasHmac ? 'à remplacer' : 'à créer';
  }
  log('secrets', `${SECRET_HMAC} ${hmacState}`, desired.length ? 'set' : 'no-op',
    hmacKey ? `empreinte ${fingerprint(hmacKey)}` : '');

  const optional = [
    [SECRET_GROUPS, opt('group') || process.env[SECRET_GROUPS]],
    [SECRET_AUTHORS, process.env[SECRET_AUTHORS]],
  ];
  for (const [name, value] of optional) {
    if (!value) {
      log('secrets', `${name} ${existing.has(name) ? 'présente, non pilotée ici' : 'absente (optionnelle)'}`, 'skip');
    } else if (existing.get(name) === sha(value)) {
      log('secrets', `${name} identique (empreinte)`, 'no-op');
    } else {
      desired.push([name, value]);
      log('secrets', `${name} ${existing.has(name) ? 'à mettre à jour' : 'à créer'}`, 'set', `empreinte ${fingerprint(value)}`);
    }
  }
  return { desired, hmacKey, hmacKnown: Boolean(process.env[SECRET_HMAC]) || desired.some(([n]) => n === SECRET_HMAC) };
}

function applySecrets(pairs) {
  if (!pairs.length) return;
  const dir = mkdtempSync(join(tmpdir(), 'xeption-secrets-'));
  const envFile = join(dir, 'secrets.env');
  try {
    writeFileSync(envFile, pairs.map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
    supabase(['secrets', 'set', '--env-file', envFile]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── 3. Edge Function ─────────────────────────────────────────────────────────
// Sources embarquées dans le bundle : le dossier de la fonction et tout `_shared` (imports relatifs).
const FUNCTION_SOURCE_DIRS = [`supabase/functions/${FUNCTION_NAME}`, 'supabase/functions/_shared'];
function newestMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(path) : statSync(path).mtimeMs);
  }
  return newest;
}

/** La CLI n'expose pas d'empreinte comparable au bundle : on compare la date du déploiement à celle des sources. */
function inspectFunction() {
  if (SKIP_DEPLOY) return { action: 'skip', state: 'non inspectée', detail: '--skip-deploy' };
  let fn;
  try {
    const out = supabase(['functions', 'list', '-o', 'json']);
    fn = JSON.parse(out.slice(out.indexOf('['))).find((f) => f.slug === FUNCTION_NAME || f.name === FUNCTION_NAME);
  } catch {
    return { action: 'deploy', state: 'état inconnu (functions list indisponible)', detail: 'redéploiement par prudence' };
  }
  if (!fn) return { action: 'deploy', state: 'absente' };
  const deployedAt = Number(fn.updated_at) || Date.parse(fn.updated_at) || 0;
  const label = `déployée (v${fn.version ?? '?'}, ${fn.status ?? ''} ${new Date(deployedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC)`;
  if (REDEPLOY) return { action: 'deploy', state: label, detail: '--redeploy' };
  const sourcesAt = Math.max(...FUNCTION_SOURCE_DIRS.map((d) => newestMtime(resolve(root, d))));
  return sourcesAt > deployedAt
    ? { action: 'deploy', state: label, detail: 'sources modifiées depuis' }
    : { action: 'no-op', state: label, detail: 'sources plus anciennes que le déploiement' };
}
const deployFunction = () =>
  supabase(['functions', 'deploy', FUNCTION_NAME, '--no-verify-jwt', '--use-api', '--workdir', '.'], { inherit: true });

// ── 4. WAHA (VPS, via SSH) ───────────────────────────────────────────────────
function remoteApiKey() {
  // La clé API WAHA est lue dans l'environnement du conteneur, côté VPS, jamais rapatriée.
  return `K=$(sudo docker inspect ${VPS.container} --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^WAHA_API_KEY=' | cut -d= -f2-)`;
}
function ssh(remoteCmd, input) {
  return run('ssh', ['-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-i', VPS.key, VPS.ssh, remoteCmd], { input });
}
function wahaGet(path) {
  const out = ssh(`${remoteApiKey()}; curl -sS -H "X-Api-Key: $K" -H 'Accept: application/json' '${VPS.apiUrl}${path}'`);
  return JSON.parse(out);
}
function wahaPutSession(name, body) {
  return ssh(
    `${remoteApiKey()}; curl -sS -o /dev/null -w '%{http_code}' -X PUT -H "X-Api-Key: $K" -H 'Content-Type: application/json' --data-binary @- '${VPS.apiUrl}/api/sessions/${name}'`,
    JSON.stringify(body),
  );
}

function pickSession(sessions) {
  if (VPS.session) {
    const s = sessions.find((x) => x.name === VPS.session);
    if (!s) throw new Error(`Session WAHA « ${VPS.session} » introuvable (disponibles : ${sessions.map((x) => x.name).join(', ') || 'aucune'})`);
    return s;
  }
  const working = sessions.filter((s) => s.status === 'WORKING');
  if (working.length === 1) return working[0];
  throw new Error(
    `Impossible de choisir la session WAHA (${sessions.length} session(s), ${working.length} WORKING) : passer --session=<nom>.`,
  );
}

function desiredWebhook(hmacKey) {
  return { url: WEBHOOK_URL, events: WAHA_EVENTS, hmac: hmacKey ? { key: hmacKey } : null, retries: WAHA_RETRIES, customHeaders: null };
}
const sameEvents = (a = [], b = []) => [...a].sort().join() === [...b].sort().join();
const sameRetries = (a, b) => !!a && a.policy === b.policy && a.delaySeconds === b.delaySeconds && a.attempts === b.attempts;

function inspectWaha(hmacKey, hmacKnown) {
  if (!SAFE_NAME.test(VPS.container)) throw new Error('Nom de conteneur WAHA invalide');
  const sessions = wahaGet('/api/sessions?all=true');
  const session = pickSession(sessions);
  if (!SAFE_NAME.test(session.name)) throw new Error('Nom de session WAHA invalide');
  const webhooks = session.config?.webhooks ?? [];
  const ours = webhooks.find((w) => w.url === WEBHOOK_URL);
  const others = webhooks.filter((w) => w.url !== WEBHOOK_URL);

  let keyForWaha = hmacKey;
  if (ours && !hmacKnown && ours.hmac?.key && !ROTATE_KEY) keyForWaha = ours.hmac.key; // clé déjà en place, réutilisée
  const desired = desiredWebhook(keyForWaha);

  let action = 'no-op';
  let state;
  if (!ours) {
    state = `webhook absent de « ${session.name} » (${others.length} autre(s) conservé(s))`;
    action = 'put';
  } else {
    const keyOk = !hmacKnown && !ROTATE_KEY ? Boolean(ours.hmac?.key) : ours.hmac?.key === keyForWaha;
    const same = sameEvents(ours.events, WAHA_EVENTS) && sameRetries(ours.retries, WAHA_RETRIES) && keyOk;
    state = same ? `webhook conforme sur « ${session.name} »` : `webhook à mettre à jour sur « ${session.name} »`;
    if (!same) action = 'put';
  }
  if (action === 'put' && !keyForWaha) {
    throw new Error(
      `${SECRET_HMAC} existe déjà côté Supabase mais sa valeur n'est pas relisible : fournir ${SECRET_HMAC} dans l'environnement, ou --rotate-key pour la régénérer des deux côtés.`,
    );
  }
  log('waha', state, action, action === 'put' ? 'la session redémarre à la mise à jour' : '');
  return { session, action, body: { name: session.name, config: { ...session.config, webhooks: [...others, desired] } } };
}

// ── Orchestration : plan complet, puis apply dans l'ordre migration → secrets → fonction → WAHA ──
async function main() {
  console.log(`${APPLY ? 'APPLY' : 'PLAN (lecture seule — ajouter --apply pour exécuter)'} · projet ${PROJECT_REF} · ${WEBHOOK_URL}`);
  console.log(`env : ${ENV_FILE}${existsSync(ENV_FILE) ? '' : ' (absent)'}\n`);

  const migration = await inspectMigration();
  log('migration', migration.state, migration.action);

  const secrets = planSecrets(listSecretDigests());

  const fn = inspectFunction();
  log('fonction', fn.state, fn.action, fn.detail ?? '');

  let waha = null;
  if (SKIP_VPS) log('waha', 'non inspecté', 'skip', '--skip-vps');
  else waha = inspectWaha(secrets.hmacKey, secrets.hmacKnown);

  const pending = report.filter((r) => !['no-op', 'skip'].includes(r.action));
  if (!APPLY) {
    console.log(pending.length ? `\n${pending.length} action(s) à exécuter — relancer avec --apply.` : '\nTout est déjà en place.');
    return;
  }
  if (!pending.length) return console.log('\nRien à faire.');

  console.log('');
  if (migration.action === 'apply') applyMigration();
  if (secrets.desired.length) {
    applySecrets(secrets.desired);
    console.log(`✓ secrets    ${secrets.desired.map(([n]) => n).join(', ')} enregistrés`);
  }
  if (fn.action === 'deploy') deployFunction();
  if (waha?.action === 'put') {
    const code = wahaPutSession(waha.session.name, waha.body).trim();
    if (!/^20\d$/.test(code)) throw new Error(`WAHA PUT /api/sessions/${waha.session.name} → HTTP ${code}`);
    console.log(`✓ waha       webhook enregistré sur « ${waha.session.name} » (HTTP ${code})`);
  }
  console.log('\nTerminé. Vérifier : npm run db:status, puis poster un rapport de test dans le groupe.');
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  if (err.stderr) console.error(String(err.stderr).trim().split('\n').slice(-5).join('\n'));
  process.exit(1);
});
