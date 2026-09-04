import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}
for (const key of ['SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN']) if (!process.env[key]) throw new Error(`Missing ${key}`);

async function sql(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Management SQL failed (${response.status}): ${await response.text()}`);
  return response.json();
}

const result = await sql(`
do $$
declare demo_patient uuid; demo_admin uuid; demo_journey uuid;
begin
  select id into demo_patient from auth.users where email='demo.patient@carebridge.test';
  select ur.user_id into demo_admin from public.user_roles ur
  where ur.role in ('SUPER_ADMIN','ADMIN') order by case when ur.role='SUPER_ADMIN' then 0 else 1 end limit 1;
  if demo_patient is null or demo_admin is null then raise exception 'Persistent demo patient and Admin are required'; end if;

  insert into public.bookings(
    booking_reference,patient_id,status,journey_type,journey_timezone,journey_status,
    expected_start_date,expected_end_date,created_by,coordination_notes
  ) values(
    'CB-DEMOCHOICE26',demo_patient,'PENDING_CONFIRMATION','INTERNATIONAL_MEDICAL_TRAVEL','Africa/Cairo','PLANNING',
    '2026-12-05','2026-12-18',demo_admin,'Fictional planning journey demonstrating patient choice.'
  ) on conflict(booking_reference) do update set
    patient_id=excluded.patient_id,journey_type=excluded.journey_type,journey_status='PLANNING',
    expected_start_date=excluded.expected_start_date,expected_end_date=excluded.expected_end_date,
    coordination_notes=excluded.coordination_notes
  returning id into demo_journey;

  if not exists(select 1 from public.journey_services where booking_id=demo_journey and service_type='HOSPITAL_PROCEDURE') then
    insert into public.journey_services(booking_id,service_type,selection_state,status,title,created_by)
    values(demo_journey,'HOSPITAL_PROCEDURE','PATIENT_TO_CHOOSE','PLANNED','Choose a suitable hospital and treatment programme',demo_admin);
  end if;

  insert into public.journey_accommodation_preferences(booking_id,patient_id,arrangement,notes,updated_by)
  values(demo_journey,demo_patient,'PATIENT_WILL_CHOOSE','Choose an available recovery stay from the patient portal.',demo_admin)
  on conflict(booking_id) do update set arrangement='PATIENT_WILL_CHOOSE',notes=excluded.notes,updated_by=demo_admin,updated_at=timezone('utc',now());
end $$;

select b.booking_reference,b.journey_status,b.expected_start_date,b.expected_end_date,
  count(distinct s.id) filter(where s.selection_state='PATIENT_TO_CHOOSE') patient_service_choices,
  count(distinct p.booking_id) filter(where p.arrangement='PATIENT_WILL_CHOOSE') patient_accommodation_choices
from public.bookings b
left join public.journey_services s on s.booking_id=b.id
left join public.journey_accommodation_preferences p on p.booking_id=b.id
where b.booking_reference='CB-DEMOCHOICE26'
group by b.id;
`);
if (!result[0] || Number(result[0].patient_service_choices) !== 1 || Number(result[0].patient_accommodation_choices) !== 1) {
  throw new Error('Persistent Patient Journey demo preparation failed');
}
console.log(JSON.stringify({ ok: true, journey: result[0] }, null, 2));
