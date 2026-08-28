import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}

const accounts = {
  patient: ['demo.patient@carebridge.test', 'CAREBRIDGE_DEMO_PATIENT_PASSWORD', 'PATIENT', 'Leila', 'Morgan', 'en'],
  doctor: ['demo.doctor@carebridge.test', 'CAREBRIDGE_DEMO_DOCTOR_PASSWORD', 'DOCTOR', 'Amira', 'Solis', 'fr'],
  provider: ['demo.provider@carebridge.test', 'CAREBRIDGE_DEMO_PROVIDER_PASSWORD', 'HOSPITAL_COORDINATOR', 'Nora', 'Bennett', 'en'],
  lab: ['demo.lab@carebridge.test', 'CAREBRIDGE_DEMO_LAB_PASSWORD', 'PROVIDER', 'Samir', 'Haddad', 'ar'],
  radiology: ['demo.radiology@carebridge.test', 'CAREBRIDGE_DEMO_RADIOLOGY_PASSWORD', 'PROVIDER', 'Maya', 'Laurent', 'fr'],
};
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN', ...Object.values(accounts).map(([, key]) => key)];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key} in .env.local`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const sql = async (query) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Database query failed (${response.status}): ${await response.text()}`);
  return response.json();
};
const assert = (value, message) => { if (!value) throw new Error(`Demo validation failed: ${message}`); };
const browser = () => createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
if (!keyResponse.ok) throw new Error('Could not obtain temporary service access for demo provisioning');
const keys = await keyResponse.json();
const serviceKey = keys.find((key) => key.name === 'service_role')?.api_key ?? keys.find((key) => key.type === 'legacy' && key.name !== 'anon')?.api_key;
if (!serviceKey) throw new Error('No service role key is available for this project');
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function provisionAccount(kind) {
  const [email, passwordKey, role, firstName, lastName, locale] = accounts[kind];
  const existing = (await sql(`select id from auth.users where lower(email)=lower('${email}') limit 1`))[0];
  let userId = existing?.id;
  if (userId) {
    const { error } = await service.auth.admin.updateUserById(userId, { password: process.env[passwordKey], email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName } });
    if (error) throw error;
  } else {
    const { data, error } = await service.auth.admin.createUser({ email, password: process.env[passwordKey], email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName } });
    if (error || !data.user) throw error ?? new Error(`Could not create ${kind} account`);
    userId = data.user.id;
  }
  return { kind, email, password: process.env[passwordKey], role, firstName, lastName, locale, userId };
}

const users = Object.fromEntries((await Promise.all(Object.keys(accounts).map(provisionAccount))).map((user) => [user.kind, user]));
const master = (await sql(`select s.id specialty_id,t.id treatment_id,h.id hospital_id,h2.id comparison_hospital_id,h.country_id,h.city_id
  from public.specialties s join public.treatments t on t.specialty_id=s.id and t.status='ACTIVE'
  cross join lateral(select id,country_id,city_id from public.hospitals where status='ACTIVE' and verification_state='VERIFIED' order by created_at limit 1)h
  cross join lateral(select id from public.hospitals where status='ACTIVE' and verification_state='VERIFIED' and id<>h.id order by created_at limit 1)h2
  where s.status='ACTIVE' order by s.created_at limit 1`))[0];
assert(master?.comparison_hospital_id, 'two verified hospitals and active treatment master data exist');

