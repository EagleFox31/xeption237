/**
 * Supprime les fiches legacy en double (fusion déjà faite sur la meilleure).
 * Usage: node scripts/delete-legacy-duplicate-products.mjs [--dry-run]
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const DRY = process.argv.includes('--dry-run');

/** keepId → duplicateIds à supprimer */
const GROUPS = [
  {
    label: 'iPhone 13 Pro 128 Go',
    keep: '4b02ee83-07df-4432-94fd-1dba289b8ecb',
    delete: [
      '343a9b95-a93e-41dc-893d-68f57ed952aa',
      '4909d09a-e0f9-4d2e-82db-a9cc383aefd6',
    ],
  },
  {
    label: 'iPhone XR 128 Go',
    keep: '7e20b3d0-a101-4dd0-9b2a-ada508b4ad05',
    delete: ['0bf132dd-8c21-462d-a09c-b4e510a465dd'],
  },
  {
    label: 'Galaxy Z Fold4 256 Go',
    keep: 'fd104e00-eca5-44d8-b897-aa7143f8c2e1',
    delete: ['30ffea76-f4f7-4653-9a7f-d356f9f331f8'],
  },
  {
    label: 'Galaxy S21 256 Go',
    keep: '0814e79c-2674-4c92-81c5-c86a76517aa8',
    delete: ['7063526c-09e9-4ea7-a50f-7b8f8c3e45e9'],
  },
];

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');

  const supabase = createClient(url, key);
  const log = [];

  for (const g of GROUPS) {
    const { data: keepRow } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', g.keep)
      .maybeSingle();

    if (!keepRow) {
      log.push({ group: g.label, error: `keep missing: ${g.keep}` });
      continue;
    }

    for (const id of g.delete) {
      const { data: row } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', id)
        .maybeSingle();

      if (!row) {
        log.push({ group: g.label, id, status: 'already_deleted' });
        continue;
      }

      if (DRY) {
        log.push({
          group: g.label,
          status: 'would_delete',
          delete: { id: row.id, name: row.name },
          keep: { id: keepRow.id, name: keepRow.name },
        });
        continue;
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        log.push({ group: g.label, id, status: 'error', message: error.message });
      } else {
        log.push({
          group: g.label,
          status: 'deleted',
          delete: { id: row.id, name: row.name },
          keep: { id: keepRow.id, name: keepRow.name },
        });
      }
    }
  }

  const out = join(root, 'data/legacy-duplicate-delete-log.json');
  writeFileSync(
    out,
    JSON.stringify({ mode: DRY ? 'dry-run' : 'applied', at: new Date().toISOString(), log }, null, 2),
    'utf8',
  );

  console.log(`Mode: ${DRY ? 'dry-run' : 'applied'}`);
  for (const e of log) {
    if (e.status === 'deleted' || e.status === 'would_delete') {
      console.log(`✓ ${e.group}: supprimé « ${e.delete.name} » (gardé « ${e.keep.name} »)`);
    } else if (e.status === 'already_deleted') {
      console.log(`○ ${e.group}: déjà supprimé ${e.id}`);
    } else {
      console.log(`✗ ${e.group}: ${e.message || e.error}`);
    }
  }
  console.log(`Log: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
