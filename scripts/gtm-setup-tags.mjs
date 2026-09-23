/**
 * Crée en batch les balises GA4 Event + triggers Custom Event dans un container GTM,
 * pour tous les events custom du site Xeption (SMART TROC + Marketplace).
 *
 * Prérequis (5 min de setup) :
 *
 *   1. Va sur https://developers.google.com/oauthplayground/
 *   2. En haut à droite : icône ⚙ → coche "Use your own OAuth credentials" → laisse vide.
 *   3. Étape 1 (colonne de gauche) : cherche "Tag Manager API v2" → coche
 *      `https://www.googleapis.com/auth/tagmanager.edit.containers` → "Authorize APIs".
 *   4. Connecte-toi avec le compte Google qui a accès au container Xeption.
 *   5. Étape 2 : clique "Exchange authorization code for tokens" → copie "Access token".
 *
 *   6. Lance :
 *      GTM_ACCESS_TOKEN=<le token>  \
 *      GTM_ACCOUNT_ID=6578376268    \
 *      GTM_CONTAINER_ID=284954836   \
 *      GTM_WORKSPACE_ID=2           \
 *      GA4_MEASUREMENT_ID=G-50XP8798T1 \
 *      node scripts/gtm-setup-tags.mjs
 *
 *   Le token expire au bout d'1h — si ça foire à mi-parcours, refais un token et relance,
 *   le script skippe ce qui existe déjà (idempotent).
 *
 * ⚠ Après exécution : publier le workspace dans GTM UI (Envoyer → Publier).
 */

const ACCESS_TOKEN     = process.env.GTM_ACCESS_TOKEN;
const ACCOUNT_ID       = process.env.GTM_ACCOUNT_ID;
const CONTAINER_ID     = process.env.GTM_CONTAINER_ID;
const WORKSPACE_ID     = process.env.GTM_WORKSPACE_ID;
const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;

for (const [k, v] of Object.entries({
  GTM_ACCESS_TOKEN: ACCESS_TOKEN,
  GTM_ACCOUNT_ID: ACCOUNT_ID,
  GTM_CONTAINER_ID: CONTAINER_ID,
  GTM_WORKSPACE_ID: WORKSPACE_ID,
  GA4_MEASUREMENT_ID: GA4_MEASUREMENT_ID,
})) {
  if (!v) { console.error(`✗ ${k} manquant.`); process.exit(1); }
}

const BASE = `https://www.googleapis.com/tagmanager/v2/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces/${WORKSPACE_ID}`;

/**
 * Chaque event = 1 trigger Custom Event + 1 balise GA4 Event.
 * Les params `event_parameters` (table) sont mappés depuis le dataLayer :
 *   dataLayer.push({event: 'troc_step_view', troc_step: 'photos'})
 *   → dans GA4 tu retrouves `troc_step` comme dimension custom.
 *
 * Note : `view_item`, `add_to_cart`, `begin_checkout`, `purchase` ne sont PAS listés ici
 * car la Balise Google reconnaît le format ecommerce GA4 standard et les envoie
 * automatiquement (payload `ecommerce: {items, value, currency}`).
 */
const EVENTS = [
  { name: 'troc_start',                    params: [] },
  { name: 'troc_step_view',                params: ['troc_step'] },
  { name: 'troc_photos_uploaded',          params: ['photos_count'] },
  { name: 'troc_imei_checked',             params: ['imei_status'] },
  { name: 'troc_payment_initiated',        params: ['value', 'currency', 'troc_tier'] },
  { name: 'troc_payment_paid',             params: ['value', 'currency', 'troc_tier'] },
  { name: 'troc_result_shown',             params: ['grade', 'value', 'currency'] },
  { name: 'troc_offer_accepted',           params: ['grade', 'value', 'currency'] },
  { name: 'troc_offer_refused',            params: ['reason'] },
  { name: 'troc_voucher_generated',        params: ['voucher_ref'] },
  { name: 'troc_choice',                   params: ['troc_choice'] },
  { name: 'marketplace_browse_view',       params: ['listings_count'] },
  { name: 'marketplace_contact_seller',    params: ['listing_id', 'value', 'currency'] },
  { name: 'marketplace_listing_step',      params: ['listing_step'] },
  { name: 'marketplace_payment_initiated', params: ['value', 'price_max', 'currency'] },
  { name: 'marketplace_listing_published', params: ['value', 'price_max', 'currency'] },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// GTM API : "Queries per minute per user" ≈ 100/min → 700ms/req laisse de la marge.
// Sur 429, backoff exponentiel (max 3 essais).
async function api(method, path, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();

    if (res.status === 429) {
      const wait = 15_000 * (attempt + 1);
      console.log(`  … rate limit, pause ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }

    let json = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${method} ${path} — ${text.slice(0, 300)}`);
    }
    await sleep(700);
    return json;
  }
  throw new Error(`HTTP 429 après 3 essais sur ${path}`);
}

async function listExisting() {
  const [tags, triggers] = await Promise.all([
    api('GET', '/tags'),
    api('GET', '/triggers'),
  ]);
  return {
    tagsByName:     new Map((tags.tag         ?? []).map(t => [t.name, t])),
    triggersByName: new Map((triggers.trigger ?? []).map(t => [t.name, t])),
  };
}

