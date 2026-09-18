import {readFileSync} from 'node:fs';
for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2')}
for(const key of ['SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN'])if(!process.env[key])throw new Error(`Missing ${key}`);
const endpoint=`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`;
const query=async sql=>{const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});if(!r.ok)throw new Error(`Cross-role migration failed (${r.status}): ${await r.text()}`);return r.json()};
const [{already_applied}]=await query("select to_regclass('public.journey_service_settlements') is not null as already_applied");
const migrations=already_applied?['202609090004_unsettled_service_reassignment.sql','202609090005_service_appointment_scope.sql']:['202609090003_cross_role_journey_reflection.sql','202609090004_unsettled_service_reassignment.sql','202609090005_service_appointment_scope.sql'];
for(const migration of migrations)await query(readFileSync(`supabase/migrations/${migration}`,'utf8'));
const [check]=await query(`select to_regclass('public.journey_service_settlements') is not null as settlement_table,
  has_function_privilege('authenticated','public.my_assigned_journey_services()','execute') as authenticated_rpc,
  has_function_privilege('anon','public.my_assigned_journey_services()','execute') as anon_rpc,
  has_function_privilege('authenticated','public.notify_service_assignee(uuid,text,text,uuid,uuid)','execute') as notify_execute,
  (select count(*) from pg_policies where schemaname='public' and tablename='journey_service_settlements') as policies`);
if(!check?.settlement_table||!check.authenticated_rpc||check.anon_rpc||check.notify_execute||Number(check.policies)!==3)throw new Error('Cross-role reflection security properties are incomplete.');
console.log('Cross-role Treatment Journey reflection migration applied with scoped provider settlement RLS and safe function grants.');
