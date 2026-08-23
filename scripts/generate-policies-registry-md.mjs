/**
 * Génère docs/engineering/REGISTRE_POLICIES_RLS.md depuis policies-registry.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(
  readFileSync(resolve(root, 'docs/engineering/policies-registry.json'), 'utf8'),
);

const ORPHAN_OBJECTS = {
  tables: ['customers', 'order_payments', 'packs', 'repair_tickets'],
  functions: ['handle_updated_at', 'set_updated_at'],
  triggers: [
    { name: 'on_packs_updated', table: 'packs' },
    { name: 'products_set_updated_at', table: 'products' },
  ],
};

const EDGE_BY_TABLE = {
  argus: [],
  brands: [],
  categories: [],
  customers: [],
  delivery_zones: [],
  imei_certif_records: ['generate-imei-certificate'],
  imei_premium_calls: ['check-imei'],
  market_demand_signals: ['get-market-trend'],
  market_price_snapshots: ['get-market-trend', 'snapshot-market-prices'],
  market_price_cache: ['market-price-intel'],
  market_trend_cache: ['get-market-trend'],
  orders: ['create-payment', 'send-invoice'],
  products: ['market-price-intel', 'snapshot-market-prices (lecture trade_in_models seulement)'],
  staff: ['create-staff-auth', 'sync_staff_auth_display_name RPC'],
  tac_cache: ['check-imei'],
  trade_in_requests: ['save-trade-in', 'upsert-troc-intake'],
  troc_payments: ['create-payment', 'save-trade-in'],
  troc_sessions: ['save-trade-in', 'upsert-troc-intake'],
  troc_certificates: ['generate-troc-certificate'],
  phone_releases: [],
  packs: [],
  product_ranges: [],
  repair_tickets: [],
  trade_in_models: ['snapshot-market-prices', 'evaluate-device'],
};

const RPC_BY_TABLE = {
  products: ['create_order_atomic', 'complete_pos_sale_atomic', 'complete_troc_with_sale_atomic'],
  orders: ['create_order_atomic', 'complete_pos_sale_atomic', 'complete_troc_with_sale_atomic'],
  trade_in_requests: ['complete_troc_with_sale_atomic', 'get_troc_monthly_count'],
};

const CANONICAL = {
  products: [
    'products_public_read (SELECT → anon, authenticated)',
    'products_staff_write (ALL → staff via email) — RLS à réactiver',
  ],
  brands: [
    'brands_public_read (SELECT → anon, authenticated)',
    'brands_staff_write (ALL → staff via email)',
  ],
  product_ranges: [
    'ranges_public_read (SELECT → anon, authenticated)',
    'ranges_staff_write (ALL → staff via email)',
  ],
  customers: [
    'customers_public_insert (INSERT → anon, checkout)',
    'customers_staff_all (ALL → staff via email)',
  ],
  orders: [
    'orders_public_insert (INSERT → anon, checkout + RPC)',
    'orders_public_read_own (SELECT → limité ou staff)',
    'orders_staff_all (ALL → staff via email)',
  ],
};

function mdList(items) {
  if (!items?.length) return '_Aucun_\n';
  return items.map((i) => `- \`${i}\``).join('\n') + '\n';
}

let md = `# Registre des policies RLS — Xeption Supabase

> Généré le ${data.generated_at.slice(0, 10)} depuis la base **live** (\`npm run db:policies-export\`).
> JSON machine : \`docs/engineering/policies-registry.json\`

## Règles avant d’ajouter une policy

1. **Consulter ce registre** — une policy équivalente existe peut‑être déjà (voir doublons ci‑dessous).
2. **Une responsabilité par policy** : \`public_read\`, \`staff_write\`, \`anon_insert\` — pas de \`FOR ALL TO public USING (true)\`.
3. **Écriture staff** : lier à \`staff.email = auth.jwt()->>'email'\`, jamais \`TO authenticated USING (true)\`.
4. **Edge Functions / RPC** : \`service_role\` contourne la RLS — pas besoin de policy \`public\` pour elles.
5. **Nommage** : \`<table>_<role>_<action>\` en snake (ex. \`products_staff_write\`).
6. **Migration idempotente** : toujours \`DROP POLICY IF EXISTS\` avant \`CREATE POLICY\`.
7. **Regénérer** : \`npm run db:policies-export\` après toute modification en SQL Editor.

## État global

| Métrique | Valeur |
|---|---|
| Policies live | **${data.policy_count}** |
| Tables sans RLS | **${data.tables_without_rls.join(', ') || 'aucune'}** |
| Groupes de doublons | **${data.duplicate_groups.length}** |

## Doublons à fusionner (ne pas recréer)

`;

for (const g of data.duplicate_groups) {
  md += `### ${g.policies[0].split(' ')[0]}… (${g.policies.length} policies identiques)\n\n`;
  md += `Signature : \`${g.signature}\`\n\n`;
  md += `Policies actuelles :\n${g.policies.map((p) => `- \`${p}\``).join('\n')}\n\n`;
  md += `**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.\n\n`;
}

md += `## Policies canoniques cibles (post-remédiation RLS)

`;

for (const [table, policies] of Object.entries(CANONICAL)) {
  md += `### \`${table}\`\n\n${policies.map((p) => `- ${p}`).join('\n')}\n\n`;
}

md += `## Objets en base sans fichier de migration

Ces objets existent déjà en production ; les documenter ici évite de les recréer par erreur.

| Type | Nom | Table / note |
|---|---|---|
`;

for (const t of ORPHAN_OBJECTS.tables) {
  md += `| table | \`${t}\` | créée via SQL Editor |\n`;
}
for (const f of ORPHAN_OBJECTS.functions) {
  md += `| function | \`${f}()\` | trigger helper |\n`;
}
for (const t of ORPHAN_OBJECTS.triggers) {
  md += `| trigger | \`${t.name}\` | sur \`${t.table}\` |\n`;
}

md += `
> Baseline recommandée : \`npm run db:baseline\` après rapatriement SQL si besoin de rejouabilité.

## Inventaire par table (amont → aval)

**Amont** = code app / scripts qui appellent \`.from('<table>')\`  
**Aval** = Edge Functions et RPC qui touchent la table  
**Policies** = policies live aujourd’hui

`;

for (const row of data.table_index) {
  const tablePolicies = data.policies.filter((p) => p.table === row.table);
  md += `### \`${row.table}\` (${row.policy_count} policy${row.policy_count > 1 ? 'ies' : ''})\n\n`;
  md += `**Amont (app/scripts)**\n\n${mdList(row.code_callers.slice(0, 12))}`;
  if (row.code_callers.length > 12) {
    md += `_+ ${row.code_callers.length - 12} autres — voir JSON_\n\n`;
  }
  md += `**Aval (edge / RPC)**\n\n${mdList(EDGE_BY_TABLE[row.table] || [])}`;
  if (RPC_BY_TABLE[row.table]) {
    md += `**RPC**\n\n${mdList(RPC_BY_TABLE[row.table])}`;
  }
  md += `**Policies live**\n\n`;
  md += `| Policy | CMD | Rôles | Qual |\n|---|---|---|---|\n`;
  for (const p of tablePolicies) {
    const qual = (p.qual || p.with_check || '—').replace(/\|/g, '\\|').slice(0, 40);
    md += `| \`${p.policy}\` | ${p.cmd} | ${p.roles} | ${qual} |\n`;
  }
  md += `\n`;
}

md += `## Chaîne cron prix marché

\`\`\`
pg_cron (lundi 3h)
  → edge snapshot-market-prices (x-cron-secret)
    → lit trade_in_models
    → appelle market-price-intel (forceRefresh)
         → lit/écrit market_price_cache (staff read ; edge en service_role)
    → écrit market_price_snapshots (médiane par site)
  → get-market-trend lit snapshots + trend_cache (évaluation troc)
\`\`\`

## Historique

| Date | Action |
|---|---|
| ${data.generated_at.slice(0, 10)} | Inventaire initial 61 policies + registre |
| ${data.generated_at.slice(0, 10)} | Migration \`20260823_002_market_price_cache_fix.sql\` |

`;

writeFileSync(resolve(root, 'docs/engineering/REGISTRE_POLICIES_RLS.md'), md);
console.log('✓ docs/engineering/REGISTRE_POLICIES_RLS.md');
