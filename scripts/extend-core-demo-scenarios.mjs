import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}
for (const key of ['SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN']) if (!process.env[key]) throw new Error(`Missing ${key}`);
const sql = async (query) => { const response = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, { method:'POST', headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'}, body:JSON.stringify({query}) }); if(!response.ok) throw new Error(`SQL ${response.status}: ${await response.text()}`); return response.json(); };
const master = (await sql(`select p.id patient_id,d.user_id doctor_user_id,d.id doctor_id,hm.user_id provider_user_id,hm.hospital_id,s.id specialty_id,t.id treatment_id,h.country_id,h.city_id
from auth.users p
join public.doctors d on d.user_id=(select id from auth.users where email='demo.doctor@carebridge.test')
join public.hospital_memberships hm on hm.user_id=(select id from auth.users where email='demo.provider@carebridge.test') and hm.is_active
join public.hospitals h on h.id=hm.hospital_id
join public.doctor_specialties ds on ds.doctor_id=d.id
join public.specialties s on s.id=ds.specialty_id
join public.treatments t on t.specialty_id=s.id and t.status='ACTIVE'
where p.email='demo.patient@carebridge.test' limit 1`))[0];
if(!master) throw new Error('Persistent Patient, Doctor, Provider, and master data are required');
const ids = {
  localCase:'d7100000-0000-4000-8000-000000000001', localDoctor:'d7100000-0000-4000-8000-000000000002', localProvider:'d7100000-0000-4000-8000-000000000003', localRec:'d7110000-0000-4000-8000-000000000001', localOffer:'d7120000-0000-4000-8000-000000000001', localBooking:'d7130000-0000-4000-8000-000000000001', localAppointment:'d7140000-0000-4000-8000-000000000001',
  intlCase:'d7200000-0000-4000-8000-000000000001', intlDoctor:'d7200000-0000-4000-8000-000000000002', intlProvider:'d7200000-0000-4000-8000-000000000003', intlRec:'d7210000-0000-4000-8000-000000000001', intlOffer:'d7220000-0000-4000-8000-000000000001', intlBooking:'d7230000-0000-4000-8000-000000000001', intlAppointment:'d7240000-0000-4000-8000-000000000001'
};
const allIds=Object.values(ids).map(id=>`'${id}'`).join(',');
await sql(`begin;
delete from public.notifications where related_entity_id in (${allIds});
delete from public.appointments where id in ('${ids.localAppointment}','${ids.intlAppointment}');
delete from public.bookings where id in ('${ids.localBooking}','${ids.intlBooking}');
delete from public.offers where id in ('${ids.localOffer}','${ids.intlOffer}');
delete from public.case_provider_assignments where id in ('${ids.localProvider}','${ids.intlProvider}');
delete from public.treatment_recommendations where id in ('${ids.localRec}','${ids.intlRec}');
delete from public.case_doctor_assignments where id in ('${ids.localDoctor}','${ids.intlDoctor}');
delete from public.medical_cases where id in ('${ids.localCase}','${ids.intlCase}');
update public.profiles set date_of_birth='1985-04-18',gender='FEMALE',country_id='${master.country_id}',city_id=${master.city_id?`'${master.city_id}'`:'null'},address_text='CareBridge demo residence',location_details='Fictional address for client demonstration' where id='${master.patient_id}';
insert into public.medical_cases(id,patient_id,specialty_id,title,description,symptoms_notes,chronic_conditions,current_medications,allergies,preferred_country_id,preferred_city_id,location_preference,status,submitted_at) values
('${ids.localCase}','${master.patient_id}','${master.specialty_id}','Local cardiac medication review','Review of ongoing cardiac medication and recent fatigue before a local specialist follow-up. Fictional demonstration data.','Mild fatigue during normal activity.','Controlled hypertension.','Current medication list supplied to the doctor.','No known drug allergies.','${master.country_id}',${master.city_id?`'${master.city_id}'`:'null'},'Local outpatient care','RECOMMENDATION_AVAILABLE','2026-08-20T09:00:00Z'),
('${ids.intlCase}','${master.patient_id}','${master.specialty_id}','International electrophysiology assessment','Specialist assessment for a coordinated international cardiac care pathway. Fictional demonstration data.','Intermittent palpitations requiring specialist review.','Previous rhythm monitoring documented.','Current medication list supplied to the doctor.','Sensitivity noted in uploaded history.','${master.country_id}',${master.city_id?`'${master.city_id}'`:'null'},'International medical center with multilingual coordination','RECOMMENDATION_AVAILABLE','2026-08-22T09:00:00Z');
insert into public.case_doctor_assignments(id,case_id,doctor_id,assigned_by,assigned_at) values
('${ids.localDoctor}','${ids.localCase}','${master.doctor_id}','${master.provider_user_id}','2026-08-20T10:00:00Z'),('${ids.intlDoctor}','${ids.intlCase}','${master.doctor_id}','${master.provider_user_id}','2026-08-22T10:00:00Z');
insert into public.case_provider_assignments(id,case_id,provider_type,hospital_id,assigned_by,assigned_at) values
('${ids.localProvider}','${ids.localCase}','HOSPITAL','${master.hospital_id}','${master.provider_user_id}','2026-08-20T11:00:00Z'),('${ids.intlProvider}','${ids.intlCase}','HOSPITAL','${master.hospital_id}','${master.provider_user_id}','2026-08-22T11:00:00Z');
insert into public.treatment_recommendations(id,case_id,doctor_id,treatment_id,recommendation_notes,next_steps,status,submitted_at) values
('${ids.localRec}','${ids.localCase}','${master.doctor_id}','${master.treatment_id}','Complete a focused specialist review and reconcile the current medication plan before follow-up. Fictional demonstration data.','Attend the local consultation with the current medication list.','SUBMITTED','2026-08-21T09:00:00Z'),
('${ids.intlRec}','${ids.intlCase}','${master.doctor_id}','${master.treatment_id}','Complete an electrophysiology assessment and confirm the most suitable coordinated treatment pathway. Fictional demonstration data.','Review the provider offer and confirm travel readiness.','SUBMITTED','2026-08-23T09:00:00Z');
insert into public.offers(id,case_id,recommendation_id,provider_type,hospital_id,doctor_id,treatment_id,created_by,title,description,estimated_cost,currency,estimated_stay_days,proposed_start_date,proposed_end_date,included_services,excluded_services,valid_until,status,sent_at,viewed_at,decided_at) values
('${ids.localOffer}','${ids.localCase}','${ids.localRec}','HOSPITAL','${master.hospital_id}','${master.doctor_id}','${master.treatment_id}','${master.provider_user_id}','Local specialist follow-up package','A focused local consultation, medication review, and coordinated follow-up.',4200,'EGP',1,'2026-10-05','2026-10-05',array['Specialist consultation','Medication reconciliation','Follow-up plan'],array['Medication costs'],'2026-09-30T23:59:59Z','ACCEPTED','2026-08-21T12:00:00Z','2026-08-21T13:00:00Z','2026-08-21T14:00:00Z'),
('${ids.intlOffer}','${ids.intlCase}','${ids.intlRec}','HOSPITAL','${master.hospital_id}','${master.doctor_id}','${master.treatment_id}','${master.provider_user_id}','International electrophysiology care package','A coordinated specialist assessment with multilingual support and journey planning.',8900,'USD',7,'2026-11-10','2026-11-17',array['Specialist assessment','Hospital coordination','Multilingual support'],array['Flights','Personal expenses'],'2026-10-31T23:59:59Z','ACCEPTED','2026-08-23T12:00:00Z','2026-08-23T13:00:00Z','2026-08-23T14:00:00Z');
insert into public.bookings(id,booking_reference,patient_id,case_id,offer_id,provider_type,hospital_id,doctor_id,treatment_id,planned_arrival,planned_care_date,estimated_completion,status,journey_type,journey_timezone) values
('${ids.localBooking}','CB-DEMO2026LOCAL','${master.patient_id}','${ids.localCase}','${ids.localOffer}','HOSPITAL','${master.hospital_id}','${master.doctor_id}','${master.treatment_id}',null,'2026-10-05','2026-10-05','CONFIRMED','LOCAL_CARE','Africa/Cairo'),
('${ids.intlBooking}','CB-DEMO2026INTL2','${master.patient_id}','${ids.intlCase}','${ids.intlOffer}','HOSPITAL','${master.hospital_id}','${master.doctor_id}','${master.treatment_id}','2026-11-09','2026-11-10','2026-11-17','CONFIRMED','INTERNATIONAL_MEDICAL_TRAVEL','Africa/Cairo');
insert into public.appointments(id,booking_id,patient_id,provider_type,hospital_id,doctor_id,appointment_type,scheduled_at,timezone,duration_minutes,location_name,location_details,status,instructions,created_by) values
('${ids.localAppointment}','${ids.localBooking}','${master.patient_id}','HOSPITAL','${master.hospital_id}','${master.doctor_id}','CONSULTATION','2026-10-05T08:30:00Z','Africa/Cairo',45,'Outpatient cardiology clinic','Local care desk','CONFIRMED','Bring the current medication list.','${master.provider_user_id}'),
('${ids.intlAppointment}','${ids.intlBooking}','${master.patient_id}','HOSPITAL','${master.hospital_id}','${master.doctor_id}','PRE_TREATMENT_ASSESSMENT','2026-11-10T08:30:00Z','Africa/Cairo',60,'International Patient Center','Multilingual care coordination desk','CONFIRMED','Bring identification and prior cardiac reports.','${master.provider_user_id}');
commit;`);
const result=(await sql(`select (select count(*) from public.medical_cases where id in ('${ids.localCase}','${ids.intlCase}')) cases,(select count(*) from public.offers where id in ('${ids.localOffer}','${ids.intlOffer}') and recommendation_id is not null and status='ACCEPTED') offers,(select count(*) from public.bookings where id in ('${ids.localBooking}','${ids.intlBooking}')) bookings,(select count(*) from public.appointments where id in ('${ids.localAppointment}','${ids.intlAppointment}')) appointments`))[0];
if(Number(result.cases)!==2||Number(result.offers)!==2||Number(result.bookings)!==2||Number(result.appointments)!==2) throw new Error('Connected demo scenario validation failed');
console.log('Two additional persistent core scenarios are connected and ready.');
