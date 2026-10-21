import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Older files predate the rule and are covered by `npm run db:inventory`.
const FIRST_CHECKED_MIGRATION = '20261021';
const DIR = 'supabase/migrations';

const files = readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();
const sources = files.map(name => ({ name, sql: readFileSync(`${DIR}/${name}`, 'utf8').replace(/\r\n/g, '\n') }));

/** SECURITY DEFINER functions created by one migration file. */
function definerFunctions(sql: string): string[] {
  const names: string[] = [];
  const re = /CREATE OR REPLACE FUNCTION public\.(\w+)\(([\s\S]*?)\n\$\$;/g;
  for (const match of sql.matchAll(re)) {
    if (/SECURITY DEFINER/.test(match[2])) names.push(match[1]);
  }
  return names;
}

describe('Migrations : toute RPC SECURITY DEFINER est fermée à anon', () => {
  const checked = sources.filter(s => s.name >= FIRST_CHECKED_MIGRATION);

  it('chaque fonction est révoquée de PUBLIC et anon dans son fichier ou un fichier ultérieur', () => {
    const missing: string[] = [];
    checked.forEach(({ name, sql }) => {
      const later = sources.filter(s => s.name >= name).map(s => s.sql).join('\n');
      for (const fn of definerFunctions(sql)) {
        const revoked = new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\)\\s+FROM PUBLIC, anon`).test(later);
        if (!revoked) missing.push(`${name} → ${fn}`);
      }
    });
    expect(missing).toEqual([]);
  });

  it('un GRANT EXECUTE à anon est toujours annulé par une migration ultérieure', () => {
    const open: string[] = [];
    checked.forEach(({ name, sql }) => {
      const after = sources.filter(s => s.name > name).map(s => s.sql).join('\n');
      for (const match of sql.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\([^;]*\banon\b[^;]*;/g)) {
        const revoked = new RegExp(`REVOKE ALL ON FUNCTION public\\.${match[1]}\\([^;]*\\banon\\b`).test(after);
        if (!revoked) open.push(`${name} → ${match[1]}`);
      }
    });
    expect(open).toEqual([]);
  });
});
