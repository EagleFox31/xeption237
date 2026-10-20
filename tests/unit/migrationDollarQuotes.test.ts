import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

// A lone `$` delimiter (instead of `$$` or `$tag$`) is a syntax error that only
// surfaces when the migration hits Postgres. Typical cause: a shell expanding `$$`.
const LONE_DOLLAR_DELIMITER = /^\s*(AS\s+\$|\$;)\s*$/im;

describe('supabase migrations', () => {
  const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'));

  it.each(files)('%s uses $$ dollar-quote delimiters', (name) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
    expect(sql).not.toMatch(LONE_DOLLAR_DELIMITER);
  });
});