const ids = {
  doctor: 'd6000000-0000-4000-8000-000000000001', lab: 'd6000000-0000-4000-8000-000000000002', radiology: 'd6000000-0000-4000-8000-000000000003',
  case: 'd6100000-0000-4000-8000-000000000001', doctorAssignment: 'd6100000-0000-4000-8000-000000000002', providerAssignment: 'd6100000-0000-4000-8000-000000000003', recommendation: 'd6110000-0000-4000-8000-000000000001',
  acceptedOffer: 'd6200000-0000-4000-8000-000000000001', comparisonOffer: 'd6200000-0000-4000-8000-000000000002', booking: 'd6300000-0000-4000-8000-000000000001',
  appointment: 'd6400000-0000-4000-8000-000000000001', invoice: 'd6500000-0000-4000-8000-000000000001', item1: 'd6510000-0000-4000-8000-000000000001', item2: 'd6510000-0000-4000-8000-000000000002', payment1: 'd6520000-0000-4000-8000-000000000001', payment2: 'd6520000-0000-4000-8000-000000000002', paymentDocument: 'd6530000-0000-4000-8000-000000000001',
  travel: 'd6600000-0000-4000-8000-000000000001', transport: 'd6610000-0000-4000-8000-000000000001', encounter: 'd6700000-0000-4000-8000-000000000001', prescription: 'd6710000-0000-4000-8000-000000000001', prescriptionItem: 'd6720000-0000-4000-8000-000000000001',
  labOrder: 'd6800000-0000-4000-8000-000000000001', labTest: 'd6810000-0000-4000-8000-000000000001', labResult: 'd6820000-0000-4000-8000-000000000001', labDocument: 'd6830000-0000-4000-8000-000000000001',
  radiologyOrder: 'd6900000-0000-4000-8000-000000000001', radiologyResult: 'd6910000-0000-4000-8000-000000000001', radiologyDocument: 'd6920000-0000-4000-8000-000000000001', followUp: 'd6a00000-0000-4000-8000-000000000001',
};
const labPath = `${users.patient.userId}/lab/${ids.labResult}/carebridge-demo-lab-report.pdf`;
const radiologyPath = `${users.patient.userId}/radiology/${ids.radiologyResult}/carebridge-demo-radiology-report.pdf`;
const paymentPath = `${users.patient.userId}/${ids.booking}/${ids.payment1}/carebridge-demo-payment-proof.pdf`;
await service.storage.from('clinical-results').remove([labPath, radiologyPath]);
await service.storage.from('payment-proofs').remove([paymentPath]);