async function ensureTrigger(eventName, existing) {
  const trigName = `CE - ${eventName}`;
  const found = existing.triggersByName.get(trigName);
  if (found) return found.triggerId;

  const created = await api('POST', '/triggers', {
    name: trigName,
    type: 'customEvent',
    customEventFilter: [{
      type: 'equals',
      parameter: [
        { type: 'template', key: 'arg0', value: '{{_event}}' },
        { type: 'template', key: 'arg1', value: eventName },
      ],
    }],
  });
  console.log(`  + trigger  ${trigName}`);
  return created.triggerId;
}

async function ensureTag(evt, triggerId, existing) {
  const tagName = `GA4 - ${evt.name}`;
  if (existing.tagsByName.has(tagName)) return;

  // Params event mappés depuis le dataLayer (nom dataLayer = nom GA4)
  const paramList = evt.params.map(k => ({
    type: 'map',
    map: [
      { type: 'template', key: 'name',  value: k },
      { type: 'template', key: 'value', value: `{{DL - ${k}}}` },
    ],
  }));

  const parameter = [
    { type: 'template', key: 'measurementIdOverride', value: GA4_MEASUREMENT_ID },
    { type: 'template', key: 'eventName',             value: evt.name },
  ];
  if (paramList.length) {
    parameter.push({ type: 'list', key: 'eventParameters', list: paramList });
  }

  await api('POST', '/tags', {
    name: tagName,
    type: 'gaawe', // GA4 Event
    parameter,
    firingTriggerId: [triggerId],
  });
  console.log(`  + tag      ${tagName}`);
}

async function ensureDataLayerVar(key, existing) {
  const varName = `DL - ${key}`;
  if (existing.variablesByName?.get(varName)) return;

  await api('POST', '/variables', {
    name: varName,
    type: 'v', // Data Layer Variable
    parameter: [
      { type: 'template',  key: 'name',            value: key },
      { type: 'integer',   key: 'dataLayerVersion', value: '2' },
    ],
  });
  console.log(`  + variable ${varName}`);
}

async function loadVariables() {
  const res = await api('GET', '/variables');
  return new Map((res.variable ?? []).map(v => [v.name, v]));
}

async function preflight() {
  console.log('→ Preflight : liste des accounts accessibles avec ce token…');
  const res = await fetch('https://www.googleapis.com/tagmanager/v2/accounts', {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    console.error(`✗ Token invalide (HTTP ${res.status}). Regénère un token dans OAuth Playground.`);
    process.exit(1);
  }
  const data = await res.json();
  const accounts = data.account ?? [];
  console.log(`  ${accounts.length} account(s) accessible(s) :`);
  accounts.forEach(a => console.log(`    - accountId=${a.accountId}  name="${a.name}"`));

  const match = accounts.find(a => a.accountId === ACCOUNT_ID);
  if (!match) {
    console.error(`\n✗ Account ID ${ACCOUNT_ID} PAS trouvé dans la liste ci-dessus.`);
    console.error('  → Vérifie que tu utilises la bonne valeur (visible dans l\'URL GTM après "/accounts/").');
    console.error('  → Vérifie que tu t\'es authentifié avec le bon compte Google dans OAuth Playground.');
    process.exit(1);
  }

  // Liste les containers de cet account
  const cr = await fetch(`https://www.googleapis.com/tagmanager/v2/accounts/${ACCOUNT_ID}/containers`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const cdata = await cr.json();
  const containers = cdata.container ?? [];
  console.log(`  ${containers.length} container(s) dans cet account :`);
  containers.forEach(c => console.log(`    - containerId=${c.containerId}  publicId=${c.publicId}  name="${c.name}"`));

  if (!containers.find(c => c.containerId === CONTAINER_ID)) {
    console.error(`\n✗ Container ID ${CONTAINER_ID} PAS trouvé. Utilise un des containerId listés ci-dessus.`);
    process.exit(1);
  }

  // Liste les workspaces
  const wr = await fetch(`https://www.googleapis.com/tagmanager/v2/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const wdata = await wr.json();
  const workspaces = wdata.workspace ?? [];
  console.log(`  ${workspaces.length} workspace(s) :`);
  workspaces.forEach(w => console.log(`    - workspaceId=${w.workspaceId}  name="${w.name}"`));

  if (!workspaces.find(w => w.workspaceId === WORKSPACE_ID)) {
    const suggestion = workspaces[0]?.workspaceId;
    console.error(`\n✗ Workspace ID ${WORKSPACE_ID} PAS trouvé (probablement déjà publié).`);
    if (suggestion) {
      console.error(`  → Réessaie avec GTM_WORKSPACE_ID=${suggestion}`);
    }
    process.exit(1);
  }

  console.log('  ✓ IDs OK\n');
}

async function main() {
  await preflight();
  console.log('→ Chargement des entités existantes…');
  const existing = await listExisting();
  existing.variablesByName = await loadVariables();

  // 1. Variables Data Layer (une par param unique)
  const uniqueParams = [...new Set(EVENTS.flatMap(e => e.params))];
  console.log(`\n→ Variables Data Layer (${uniqueParams.length} unique) :`);
  for (const p of uniqueParams) {
    await ensureDataLayerVar(p, existing);
  }

  // 2. Triggers + balises
  console.log(`\n→ Triggers + balises GA4 Event (${EVENTS.length} events) :`);
  for (const evt of EVENTS) {
    const triggerId = await ensureTrigger(evt.name, existing);
    await ensureTag(evt, triggerId, existing);
  }

  console.log('\n✓ Terminé. Ouvre GTM UI → "Envoyer" → publier la nouvelle version.');
  console.log('  Test avec le mode "Prévisualiser" avant de publier.');
}

main().catch(err => {
  console.error('\n✗', err.message);
  process.exit(1);
});
