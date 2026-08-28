import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}
const required = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; const ref=process.env.SUPABASE_PROJECT_REF; const token=process.env.SUPABASE_ACCESS_TOKEN;
const adminSql=async(query)=>{const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query})});if(!response.ok)throw new Error(`Management SQL failed (${response.status}): ${await response.text()}`);return response.json();};
const assert=(condition,message)=>{if(!condition)throw new Error(`Validation failed: ${message}`);};
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const keyResponse=await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`,{headers:{Authorization:`Bearer ${token}`}});if(!keyResponse.ok)throw new Error(`Could not obtain temporary QA admin access (${keyResponse.status})`);const apiKeys=await keyResponse.json();const serviceKey=apiKeys.find(item=>item.name==='service_role')?.api_key??apiKeys.find(item=>item.type==='legacy'&&item.name!=='anon')?.api_key;if(!serviceKey)throw new Error('CareBridge-Dev service role key is unavailable to the configured access token');const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const runId=`${Date.now()}-${crypto.randomUUID().slice(0,8)}`; const password=`Qa!${crypto.randomUUID()}Aa1`; const users=[]; let caseId; let offer1; let offer2; let bookingId;
const createQaUser=async(kind)=>{const api=client();const email=`carebridge-part4-${kind}-${runId}@example.test`;const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{first_name:'Part4',last_name:`QA ${kind}`}});if(error||!data.user)throw error??new Error('QA user creation failed');users.push(data.user.id);const {error:loginError}=await api.auth.signInWithPassword({email,password});if(loginError)throw loginError;return{api,id:data.user.id,email};};

try {
  await adminSql("delete from auth.users where email like 'carebridge-part4-%@example.test'");
  const [patient,otherPatient,doctorUser,providerUser,adminUser]=await Promise.all(['patient','other','doctor','provider','admin'].map(createQaUser));
  const master=await adminSql(`select s.id specialty_id,t.id treatment_id,h.id hospital_id,c.id country_id from public.specialties s join public.treatments t on t.specialty_id=s.id and t.status='ACTIVE' cross join lateral (select id from public.hospitals where status='ACTIVE' and verification_state='VERIFIED' limit 1) h cross join lateral (select id from public.countries where is_active limit 1) c where s.status='ACTIVE' limit 1`);
  assert(master.length===1,'portable seeded specialty, treatment and verified hospital exist'); const m=master[0];
  const setup=await adminSql(`
    delete from public.user_roles where user_id in ('${doctorUser.id}','${providerUser.id}','${adminUser.id}');
    insert into public.user_roles(user_id,role,granted_by) values ('${doctorUser.id}','DOCTOR','${doctorUser.id}'),('${providerUser.id}','HOSPITAL_COORDINATOR','${providerUser.id}'),('${adminUser.id}','ADMIN','${adminUser.id}');
    insert into public.doctors(user_id,first_name,last_name,display_name,license_country_id,status,is_verified,verified_at,verification_state)
      values('${doctorUser.id}','Amal','Fiction','Dr Amal Fiction','${m.country_id}','ACTIVE',true,timezone('utc',now()),'VERIFIED') returning id;
  `); const doctorId=setup.at(-1)?.id??setup[0]?.id; assert(doctorId,'doctor profile created');
  await adminSql(`insert into public.doctor_specialties(doctor_id,specialty_id,is_primary) values('${doctorId}','${m.specialty_id}',true); insert into public.hospital_memberships(hospital_id,user_id,role) values('${m.hospital_id}','${providerUser.id}','HOSPITAL_COORDINATOR');`);
  const expectedRoles=[[patient,'PATIENT'],[otherPatient,'PATIENT'],[doctorUser,'DOCTOR'],[providerUser,'HOSPITAL_COORDINATOR'],[adminUser,'ADMIN']];for(const[user,role]of expectedRoles){const{data,error}=await user.api.from('user_roles').select('role').eq('user_id',user.id);if(error)throw error;assert(data.some(row=>row.role===role),`${role} login resolves its live database role`);}
  const [caseRow]=await adminSql(`insert into public.medical_cases(patient_id,specialty_id,title,description,status,submitted_at) values('${patient.id}','${m.specialty_id}','Part 4 fictional QA case ${runId}','Fictional automated case used only for live CareBridge Part 4 validation.','SUBMITTED',timezone('utc',now())) returning id`);caseId=caseRow.id;
  const {data:patientCase,error:patientCaseError}=await patient.api.from('medical_cases').select('id').eq('id',caseId);if(patientCaseError)throw patientCaseError;assert(patientCase.length===1,'patient role can read its own case');
  await adminSql(`insert into public.case_doctor_assignments(case_id,doctor_id,assigned_by) values('${caseId}','${doctorId}','${providerUser.id}'); insert into public.case_provider_assignments(case_id,provider_type,hospital_id,assigned_by) values('${caseId}','HOSPITAL','${m.hospital_id}','${providerUser.id}');`);

  const common={case_id:caseId,treatment_id:m.treatment_id,doctor_id:doctorId,description:'A fictional structured medical offer for automated validation only.',estimated_stay_days:8,proposed_start_date:'2026-10-10',proposed_end_date:'2026-10-18',included_services:['Consultation','Hospital coordination'],excluded_services:['Flights'],valid_until:'2026-10-01T00:00:00Z'};
  const {data:first,error:firstError}=await providerUser.api.from('offers').insert({...common,provider_type:'HOSPITAL',hospital_id:m.hospital_id,created_by:providerUser.id,title:'Fictional hospital care offer',estimated_cost:12500,currency:'USD',status:'DRAFT'}).select('id').single();if(firstError)throw firstError;offer1=first.id;
  const {data:hidden,error:hiddenError}=await patient.api.from('offers').select('id').eq('id',offer1);if(hiddenError)throw hiddenError;assert(hidden.length===0,'patient cannot see provider draft');
  const {error:editError}=await providerUser.api.from('offers').update({title:'Fictional hospital care offer — reviewed'}).eq('id',offer1);if(editError)throw editError;
  const {error:sendError}=await providerUser.api.from('offers').update({status:'SENT'}).eq('id',offer1);if(sendError)throw sendError;

  const {data:second,error:secondError}=await doctorUser.api.from('offers').insert({...common,provider_type:'DOCTOR',hospital_id:null,created_by:doctorUser.id,title:'Fictional clinician-led offer',estimated_cost:11300,currency:'EUR',status:'DRAFT'}).select('id').single();if(secondError)throw secondError;offer2=second.id;
  const {error:sendSecondError}=await doctorUser.api.from('offers').update({status:'SENT'}).eq('id',offer2);if(sendSecondError)throw sendSecondError;
  const {data:comparison,error:comparisonError}=await patient.api.from('offers').select('id,status').eq('case_id',caseId);if(comparisonError)throw comparisonError;assert(comparison.length===2,'patient can compare two sent offers');
  const {data:unauthorized}=await otherPatient.api.from('offers').select('id').in('id',[offer1,offer2]);assert(unauthorized?.length===0,'another patient cannot read offers');
  const {error:tamperError}=await patient.api.from('offers').update({estimated_cost:1}).eq('id',offer1);assert(Boolean(tamperError),'patient cannot alter provider offer content');
  const {error:viewError}=await patient.api.from('offers').update({status:'VIEWED'}).eq('id',offer1);if(viewError)throw viewError;
  const {error:acceptError}=await patient.api.from('offers').update({status:'ACCEPTED'}).eq('id',offer1);if(acceptError)throw acceptError;
  const {data:booking,error:bookingError}=await patient.api.from('bookings').select('id,status,offer_id').eq('offer_id',offer1).single();if(bookingError)throw bookingError;bookingId=booking.id;assert(booking.status==='PENDING_CONFIRMATION','accepted offer creates pending booking');
  const {data:expired}=await patient.api.from('offers').select('status').eq('id',offer2).single();assert(expired?.status==='EXPIRED','other open offer expires after acceptance');
  const {data:providerBooking,error:providerBookingError}=await providerUser.api.from('bookings').select('id').eq('id',bookingId);if(providerBookingError)throw providerBookingError;assert(providerBooking.length===1,'assigned provider can read booking');
  const {error:confirmError}=await providerUser.api.from('bookings').update({status:'CONFIRMED',provider_notes:'Fictional QA confirmation.'}).eq('id',bookingId);if(confirmError)throw confirmError;
  const {data:events}=await patient.api.from('booking_events').select('to_status').eq('booking_id',bookingId).order('created_at');assert(events?.map(x=>x.to_status).join(',')==='PENDING_CONFIRMATION,CONFIRMED','booking history records creation and confirmation');
  const {data:patientNotifications}=await patient.api.from('notifications').select('type').in('related_entity_id',[offer1,offer2,bookingId]);assert((patientNotifications??[]).some(x=>x.type==='offer.sent')&&(patientNotifications??[]).some(x=>x.type==='booking.created')&&(patientNotifications??[]).some(x=>x.type==='booking.status'),'patient receives offer and booking notifications');
  const {data:providerNotifications}=await providerUser.api.from('notifications').select('type').eq('related_entity_id',offer1);assert((providerNotifications??[]).some(x=>x.type==='offer.viewed')&&(providerNotifications??[]).some(x=>x.type==='offer.accepted'),'provider receives viewed and accepted notifications');
  const anonymous=client();const {error:anonymousError}=await anonymous.from('offers').select('id').eq('id',offer1);assert(Boolean(anonymousError),'anonymous access to offers is denied');
  const audit=await adminSql(`select entity_type,metadata->>'status_after' status_after from public.audit_logs where entity_id in ('${offer1}','${offer2}','${bookingId}') order by created_at`);assert(audit.some(x=>x.entity_type==='offers'&&x.status_after==='ACCEPTED')&&audit.some(x=>x.entity_type==='bookings'&&x.status_after==='CONFIRMED'),'offer decisions and booking transitions are audited');
  console.log(JSON.stringify({ok:true,checks:{liveRoleRecords:5,draftHidden:true,multipleOfferComparison:comparison.length,bookingCreated:true,bookingEvents:events.length,patientNotifications:patientNotifications.length,providerNotifications:providerNotifications.length,anonymousDenied:true,auditEvents:audit.length}},null,2));
} finally {
  if (users.length) {
    await adminSql(`
      delete from public.audit_logs where entity_id in (${[offer1,offer2,bookingId].filter(Boolean).map(value=>`'${value}'`).join(',')||'null'});
      delete from public.bookings where id=${bookingId?`'${bookingId}'`:'null'};
      delete from public.offers where case_id=${caseId?`'${caseId}'`:'null'};
      delete from public.case_provider_assignments where case_id=${caseId?`'${caseId}'`:'null'};
      delete from public.case_doctor_assignments where case_id=${caseId?`'${caseId}'`:'null'};
      delete from public.medical_cases where id=${caseId?`'${caseId}'`:'null'};
      delete from public.doctors where user_id in (${users.map(x=>`'${x}'`).join(',')});
      delete from auth.users where id in (${users.map(x=>`'${x}'`).join(',')});
    `);
  }
}
