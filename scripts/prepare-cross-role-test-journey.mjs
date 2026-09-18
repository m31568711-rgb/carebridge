import{readFileSync}from'node:fs';
for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2')}
for(const k of['SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN'])if(!process.env[k])throw new Error(`Missing ${k}`);
const sql=async query=>{const r=await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});if(!r.ok)throw new Error(`SQL ${r.status}: ${await r.text()}`);return r.json()};
const rows=await sql(`do $$
declare b public.bookings;s public.journey_services;a uuid;doctor_user uuid;provider_user uuid;lab_user uuid;rad_user uuid;
begin
 select * into b from public.bookings where booking_reference='CB-ADMINTEST26';
 select id into doctor_user from auth.users where email='demo.doctor@carebridge.test';
 select id into provider_user from auth.users where email='demo.provider@carebridge.test';
 select id into lab_user from auth.users where email='demo.lab@carebridge.test';
 select id into rad_user from auth.users where email='demo.radiology@carebridge.test';
 if b.id is null or doctor_user is null or provider_user is null or lab_user is null or rad_user is null then raise exception 'Persistent TEST Journey or demo accounts are missing';end if;

 select * into s from public.journey_services where booking_id=b.id and service_type='DOCTOR_CONSULTATION';
 if s.id is null then raise exception 'Doctor TEST service is missing';end if;
 update public.journey_service_settlements set settled_amount=0 where journey_service_id=s.id;
 update public.journey_services set doctor_id=(select id from public.doctors where user_id=doctor_user limit 1) where id=s.id;
 select * into s from public.journey_services where id=s.id;
 if s.doctor_id is null then raise exception 'Persistent demo Doctor profile is missing';end if;
 select id into a from public.appointments where booking_id=b.id and doctor_id=s.doctor_id and provider_type='DOCTOR' and status<>'CANCELLED' order by created_at limit 1;
 if a is null then insert into public.appointments(booking_id,patient_id,provider_type,doctor_id,appointment_type,scheduled_at,timezone,duration_minutes,location_name,status,instructions,created_by) values(b.id,b.patient_id,'DOCTOR',s.doctor_id,'CONSULTATION','2026-11-11T09:30:00Z','Africa/Cairo',45,'CareBridge virtual clinic - TEST','CONFIRMED','Fictional TEST consultation.',b.created_by) returning id into a;end if;
 update public.journey_services set appointment_id=a,status='CONFIRMED' where id=s.id;

 select * into s from public.journey_services where booking_id=b.id and service_type='HOSPITAL_PROCEDURE';
 if s.id is null or s.hospital_id is null then raise exception 'Hospital - TEST service is missing';end if;
 update public.hospital_memberships set is_active=true where hospital_id=s.hospital_id and user_id=provider_user;
 if not found then insert into public.hospital_memberships(hospital_id,user_id,role,is_active) values(s.hospital_id,provider_user,'HOSPITAL_COORDINATOR',true);end if;
 select id into a from public.appointments where booking_id=b.id and hospital_id=s.hospital_id and appointment_type='TREATMENT_PROCEDURE' and status<>'CANCELLED' order by created_at limit 1;
 if a is null then insert into public.appointments(booking_id,patient_id,provider_type,hospital_id,doctor_id,appointment_type,scheduled_at,timezone,duration_minutes,location_name,status,instructions,created_by) values(b.id,b.patient_id,'HOSPITAL',s.hospital_id,(select id from public.doctors where user_id=doctor_user limit 1),'TREATMENT_PROCEDURE','2026-11-12T08:00:00Z','Africa/Cairo',120,'CareBridge Hospital - TEST','CONFIRMED','Fictional TEST admission instructions.',b.created_by) returning id into a;end if;
 update public.journey_services set appointment_id=a,status='CONFIRMED' where id=s.id;

 select * into s from public.journey_services where booking_id=b.id and service_type='LABORATORY';
 if s.id is null or s.medical_laboratory_id is null then raise exception 'Laboratory - TEST service is missing';end if;
 update public.diagnostic_provider_memberships set is_active=true where provider_type='MEDICAL_LABORATORY' and medical_laboratory_id=s.medical_laboratory_id and user_id=lab_user;
 if not found then insert into public.diagnostic_provider_memberships(provider_type,medical_laboratory_id,user_id,is_active) values('MEDICAL_LABORATORY',s.medical_laboratory_id,lab_user,true);end if;
 select id into a from public.appointments where booking_id=b.id and medical_laboratory_id=s.medical_laboratory_id and status<>'CANCELLED' order by created_at limit 1;
 if a is null then insert into public.appointments(booking_id,patient_id,provider_type,medical_laboratory_id,appointment_type,scheduled_at,timezone,duration_minutes,location_name,status,instructions,created_by) values(b.id,b.patient_id,'MEDICAL_LABORATORY',s.medical_laboratory_id,'LAB_RADIOLOGY','2026-11-10T07:30:00Z','Africa/Cairo',30,'CareBridge Laboratory - TEST','CONFIRMED','Fictional TEST preparation instructions.',b.created_by) returning id into a;end if;
 update public.journey_services set appointment_id=a,status='CONFIRMED' where id=s.id;
 if not exists(select 1 from public.lab_orders where booking_id=b.id and medical_laboratory_id=s.medical_laboratory_id) then insert into public.lab_orders(booking_id,patient_id,case_id,doctor_id,medical_laboratory_id,priority,status,clinical_instructions,created_by) values(b.id,b.patient_id,b.case_id,(select id from public.doctors where user_id=doctor_user limit 1),s.medical_laboratory_id,'ROUTINE','ORDERED','Fictional TEST laboratory order.',doctor_user);end if;

 select * into s from public.journey_services where booking_id=b.id and service_type='RADIOLOGY';
 if s.id is null or s.radiology_center_id is null then raise exception 'Radiology Center - TEST service is missing';end if;
 update public.diagnostic_provider_memberships set is_active=true where provider_type='RADIOLOGY_CENTER' and radiology_center_id=s.radiology_center_id and user_id=rad_user;
 if not found then insert into public.diagnostic_provider_memberships(provider_type,radiology_center_id,user_id,is_active) values('RADIOLOGY_CENTER',s.radiology_center_id,rad_user,true);end if;
 select id into a from public.appointments where booking_id=b.id and radiology_center_id=s.radiology_center_id and status<>'CANCELLED' order by created_at limit 1;
 if a is null then insert into public.appointments(booking_id,patient_id,provider_type,radiology_center_id,appointment_type,scheduled_at,timezone,duration_minutes,location_name,status,instructions,created_by) values(b.id,b.patient_id,'RADIOLOGY_CENTER',s.radiology_center_id,'LAB_RADIOLOGY','2026-11-10T10:30:00Z','Africa/Cairo',45,'CareBridge Radiology Center - TEST','CONFIRMED','Fictional TEST imaging instructions.',b.created_by) returning id into a;end if;
 update public.journey_services set appointment_id=a,status='CONFIRMED' where id=s.id;
 if not exists(select 1 from public.radiology_orders where booking_id=b.id and radiology_center_id=s.radiology_center_id) then insert into public.radiology_orders(booking_id,patient_id,case_id,doctor_id,radiology_center_id,study_name,modality,body_area,priority,status,clinical_instructions,created_by) values(b.id,b.patient_id,b.case_id,(select id from public.doctors where user_id=doctor_user limit 1),s.radiology_center_id,'MRI review - TEST','MRI','Spine','ROUTINE','ORDERED','Fictional TEST radiology order.',doctor_user);end if;

 update public.journey_service_settlements st set settled_amount=case js.service_type when 'DOCTOR_CONSULTATION' then st.agreed_amount when 'HOSPITAL_PROCEDURE' then round(st.agreed_amount/2,2) when 'RADIOLOGY' then st.agreed_amount else 0 end
 from public.journey_services js where js.id=st.journey_service_id and js.booking_id=b.id;
end$$;
select b.booking_reference,count(distinct s.id) services,count(distinct a.id) appointments,count(distinct l.id) labs,count(distinct r.id) radiology,count(distinct st.id) settlements,count(distinct n.id) notifications
from public.bookings b left join public.journey_services s on s.booking_id=b.id left join public.appointments a on a.booking_id=b.id left join public.lab_orders l on l.booking_id=b.id left join public.radiology_orders r on r.booking_id=b.id left join public.journey_service_settlements st on st.booking_id=b.id left join public.notifications n on n.data->>'booking_id'=b.id::text where b.booking_reference='CB-ADMINTEST26' group by b.id;`);
const x=rows[0];if(!x||Number(x.services)!==4||Number(x.appointments)<4||Number(x.labs)<1||Number(x.radiology)<1||Number(x.settlements)!==4||Number(x.notifications)<4)throw new Error('Cross-role TEST Journey preparation is incomplete.');
console.log(JSON.stringify({ok:true,journey:x},null,2));