const demoUserIds = Object.values(users).map((user) => `'${user.userId}'`).join(',');
await sql(`begin;
delete from public.audit_logs where actor_id in (${demoUserIds}) or entity_id in ('${ids.case}','${ids.booking}','${ids.labOrder}','${ids.radiologyOrder}');
delete from public.notifications where recipient_id in (${demoUserIds});
delete from public.payment_documents where booking_id='${ids.booking}';delete from public.payment_records where booking_id='${ids.booking}';delete from public.invoice_items where invoice_id='${ids.invoice}';delete from public.invoices where booking_id='${ids.booking}';
delete from public.bookings where id='${ids.booking}';delete from public.offers where case_id='${ids.case}';delete from public.case_provider_assignments where case_id='${ids.case}';delete from public.case_doctor_assignments where case_id='${ids.case}';delete from public.treatment_recommendations where case_id='${ids.case}';delete from public.medical_cases where id='${ids.case}';
delete from public.user_roles where user_id in (${demoUserIds});
insert into public.user_roles(user_id,role,granted_by) values
 ('${users.patient.userId}','PATIENT','${users.patient.userId}'),('${users.doctor.userId}','DOCTOR','${users.doctor.userId}'),('${users.provider.userId}','HOSPITAL_COORDINATOR','${users.provider.userId}'),('${users.lab.userId}','PROVIDER','${users.lab.userId}'),('${users.radiology.userId}','PROVIDER','${users.radiology.userId}');
update public.profiles set first_name='Leila',last_name='Morgan',display_name='Leila Morgan',preferred_language='en',account_status='ACTIVE' where id='${users.patient.userId}';
update public.profiles set first_name='Amira',last_name='Solis',display_name='Dr. Amira Solis',preferred_language='fr',account_status='ACTIVE' where id='${users.doctor.userId}';
update public.profiles set first_name='Nora',last_name='Bennett',display_name='Nora Bennett',preferred_language='en',account_status='ACTIVE' where id='${users.provider.userId}';
update public.profiles set first_name='Samir',last_name='Haddad',display_name='Samir Haddad',preferred_language='ar',account_status='ACTIVE' where id='${users.lab.userId}';
update public.profiles set first_name='Maya',last_name='Laurent',display_name='Maya Laurent',preferred_language='fr',account_status='ACTIVE' where id='${users.radiology.userId}';
insert into public.doctors(id,user_id,first_name,last_name,display_name,biography_i18n,years_experience,license_number,license_country_id,languages,status,is_verified,verified_at,verification_state)
 values('${ids.doctor}','${users.doctor.userId}','Amira','Solis','Dr. Amira Solis','{"en":"Fictional cardiology consultant for the CareBridge client demo.","fr":"Cardiologue fictive pour la démonstration CareBridge.","ar":"طبيبة قلب خيالية لعرض CareBridge."}',14,'CB-DEMO-DR-001','${master.country_id}',array['en','fr','ar'],'ACTIVE',true,'2026-08-01T09:00:00Z','VERIFIED')
 on conflict(id) do update set user_id=excluded.user_id,display_name=excluded.display_name,status='ACTIVE',is_verified=true,verified_at=excluded.verified_at,verification_state='VERIFIED';
delete from public.doctor_specialties where doctor_id='${ids.doctor}';insert into public.doctor_specialties(doctor_id,specialty_id,is_primary) values('${ids.doctor}','${master.specialty_id}',true);
insert into public.medical_laboratories(id,owner_user_id,legal_name,display_name_i18n,slug,description_i18n,country_id,city_id,address_i18n,status,verification_state,is_verified,verified_at)
 values('${ids.lab}','${users.lab.userId}','CareBridge Demonstration Laboratory','{"en":"CareBridge Demonstration Laboratory","fr":"Laboratoire de démonstration CareBridge","ar":"مختبر كيربريدج التجريبي"}','carebridge-demonstration-laboratory','{"en":"Fictional accredited laboratory for client demonstrations.","fr":"Laboratoire fictif agréé pour les démonstrations.","ar":"مختبر خيالي معتمد للعروض."}','${master.country_id}',${master.city_id ? `'${master.city_id}'` : 'null'},'{"en":"Demo Medical District","fr":"Quartier médical de démonstration","ar":"المنطقة الطبية التجريبية"}','ACTIVE','VERIFIED',true,'2026-08-01T09:00:00Z')
 on conflict(id) do update set owner_user_id=excluded.owner_user_id,status='ACTIVE',verification_state='VERIFIED',is_verified=true,verified_at=excluded.verified_at;
insert into public.radiology_centers(id,owner_user_id,legal_name,display_name_i18n,slug,description_i18n,country_id,city_id,address_i18n,status,verification_state,is_verified,verified_at)
 values('${ids.radiology}','${users.radiology.userId}','CareBridge Demonstration Imaging','{"en":"CareBridge Demonstration Imaging","fr":"Imagerie de démonstration CareBridge","ar":"مركز كيربريدج التجريبي للأشعة"}','carebridge-demonstration-imaging','{"en":"Fictional diagnostic imaging center for client demonstrations.","fr":"Centre fictif d’imagerie diagnostique pour les démonstrations.","ar":"مركز أشعة تشخيصية خيالي للعروض."}','${master.country_id}',${master.city_id ? `'${master.city_id}'` : 'null'},'{"en":"Demo Medical District","fr":"Quartier médical de démonstration","ar":"المنطقة الطبية التجريبية"}','ACTIVE','VERIFIED',true,'2026-08-01T09:00:00Z')
 on conflict(id) do update set owner_user_id=excluded.owner_user_id,status='ACTIVE',verification_state='VERIFIED',is_verified=true,verified_at=excluded.verified_at;
insert into public.hospital_memberships(hospital_id,user_id,role,is_active) values('${master.hospital_id}','${users.provider.userId}','HOSPITAL_COORDINATOR',true) on conflict(hospital_id,branch_id,user_id,role) do update set is_active=true;
insert into public.medical_cases(id,patient_id,specialty_id,title,description,symptoms_notes,preferred_country_id,preferred_city_id,location_preference,status,submitted_at)
 values('${ids.case}','${users.patient.userId}','${master.specialty_id}','International cardiac evaluation and treatment','Fictional client-demo case for a patient seeking specialist evaluation and a coordinated international care journey.','Intermittent fatigue and exertional discomfort documented for demonstration only.','${master.country_id}',${master.city_id ? `'${master.city_id}'` : 'null'},'International center with multilingual coordination','RECOMMENDATION_AVAILABLE','2026-08-03T09:00:00Z');
insert into public.case_doctor_assignments(id,case_id,doctor_id,assigned_by,assigned_at) values('${ids.doctorAssignment}','${ids.case}','${ids.doctor}','${users.provider.userId}','2026-08-04T09:00:00Z');
insert into public.treatment_recommendations(id,case_id,doctor_id,treatment_id,recommendation_notes,next_steps,status,submitted_at) values('${ids.recommendation}','${ids.case}','${ids.doctor}','${master.treatment_id}','Complete specialist assessment followed by the selected treatment pathway and monitored recovery. Fictional data only.','Compare provider offers, confirm travel dates, and complete the pre-treatment appointment.','SUBMITTED','2026-08-05T12:00:00Z');
insert into public.case_provider_assignments(id,case_id,provider_type,hospital_id,assigned_by,assigned_at) values('${ids.providerAssignment}','${ids.case}','HOSPITAL','${master.hospital_id}','${users.provider.userId}','2026-08-05T13:00:00Z');
insert into public.offers(id,case_id,recommendation_id,provider_type,hospital_id,doctor_id,treatment_id,created_by,title,description,estimated_cost,currency,estimated_stay_days,proposed_start_date,proposed_end_date,included_services,excluded_services,provider_notes,valid_until,status,sent_at,viewed_at,decided_at,decision_note) values
 ('${ids.acceptedOffer}','${ids.case}','${ids.recommendation}','HOSPITAL','${master.hospital_id}','${ids.doctor}','${master.treatment_id}','${users.provider.userId}','Comprehensive international care package','Specialist assessment, coordinated treatment, inpatient care, follow-up, and multilingual patient coordination.',12500,'USD',14,'2026-09-15','2026-09-29',array['Specialist assessment','Treatment program','Hospital stay','Care coordination'],array['Flights','Personal expenses'],'Fictional client-demo offer.','2026-12-31T23:59:59Z','ACCEPTED','2026-08-06T10:00:00Z','2026-08-07T09:00:00Z','2026-08-08T11:00:00Z','Selected for the coordinated clinical and travel plan.'),
 ('${ids.comparisonOffer}','${ids.case}','${ids.recommendation}','HOSPITAL','${master.comparison_hospital_id}','${ids.doctor}','${master.treatment_id}','${users.provider.userId}','Alternative focused treatment package','Alternative fictional offer with a shorter stay and separate travel coordination.',10800,'USD',10,'2026-09-20','2026-09-30',array['Specialist assessment','Treatment program','Hospital stay'],array['Flights','Accommodation','Local transport'],'Fictional comparison offer.','2026-12-31T23:59:59Z','SENT','2026-08-06T14:00:00Z',null,null,null);
insert into public.bookings(id,booking_reference,patient_id,case_id,offer_id,provider_type,hospital_id,doctor_id,treatment_id,planned_arrival,planned_care_date,estimated_completion,status,patient_notes,provider_notes,journey_type,journey_timezone,clinical_status)
 values('${ids.booking}','CB-DEMO2026INTL','${users.patient.userId}','${ids.case}','${ids.acceptedOffer}','HOSPITAL','${master.hospital_id}','${ids.doctor}','${master.treatment_id}','2026-09-14','2026-09-16','2026-09-29','IN_PROGRESS','Please keep my companion informed of schedule changes.','International demo journey coordinated by Nora Bennett.','INTERNATIONAL_MEDICAL_TRAVEL','Africa/Cairo','FOLLOW_UP_PENDING');
insert into public.appointments(id,booking_id,patient_id,provider_type,hospital_id,doctor_id,appointment_type,scheduled_at,timezone,duration_minutes,location_name,location_details,status,instructions,provider_notes,created_by)
 values('${ids.appointment}','${ids.booking}','${users.patient.userId}','HOSPITAL','${master.hospital_id}','${ids.doctor}','PRE_TREATMENT_ASSESSMENT','2026-09-15T08:30:00Z','Africa/Cairo',60,'International Patient Center','Cardiology consultation suite, second floor','CONFIRMED','Bring identification and current medication list.','Interpreter and patient coordinator confirmed.','${users.provider.userId}');
insert into public.invoices(id,invoice_number,booking_id,offer_id,patient_id,provider_type,hospital_id,currency,due_date,status,notes,issued_at,created_by)
 values('${ids.invoice}','CBI-DEMO2026INTL','${ids.booking}','${ids.acceptedOffer}','${users.patient.userId}','HOSPITAL','${master.hospital_id}','USD','2026-09-10','ISSUED','Fictional invoice for client demonstration.','2026-08-10T10:00:00Z','${users.provider.userId}');
insert into public.invoice_items(id,invoice_id,description,quantity,unit_amount,display_order) values('${ids.item1}','${ids.invoice}','Clinical treatment program',1,10500,1),('${ids.item2}','${ids.invoice}','International care coordination',1,2000,2);
insert into public.payment_records(id,invoice_id,booking_id,patient_id,amount,currency,paid_at,method,reference_number,notes,recorded_by) values
 ('${ids.payment1}','${ids.invoice}','${ids.booking}','${users.patient.userId}',5000,'USD','2026-08-15T10:00:00Z','BANK_TRANSFER','CB-DEMO-BANK-001','Fictional first installment.','${users.provider.userId}'),
 ('${ids.payment2}','${ids.invoice}','${ids.booking}','${users.patient.userId}',7500,'USD','2026-08-25T10:00:00Z','CARD_AT_PROVIDER','CB-DEMO-CARD-002','Fictional final installment.','${users.provider.userId}');
insert into public.travel_plans(id,booking_id,patient_id,arrival_at,departure_at,airline,arrival_flight_number,departure_flight_number,origin_airport,destination_airport,arrival_terminal,travel_notes,accommodation_mode,accommodation_name,accommodation_address,check_in_date,check_out_date,accommodation_reference,companion_name,companion_relationship,companion_contact,updated_by)
 values('${ids.travel}','${ids.booking}','${users.patient.userId}','2026-09-14T15:20:00Z','2026-09-30T09:10:00Z','Fictional Air','FA214','FA215','London Heathrow','Cairo International Airport','3','Fictional travel itinerary for demonstration.','COORDINATED','Nile Garden Residence','Demo Medical District, Cairo','2026-09-14','2026-09-30','CB-HOTEL-DEMO-01','Omar Morgan','Brother','demo companion contact','${users.provider.userId}');
insert into public.transport_arrangements(id,booking_id,patient_id,transport_type,pickup_at,pickup_location,destination,provider_label,contact,status,notes,created_by)
 values('${ids.transport}','${ids.booking}','${users.patient.userId}','AIRPORT_PICKUP','2026-09-14T16:15:00Z','Cairo International Airport, Terminal 3','Nile Garden Residence','CareBridge Demo Transport','Demo dispatch desk','CONFIRMED','Driver meets patient at arrivals with CareBridge sign.','${users.provider.userId}');
insert into public.clinical_encounters(id,booking_id,case_id,appointment_id,patient_id,doctor_id,encountered_at,clinical_notes,assessment,diagnosis_summary,treatment_progress,next_steps,follow_up_recommendation,status,created_by)
 values('${ids.encounter}','${ids.booking}','${ids.case}','${ids.appointment}','${users.patient.userId}','${ids.doctor}','2026-09-15T08:30:00Z','Fictional private encounter note for demo validation.','Patient suitable for the proposed fictional pathway.','Stable findings requiring monitored specialist care.','Pre-treatment assessment completed.','Complete laboratory and imaging review.','Remote follow-up within four weeks.','COMPLETED','${users.doctor.userId}');
insert into public.prescriptions(id,booking_id,case_id,encounter_id,appointment_id,patient_id,doctor_id,status,issue_date,instructions,notes,created_by,issued_at)
 values('${ids.prescription}','${ids.booking}','${ids.case}','${ids.encounter}','${ids.appointment}','${users.patient.userId}','${ids.doctor}','ISSUED','2026-09-16','Take only as directed by the treating clinician.','Fictional prescription for demonstration only.','${users.doctor.userId}','2026-09-16T12:00:00Z');
insert into public.prescription_items(id,prescription_id,medication_name,strength,dosage,frequency,route,duration,instructions,display_order)
 values('${ids.prescriptionItem}','${ids.prescription}','CareBridge Demo Medication','10 mg','One tablet','Once daily','Oral','14 days','Fictional medication; not medical advice.',1);
insert into public.lab_orders(id,booking_id,case_id,encounter_id,patient_id,doctor_id,medical_laboratory_id,ordered_at,priority,clinical_instructions,status,created_by)
 values('${ids.labOrder}','${ids.booking}','${ids.case}','${ids.encounter}','${users.patient.userId}','${ids.doctor}','${ids.lab}','2026-09-15T10:00:00Z','ROUTINE','Complete demo blood panel before treatment.','RESULT_AVAILABLE','${users.doctor.userId}');
insert into public.lab_order_tests(id,lab_order_id,test_name,instructions) values('${ids.labTest}','${ids.labOrder}','Comprehensive demo blood panel','Fictional test order for demonstration.');
insert into public.radiology_orders(id,booking_id,case_id,encounter_id,patient_id,doctor_id,radiology_center_id,ordered_at,study_name,modality,body_area,priority,clinical_instructions,status,created_by)
 values('${ids.radiologyOrder}','${ids.booking}','${ids.case}','${ids.encounter}','${users.patient.userId}','${ids.doctor}','${ids.radiology}','2026-09-15T10:05:00Z','Demo cardiac imaging study','MRI','Cardiac','ROUTINE','Fictional diagnostic imaging request.','RESULT_AVAILABLE','${users.doctor.userId}');
insert into public.clinical_follow_ups(id,booking_id,encounter_id,patient_id,doctor_id,recommended_date,window_end_date,recommendation,status,created_by)
 values('${ids.followUp}','${ids.booking}','${ids.encounter}','${users.patient.userId}','${ids.doctor}','2026-10-20','2026-10-27','Remote review of recovery, medication tolerance, and released results.','SCHEDULED','${users.doctor.userId}');
insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values
 ('${users.patient.userId}','offer.accepted','part4.notifications.offerAcceptedTitle','part4.notifications.offerAcceptedMessage','offer','${ids.acceptedOffer}'),
 ('${users.patient.userId}','appointment.confirmed','part5.notifications.appointmentconfirmedTitle','part5.notifications.appointmentconfirmedMessage','appointment','${ids.appointment}'),
 ('${users.patient.userId}','payment.recorded','part5.notifications.paymentrecordedTitle','part5.notifications.paymentrecordedMessage','booking','${ids.booking}'),
 ('${users.patient.userId}','lab.result_released','part6.notifications.labresult_releasedTitle','part6.notifications.labresult_releasedMessage','booking','${ids.booking}'),
 ('${users.patient.userId}','radiology.result_released','part6.notifications.radiologyresult_releasedTitle','part6.notifications.radiologyresult_releasedMessage','booking','${ids.booking}'),
 ('${users.patient.userId}','follow_up.scheduled','part6.notifications.follow_upscheduledTitle','part6.notifications.follow_upscheduledMessage','booking','${ids.booking}'),
 ('${users.doctor.userId}','case.assigned','part4.notifications.bookingCreatedTitle','part4.notifications.bookingCreatedMessage','booking','${ids.booking}'),
 ('${users.doctor.userId}','lab.result_released','part6.notifications.labresult_releasedTitle','part6.notifications.labresult_releasedMessage','booking','${ids.booking}'),
 ('${users.provider.userId}','offer.accepted','part4.notifications.offerAcceptedTitle','part4.notifications.offerAcceptedMessage','booking','${ids.booking}'),
 ('${users.provider.userId}','payment.recorded','part5.notifications.paymentrecordedTitle','part5.notifications.paymentrecordedMessage','booking','${ids.booking}'),
 ('${users.lab.userId}','lab.order.assigned','part6.notifications.laborderedTitle','part6.notifications.laborderedMessage','lab_order','${ids.labOrder}'),
 ('${users.radiology.userId}','radiology.order.assigned','part6.notifications.radiologyorderedTitle','part6.notifications.radiologyorderedMessage','radiology_order','${ids.radiologyOrder}');
insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata,created_at) values
 ('${users.provider.userId}','CREATE','offers','${ids.acceptedOffer}','{"status":"ACCEPTED","demo":true}','2026-08-08T11:00:00Z'),
 ('${users.provider.userId}','PAYMENT','payment_records','${ids.payment2}','{"status":"PAID","demo":true}','2026-08-25T10:00:00Z'),
 ('${users.doctor.userId}','CREATE','clinical_encounters','${ids.encounter}','{"status":"COMPLETED","demo":true}','2026-09-15T09:30:00Z'),
 ('${users.lab.userId}','UPDATE','lab_results','${ids.labResult}','{"status":"RELEASED","demo":true}','2026-09-16T15:00:00Z'),
 ('${users.radiology.userId}','UPDATE','radiology_results','${ids.radiologyResult}','{"status":"RELEASED","demo":true}','2026-09-17T14:00:00Z');
commit;`);

