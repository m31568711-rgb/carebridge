import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}
for (const key of ['SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN']) if (!process.env[key]) throw new Error(`Missing ${key}`);

const query = readFileSync('supabase/migrations/202609090002_clinical_follow_up_scope_fix.sql', 'utf8');
const response = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
if (!response.ok) throw new Error(`Clinical follow-up scope migration failed (${response.status})`);
const verification = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "select p.prosecdef, p.proconfig, has_function_privilege('anon','public.protect_doctor_clinical_row()','execute') anon_execute, has_function_privilege('authenticated','public.protect_doctor_clinical_row()','execute') authenticated_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='protect_doctor_clinical_row'" }),
});
if (!verification.ok) throw new Error(`Clinical follow-up scope verification failed (${verification.status})`);
const [properties] = await verification.json();
if (!properties?.prosecdef || !properties.proconfig?.includes('search_path=""') || properties.anon_execute || properties.authenticated_execute) throw new Error('Clinical follow-up scope function properties are unsafe.');
console.log('Clinical follow-up scope migration applied and its fixed search_path and denied caller execution verified on CareBridge-Dev.');
