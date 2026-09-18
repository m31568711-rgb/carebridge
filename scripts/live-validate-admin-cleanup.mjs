import { createClient } from '@supabase/supabase-js';
import { createServer } from 'vite';
const email = process.env.CAREBRIDGE_ADMIN_EMAIL;
const password = process.env.CAREBRIDGE_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Provide temporary CAREBRIDGE_ADMIN_EMAIL and CAREBRIDGE_ADMIN_PASSWORD in process environment only.');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const login = await s.auth.signInWithPassword({email,password});
if (login.error) throw login.error;
delete process.env.CAREBRIDGE_ADMIN_PASSWORD;
const vite = await createServer({server:{middlewareMode:true},appType:'custom'});
const assert = (ok, message) => { if (!ok) throw new Error(message); };
try {
  const journeys = await vite.ssrLoadModule('/src/features/care-journeys/data.ts');
  const admin = await vite.ssrLoadModule('/src/features/admin/data.ts');
  const config = await vite.ssrLoadModule('/src/features/admin/config.ts');
  const finance = await vite.ssrLoadModule('/src/features/customer-accounts/data.ts');
  const providers = await journeys.loadClinicalProviders(s);
  for (const key of ['doctors','hospitals','laboratories','radiology','procedures']) assert(providers[key].length > 0, 'Empty catalog: '+key);
  const allJourneys = await journeys.loadCareJourneys(s);
  for (const journey of allJourneys) {
    const loaded = await journeys.loadCareJourney(s, journey.id);
    assert(loaded?.id === journey.id, 'Journey detail missing: '+journey.booking_reference);
    for (const table of ['appointments','invoices','clinical_attachments','journey_events','accommodation_bookings','travel_plans']) {
      const result = await s.from(table).select('id').eq('booking_id',journey.id).limit(1);
      if (result.error) throw new Error(table+': '+result.error.message);
    }
  }
  let lists = 0;
  for (const locale of ['en','fr','ar']) for (const definition of Object.values(config.adminModules)) {
    if (!config.isAdminModuleKey(definition.key)) continue;
    const lookups = await admin.loadLookups(s,definition,locale);
    const list = await admin.loadAdminRows(s,definition,{page:1,query:'',filter:'',sort:definition.defaultSort,direction:'desc'});
    assert(!list.error && Array.isArray(list.rows), 'List failed: '+definition.key);
    if (list.rows[0]) { const key = definition.idFields.map(f=>String(list.rows[0][f] ?? '')).join('|'); const record = await admin.loadAdminRecord(s,definition,key); assert(Boolean(record),'Detail failed: '+definition.key); }
    for (const input of [...(list.count>list.pageSize?[{page:2,query:'',filter:''}]:[]),{page:1,query:'TEST',filter:''}]) { const checked = await admin.loadAdminRows(s,definition,{...input,sort:definition.defaultSort,direction:'asc'}); assert(!checked.error,'Search/pagination failed: '+definition.key+' '+JSON.stringify(input)); }
    if (definition.fields.some(f=>f.lookup==='cities')) assert((lookups.cities??[]).every(c=>c.countryId),'City relationship missing');
    if (definition.fields.some(f=>f.lookup==='hospital_branches')) assert((lookups.hospital_branches??[]).every(b=>b.hospitalId),'Branch relationship missing');
    lists++;
  }
  const accounts = await finance.loadCustomerAccounts(s);
  const test = allJourneys.find(j=>j.booking_reference==='CB-ADMINTEST26');
  assert(test, 'Existing TEST Journey missing');
  const detail = await finance.loadCustomerAccount(s,test.patient_id);
  const invoices = detail.rows.flatMap(r=>r.invoices).filter(i=>i.booking_id===test.id);
  assert(invoices.length>0, 'TEST Journey invoices missing from Customer Account');
  for (const invoice of invoices) for (const item of invoice.items) {
    const fee = Math.round(item.quantity*item.base_unit_amount*item.carebridge_fee_percent)/100;
    assert(Math.abs(fee-item.carebridge_fee_amount)<0.011,'Incorrect historical fee');
    assert(Math.abs(item.quantity*item.base_unit_amount+fee-item.line_amount)<0.011,'Incorrect customer total');
  }
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
  assert(Boolean((await anon.rpc('admin_journey_service_catalog')).error),'Anonymous catalog access');
  console.log(JSON.stringify({ok:true,journeys:allJourneys.length,localizedAdminLists:lists,catalog:Object.fromEntries(Object.entries(providers).map(([k,v])=>[k,v.length])),customerAccounts:accounts.length,testJourneyInvoices:invoices.length,anonymousDenied:true,browserVisualValidation:false},null,2));
} finally {
  await vite.close();
}