const clients = {};
for (const [kind, user] of Object.entries(users)) {
  const client = browser();
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`${kind} demo login failed: ${error.message}`);
  clients[kind] = client;
}

const pdf = (label) => new Blob([`%PDF-1.4\n% CareBridge fictional ${label}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`], { type: 'application/pdf' });
let result = await clients.lab.from('lab_results').insert({ id: ids.labResult, lab_order_id: ids.labOrder, patient_id: users.patient.userId, summary: 'Results within the fictional expected range.', result_notes: 'Released demo laboratory report; awaiting doctor review.', created_by: users.lab.userId }); if (result.error) throw result.error;
result = await clients.lab.storage.from('clinical-results').upload(labPath, pdf('laboratory report'), { upsert: true }); if (result.error) throw result.error;
result = await clients.lab.from('clinical_result_documents').insert({ id: ids.labDocument, lab_result_id: ids.labResult, patient_id: users.patient.userId, object_path: labPath, original_filename: 'carebridge-demo-lab-report.pdf', mime_type: 'application/pdf', file_size_bytes: 103, uploaded_by: users.lab.userId }); if (result.error) throw result.error;
result = await clients.lab.from('lab_results').update({ released_at: '2026-09-16T15:00:00Z' }).eq('id', ids.labResult); if (result.error) throw result.error;
result = await clients.radiology.from('radiology_results').insert({ id: ids.radiologyResult, radiology_order_id: ids.radiologyOrder, patient_id: users.patient.userId, summary: 'No fictional acute abnormality identified.', report_notes: 'Released demo imaging report.', created_by: users.radiology.userId }); if (result.error) throw result.error;
result = await clients.radiology.storage.from('clinical-results').upload(radiologyPath, pdf('radiology report'), { upsert: true }); if (result.error) throw result.error;
result = await clients.radiology.from('clinical_result_documents').insert({ id: ids.radiologyDocument, radiology_result_id: ids.radiologyResult, patient_id: users.patient.userId, object_path: radiologyPath, original_filename: 'carebridge-demo-radiology-report.pdf', mime_type: 'application/pdf', file_size_bytes: 104, uploaded_by: users.radiology.userId }); if (result.error) throw result.error;
result = await clients.radiology.from('radiology_results').update({ released_at: '2026-09-17T14:00:00Z' }).eq('id', ids.radiologyResult); if (result.error) throw result.error;
result = await clients.doctor.from('radiology_results').update({ reviewed_at: '2026-09-18T09:00:00Z' }).eq('id', ids.radiologyResult); if (result.error) throw result.error;
result = await clients.provider.storage.from('payment-proofs').upload(paymentPath, pdf('payment proof'), { upsert: true }); if (result.error) throw result.error;
result = await clients.provider.from('payment_documents').insert({ id: ids.paymentDocument, payment_id: ids.payment1, booking_id: ids.booking, patient_id: users.patient.userId, object_path: paymentPath, original_filename: 'carebridge-demo-payment-proof.pdf', mime_type: 'application/pdf', file_size_bytes: 100, uploaded_by: users.provider.userId }); if (result.error) throw result.error;

