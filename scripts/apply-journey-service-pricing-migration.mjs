import{readFileSync}from'node:fs';
for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2')}
for(const key of['SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN'])if(!process.env[key])throw new Error(`Missing ${key}`);
const query=readFileSync('supabase/migrations/202609090001_journey_service_pricing_and_catalog.sql','utf8');
const response=await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
if(!response.ok)throw new Error(`Journey service pricing migration failed (${response.status}): ${await response.text()}`);
console.log('Journey service pricing/catalog migration applied to CareBridge-Dev.');
