/**
 * One-shot: reset all staff Auth passwords to 123456 + sync display names.
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/reset-staff-auth-passwords.mjs
 */
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.STAFF_DEFAULT_PASSWORD?.trim() || '123456';

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pgClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
await pgClient.connect();
const { rows: staff } = await pgClient.query(
  'SELECT name, email FROM public.staff WHERE email IS NOT NULL AND trim(email) <> \'\' ORDER BY email',
);

for (const member of staff) {
  const email = member.email.trim().toLowerCase();
  let page = 1;
  let userId = null;

  while (page <= 10 && !userId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) userId = match.id;
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: member.name,
        name: member.name,
        display_name: member.name,
        staff_name: member.name,
      },
    });
    if (createError) {
      console.error('CREATE FAIL', email, createError.message);
      continue;
    }
    userId = created.user?.id ?? null;
    console.log('CREATED', email, userId);
  } else {
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: member.name,
        name: member.name,
        display_name: member.name,
        staff_name: member.name,
      },
    });
    if (updateError) {
      console.error('UPDATE FAIL', email, updateError.message);
      continue;
    }
    console.log('UPDATED', email, userId);
  }

  await pgClient.query('SELECT public.sync_staff_auth_display_name($1, $2)', [email, member.name]);
}

await pgClient.end();

// Verify sign-in with anon key
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const anonClient = createClient(url, anon, { auth: { persistSession: false } });

for (const member of staff) {
  const email = member.email.trim().toLowerCase();
  const { error } = await anonClient.auth.signInWithPassword({ email, password });
  console.log('LOGIN', email, error ? `FAIL: ${error.message}` : 'OK');
  await anonClient.auth.signOut();
}

console.log('done');