const tempPassword = `Qa!${crypto.randomUUID()}Aa1`;
const { data: tempData, error: tempError } = await service.auth.admin.createUser({ email: `carebridge-demo-isolation-${Date.now()}@example.test`, password: tempPassword, email_confirm: true });
if (tempError || !tempData.user) throw tempError ?? new Error('Could not create isolation user');
const tempId = tempData.user.id;
try {
  await sql(`insert into public.user_roles(user_id,role,granted_by) values('${tempId}','PATIENT','${tempId}') on conflict(user_id,role) do nothing;insert into public.medical_cases(patient_id,specialty_id,title,description,status,submitted_at) values('${tempId}','${master.specialty_id}','Unrelated demo isolation case','Temporary fictional record used only to verify RLS isolation.','SUBMITTED',timezone('utc',now()));`);
  const checks = {};
  checks.patientCases = (await clients.patient.from('medical_cases').select('id').eq('id', ids.case)).data?.length === 1;
  checks.patientOffers = (await clients.patient.from('offers').select('id,status').eq('case_id', ids.case)).data?.length === 2;
  checks.patientBooking = (await clients.patient.from('bookings').select('id').eq('id', ids.booking)).data?.length === 1;
  checks.patientInvoicePaid = (await clients.patient.from('invoices').select('status,amount_paid,total_amount').eq('id', ids.invoice).single()).data?.status === 'PAID';
  checks.patientDocuments = (await clients.patient.from('clinical_result_documents').select('id').eq('patient_id', users.patient.userId)).data?.length === 2;
  checks.patientLabDownload = !(await clients.patient.storage.from('clinical-results').download(labPath)).error;
  checks.patientPaymentDownload = !(await clients.patient.storage.from('payment-proofs').download(paymentPath)).error;
  checks.patientIsolation = (await clients.patient.from('medical_cases').select('id').eq('patient_id', tempId)).data?.length === 0;
  checks.doctorCase = (await clients.doctor.from('medical_cases').select('id').eq('id', ids.case)).data?.length === 1;
  checks.doctorClinical = (await clients.doctor.from('clinical_encounters').select('id').eq('id', ids.encounter)).data?.length === 1;
  checks.doctorFinanceDenied = (await clients.doctor.from('invoices').select('id').eq('id', ids.invoice)).data?.length === 0;
  checks.doctorTravelDenied = (await clients.doctor.from('travel_plans').select('id').eq('id', ids.travel)).data?.length === 0;
  checks.providerBooking = (await clients.provider.from('bookings').select('id').eq('id', ids.booking)).data?.length === 1;
  checks.providerClinicalDenied = (await clients.provider.from('clinical_encounters').select('id').eq('id', ids.encounter)).data?.length === 0;
  checks.providerComparisonDenied = (await clients.provider.from('offers').select('id').eq('id', ids.comparisonOffer)).data?.length === 0;
  checks.labOrder = (await clients.lab.from('lab_orders').select('id').eq('id', ids.labOrder)).data?.length === 1;
  checks.labRadiologyDenied = (await clients.lab.from('radiology_orders').select('id').eq('id', ids.radiologyOrder)).data?.length === 0;
  checks.radiologyOrder = (await clients.radiology.from('radiology_orders').select('id').eq('id', ids.radiologyOrder)).data?.length === 1;
  checks.radiologyLabDenied = (await clients.radiology.from('lab_orders').select('id').eq('id', ids.labOrder)).data?.length === 0;
  const anon = browser(); checks.anonymousDenied = Boolean((await anon.from('medical_cases').select('id').eq('id', ids.case)).error);
  const summary = (await sql(`select
    (select count(*) from auth.users where email like 'demo.%@carebridge.test') demo_accounts,
    (select count(*) from public.offers where case_id='${ids.case}') offers,
    (select count(*) from public.payment_records where booking_id='${ids.booking}') payments,
    (select count(*) from public.journey_events where booking_id='${ids.booking}') timeline_events,
    (select count(*) from public.notifications where recipient_id in (${demoUserIds})) notifications,
    (select count(*) from public.audit_logs where actor_id in (${demoUserIds})) audit_events,
    (select count(*) from pg_policies where schemaname='public') public_policies,
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname='public') public_triggers`))[0];
  for (const [name, passed] of Object.entries(checks)) assert(passed, name);
  assert(Number(summary.demo_accounts) === 5 && Number(summary.offers) === 2 && Number(summary.payments) === 2, 'persistent account and journey counts');
  assert(Number(summary.public_policies) >= 100 && Number(summary.public_triggers) >= 50, 'RLS policies and application triggers remain installed');
  console.log(JSON.stringify({ ok: true, persistentAccounts: 5, journey: { caseId: ids.case, bookingReference: 'CB-DEMO2026INTL', offers: Number(summary.offers), payments: Number(summary.payments), timelineEvents: Number(summary.timeline_events), notifications: Number(summary.notifications), auditEvents: Number(summary.audit_events) }, checks, infrastructure: { publicPolicies: Number(summary.public_policies), publicTriggers: Number(summary.public_triggers) } }, null, 2));
} finally {
  await sql(`delete from public.medical_cases where patient_id='${tempId}';delete from public.user_roles where user_id='${tempId}';delete from auth.users where id='${tempId}';`);
}
