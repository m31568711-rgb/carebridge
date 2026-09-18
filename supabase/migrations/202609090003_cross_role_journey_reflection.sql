begin;

create type public.provider_settlement_status as enum ('PENDING','PARTIALLY_SETTLED','SETTLED','CANCELLED');

create table public.journey_service_settlements (
  id uuid primary key default gen_random_uuid(),
  journey_service_id uuid not null unique references public.journey_services(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider_type public.provider_type not null,
  doctor_id uuid references public.doctors(id) on delete restrict,
  hospital_id uuid references public.hospitals(id) on delete restrict,
  medical_laboratory_id uuid references public.medical_laboratories(id) on delete restrict,
  radiology_center_id uuid references public.radiology_centers(id) on delete restrict,
  agreed_amount numeric(14,2) not null check (agreed_amount >= 0),
  settled_amount numeric(14,2) not null default 0 check (settled_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.provider_settlement_status not null default 'PENDING',
  last_settled_at timestamptz,
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 2000),
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  check (settled_amount <= agreed_amount),
  check (
    (provider_type='DOCTOR' and doctor_id is not null and num_nonnulls(hospital_id,medical_laboratory_id,radiology_center_id)=0) or
    (provider_type='HOSPITAL' and hospital_id is not null and num_nonnulls(doctor_id,medical_laboratory_id,radiology_center_id)=0) or
    (provider_type='MEDICAL_LABORATORY' and medical_laboratory_id is not null and num_nonnulls(doctor_id,hospital_id,radiology_center_id)=0) or
    (provider_type='RADIOLOGY_CENTER' and radiology_center_id is not null and num_nonnulls(doctor_id,hospital_id,medical_laboratory_id)=0)
  )
);
create index journey_service_settlements_booking_idx on public.journey_service_settlements(booking_id,status);
create index journey_service_settlements_doctor_idx on public.journey_service_settlements(doctor_id,status) where doctor_id is not null;
create index journey_service_settlements_hospital_idx on public.journey_service_settlements(hospital_id,status) where hospital_id is not null;
create index journey_service_settlements_lab_idx on public.journey_service_settlements(medical_laboratory_id,status) where medical_laboratory_id is not null;
create index journey_service_settlements_radiology_idx on public.journey_service_settlements(radiology_center_id,status) where radiology_center_id is not null;

create or replace function public.can_view_assigned_journey_service(target_service public.journey_services)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    (target_service.doctor_id is not null and public.is_doctor_owner(target_service.doctor_id)) or
    (target_service.hospital_id is not null and public.is_hospital_member(target_service.hospital_id)) or
    (target_service.medical_laboratory_id is not null and public.is_diagnostic_member('MEDICAL_LABORATORY',target_service.medical_laboratory_id)) or
    (target_service.radiology_center_id is not null and public.is_diagnostic_member('RADIOLOGY_CENTER',target_service.radiology_center_id))
  );
$$;
create or replace function public.has_assigned_journey_service(target_booking_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.journey_services s
    where s.booking_id=target_booking_id and public.can_view_assigned_journey_service(s)
  );
$$;

create or replace function public.sync_journey_service_settlement()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind public.provider_type;
begin
  if new.base_cost is null or new.currency is null or new.selection_state='PATIENT_TO_CHOOSE'
    or num_nonnulls(new.doctor_id,new.hospital_id,new.medical_laboratory_id,new.radiology_center_id)<>1 then
    return new;
  end if;
  kind:=case new.service_type when 'DOCTOR_CONSULTATION' then 'DOCTOR'::public.provider_type when 'HOSPITAL_PROCEDURE' then 'HOSPITAL'::public.provider_type when 'LABORATORY' then 'MEDICAL_LABORATORY'::public.provider_type else 'RADIOLOGY_CENTER'::public.provider_type end;
  insert into public.journey_service_settlements(journey_service_id,booking_id,provider_type,doctor_id,hospital_id,medical_laboratory_id,radiology_center_id,agreed_amount,currency,status)
  values(new.id,new.booking_id,kind,new.doctor_id,new.hospital_id,new.medical_laboratory_id,new.radiology_center_id,new.base_cost,new.currency,case when new.status='CANCELLED' then 'CANCELLED'::public.provider_settlement_status else 'PENDING'::public.provider_settlement_status end)
  on conflict(journey_service_id) do update set
    provider_type=excluded.provider_type,doctor_id=excluded.doctor_id,hospital_id=excluded.hospital_id,
    medical_laboratory_id=excluded.medical_laboratory_id,radiology_center_id=excluded.radiology_center_id,
    agreed_amount=case when public.journey_service_settlements.settled_amount=0 then excluded.agreed_amount else public.journey_service_settlements.agreed_amount end,
    currency=case when public.journey_service_settlements.settled_amount=0 then excluded.currency else public.journey_service_settlements.currency end,
    status=case when new.status='CANCELLED' and public.journey_service_settlements.settled_amount=0 then 'CANCELLED'::public.provider_settlement_status when public.journey_service_settlements.status='CANCELLED' and new.status<>'CANCELLED' then 'PENDING'::public.provider_settlement_status else public.journey_service_settlements.status end,
    updated_at=timezone('utc',now());
  return new;
end; $$;

create or replace function public.protect_journey_service_settlement()
returns trigger language plpgsql security definer set search_path='' as $$
declare service public.journey_services;
begin
  if current_user not in ('postgres','supabase_admin','service_role') and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' and not public.has_admin_privilege('finance.manage') then
    raise exception 'provider settlement change denied';
  end if;
  select * into service from public.journey_services where id=new.journey_service_id;
  if service.id is null or new.booking_id is distinct from service.booking_id or new.agreed_amount is distinct from service.base_cost or new.currency is distinct from service.currency or new.doctor_id is distinct from service.doctor_id or new.hospital_id is distinct from service.hospital_id or new.medical_laboratory_id is distinct from service.medical_laboratory_id or new.radiology_center_id is distinct from service.radiology_center_id then raise exception 'provider settlement relationship mismatch'; end if;
  if tg_op='UPDATE' and (new.journey_service_id is distinct from old.journey_service_id or new.booking_id is distinct from old.booking_id) then raise exception 'provider settlement relationship is immutable'; end if;
  if tg_op='UPDATE' and old.settled_amount>0 and (new.provider_type is distinct from old.provider_type or new.doctor_id is distinct from old.doctor_id or new.hospital_id is distinct from old.hospital_id or new.medical_laboratory_id is distinct from old.medical_laboratory_id or new.radiology_center_id is distinct from old.radiology_center_id or new.agreed_amount is distinct from old.agreed_amount or new.currency is distinct from old.currency) then raise exception 'settled provider scope is immutable'; end if;
  new.status:=case when new.status='CANCELLED' then 'CANCELLED'::public.provider_settlement_status when new.settled_amount=0 then 'PENDING'::public.provider_settlement_status when new.settled_amount<new.agreed_amount then 'PARTIALLY_SETTLED'::public.provider_settlement_status else 'SETTLED'::public.provider_settlement_status end;
  if tg_op='UPDATE' and new.settled_amount<>old.settled_amount then new.last_settled_at:=timezone('utc',now()); end if;
  return new;
end; $$;

create or replace function public.notify_service_assignee(target_service_id uuid,target_event text,target_entity_type text,target_entity_id uuid,target_booking_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  for recipient in
    select distinct user_id from (
      select d.user_id from public.journey_services s join public.doctors d on d.id=s.doctor_id where s.id=target_service_id
      union all select hm.user_id from public.journey_services s join public.hospital_memberships hm on hm.hospital_id=s.hospital_id and hm.is_active where s.id=target_service_id
      union all select l.owner_user_id from public.journey_services s join public.medical_laboratories l on l.id=s.medical_laboratory_id where s.id=target_service_id
      union all select dm.user_id from public.journey_services s join public.diagnostic_provider_memberships dm on dm.medical_laboratory_id=s.medical_laboratory_id and dm.provider_type='MEDICAL_LABORATORY' and dm.is_active where s.id=target_service_id
      union all select r.owner_user_id from public.journey_services s join public.radiology_centers r on r.id=s.radiology_center_id where s.id=target_service_id
      union all select dm.user_id from public.journey_services s join public.diagnostic_provider_memberships dm on dm.radiology_center_id=s.radiology_center_id and dm.provider_type='RADIOLOGY_CENTER' and dm.is_active where s.id=target_service_id
    ) recipients where user_id is not null
  loop
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id,data)
    values(recipient,target_event,'reflection.notifications.'||replace(target_event,'.','')||'Title','reflection.notifications.'||replace(target_event,'.','')||'Message',target_entity_type,target_entity_id,jsonb_build_object('booking_id',target_booking_id));
  end loop;
end; $$;

create or replace function public.notify_journey_service_assignee()
returns trigger language plpgsql security definer set search_path='' as $$
declare event_type text;
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status and new.doctor_id is not distinct from old.doctor_id and new.hospital_id is not distinct from old.hospital_id and new.medical_laboratory_id is not distinct from old.medical_laboratory_id and new.radiology_center_id is not distinct from old.radiology_center_id then return new; end if;
  event_type:=case when tg_op='INSERT' or coalesce(old.doctor_id,old.hospital_id,old.medical_laboratory_id,old.radiology_center_id) is distinct from coalesce(new.doctor_id,new.hospital_id,new.medical_laboratory_id,new.radiology_center_id) then 'journey.service_assigned' else 'journey.service_'||lower(new.status::text) end;
  perform public.notify_service_assignee(new.id,event_type,'booking',new.booking_id,new.booking_id);
  return new;
end; $$;

create or replace function public.notify_appointment_assignee()
returns trigger language plpgsql security definer set search_path='' as $$
declare event_type text; service_id uuid;
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status and new.scheduled_at is not distinct from old.scheduled_at then return new; end if;
  event_type:=case when tg_op='INSERT' then 'appointment.assigned' when new.status='RESCHEDULED' or new.scheduled_at is distinct from old.scheduled_at then 'appointment.rescheduled' when new.status='CANCELLED' then 'appointment.cancelled' else 'appointment.'||lower(new.status::text) end;
  for service_id in select s.id from public.journey_services s where s.booking_id=new.booking_id and (s.appointment_id=new.id or (new.doctor_id is not null and s.doctor_id=new.doctor_id) or (new.hospital_id is not null and s.hospital_id=new.hospital_id) or (new.medical_laboratory_id is not null and s.medical_laboratory_id=new.medical_laboratory_id) or (new.radiology_center_id is not null and s.radiology_center_id=new.radiology_center_id)) loop
    perform public.notify_service_assignee(service_id,event_type,'appointment',new.id,new.booking_id);
  end loop;
  return new;
end; $$;

create or replace function public.notify_service_settlement_assignee()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    perform public.notify_service_assignee(new.journey_service_id,'settlement.'||lower(new.status::text),'service_settlement',new.id,new.booking_id);
  end if;
  return new;
end; $$;

alter table public.journey_service_settlements enable row level security;
create policy journey_service_settlements_admin_read on public.journey_service_settlements for select to authenticated using(public.has_admin_privilege('finance.manage'));
create policy journey_service_settlements_provider_read on public.journey_service_settlements for select to authenticated using(
  (doctor_id is not null and public.is_doctor_owner(doctor_id)) or
  (hospital_id is not null and public.is_hospital_member(hospital_id)) or
  (medical_laboratory_id is not null and public.is_diagnostic_member('MEDICAL_LABORATORY',medical_laboratory_id)) or
  (radiology_center_id is not null and public.is_diagnostic_member('RADIOLOGY_CENTER',radiology_center_id))
);
create policy journey_service_settlements_admin_write on public.journey_service_settlements for all to authenticated using(public.has_admin_privilege('finance.manage')) with check(public.has_admin_privilege('finance.manage'));

drop policy if exists journey_services_scoped_read on public.journey_services;
create policy journey_services_scoped_read on public.journey_services for select to authenticated using(
  public.has_admin_privilege('bookings.manage') or exists(select 1 from public.bookings b where b.id=booking_id and b.patient_id=auth.uid()) or public.can_view_assigned_journey_service(journey_services)
);
drop policy if exists bookings_scoped_read on public.bookings;
create policy bookings_scoped_read on public.bookings for select to authenticated using(patient_id=auth.uid() or public.can_manage_booking(bookings) or public.has_admin_privilege('bookings.manage') or public.has_assigned_journey_service(id));
drop policy if exists appointments_scoped_read on public.appointments;
create policy appointments_scoped_read on public.appointments for select to authenticated using(
  patient_id=auth.uid() or public.has_admin_privilege('appointments.manage') or
  (doctor_id is not null and public.is_doctor_owner(doctor_id)) or
  (hospital_id is not null and public.is_hospital_member(hospital_id)) or
  (medical_laboratory_id is not null and public.is_diagnostic_member('MEDICAL_LABORATORY',medical_laboratory_id)) or
  (radiology_center_id is not null and public.is_diagnostic_member('RADIOLOGY_CENTER',radiology_center_id)) or
  exists(select 1 from public.journey_services s where s.appointment_id=appointments.id and public.can_view_assigned_journey_service(s))
);
drop policy if exists journey_events_scoped_read on public.journey_events;
create policy journey_events_scoped_read on public.journey_events for select to authenticated using(public.is_booking_patient(booking_id) or public.can_schedule_booking(booking_id) or public.has_assigned_journey_service(booking_id));

-- Customer invoices and payments remain visible only to the Patient and authorised CareBridge finance staff.
create or replace function public.can_manage_booking_finance(target_booking_id uuid)
returns boolean language sql stable security definer set search_path='' as $$select public.has_admin_privilege('finance.manage')$$;

create or replace function public.my_assigned_journey_services()
returns table(service_id uuid,booking_id uuid,booking_reference text,patient_name text,journey_status public.care_journey_status,service_type public.journey_service_type,service_title text,service_status public.journey_service_status,planned_date date,appointment_id uuid,appointment_type public.appointment_type,appointment_at timestamptz,appointment_timezone text,appointment_status public.appointment_status,agreed_amount numeric,currency text,settled_amount numeric,settlement_status public.provider_settlement_status)
language sql stable security definer set search_path='' as $$
  select s.id,b.id,b.booking_reference,coalesce(p.display_name,trim(concat_ws(' ',p.first_name,p.last_name)),'Patient'),b.journey_status,s.service_type,s.title,s.status,s.planned_date,a.id,a.appointment_type,a.scheduled_at,a.timezone,a.status,st.agreed_amount,st.currency,st.settled_amount,st.status
  from public.journey_services s join public.bookings b on b.id=s.booking_id join public.profiles p on p.id=b.patient_id
  left join public.appointments a on a.id=s.appointment_id
  left join public.journey_service_settlements st on st.journey_service_id=s.id
  where auth.uid() is not null and public.can_view_assigned_journey_service(s)
  order by coalesce(a.scheduled_at,s.planned_date::timestamptz,b.created_at) desc;
$$;

drop trigger if exists journey_service_settlement_sync on public.journey_services;
create trigger journey_service_settlement_sync after insert or update of base_cost,currency,selection_state,status,doctor_id,hospital_id,medical_laboratory_id,radiology_center_id on public.journey_services for each row execute function public.sync_journey_service_settlement();
create trigger journey_service_settlements_protect before insert or update on public.journey_service_settlements for each row execute function public.protect_journey_service_settlement();
create trigger journey_service_settlements_updated before update on public.journey_service_settlements for each row execute function public.set_updated_at();
create trigger journey_service_settlements_audit after insert or update or delete on public.journey_service_settlements for each row execute function public.audit_admin_change();
create trigger journey_service_settlements_notify after insert or update on public.journey_service_settlements for each row execute function public.notify_service_settlement_assignee();
create trigger journey_services_assignee_notify after insert or update of status,doctor_id,hospital_id,medical_laboratory_id,radiology_center_id on public.journey_services for each row execute function public.notify_journey_service_assignee();
create trigger appointments_assignee_notify after insert or update of scheduled_at,status on public.appointments for each row execute function public.notify_appointment_assignee();

insert into public.journey_service_settlements(journey_service_id,booking_id,provider_type,doctor_id,hospital_id,medical_laboratory_id,radiology_center_id,agreed_amount,currency,status)
select s.id,s.booking_id,case s.service_type when 'DOCTOR_CONSULTATION' then 'DOCTOR'::public.provider_type when 'HOSPITAL_PROCEDURE' then 'HOSPITAL'::public.provider_type when 'LABORATORY' then 'MEDICAL_LABORATORY'::public.provider_type else 'RADIOLOGY_CENTER'::public.provider_type end,s.doctor_id,s.hospital_id,s.medical_laboratory_id,s.radiology_center_id,s.base_cost,s.currency,case when s.status='CANCELLED' then 'CANCELLED'::public.provider_settlement_status else 'PENDING'::public.provider_settlement_status end
from public.journey_services s where s.base_cost is not null and s.currency is not null and s.selection_state<>'PATIENT_TO_CHOOSE' and num_nonnulls(s.doctor_id,s.hospital_id,s.medical_laboratory_id,s.radiology_center_id)=1
on conflict(journey_service_id) do nothing;

revoke all on function public.can_view_assigned_journey_service(public.journey_services),public.has_assigned_journey_service(uuid),public.my_assigned_journey_services() from public,anon;
grant execute on function public.can_view_assigned_journey_service(public.journey_services),public.has_assigned_journey_service(uuid),public.my_assigned_journey_services() to authenticated;
revoke all on function public.sync_journey_service_settlement(),public.protect_journey_service_settlement(),public.notify_service_assignee(uuid,text,text,uuid,uuid),public.notify_journey_service_assignee(),public.notify_appointment_assignee(),public.notify_service_settlement_assignee() from public,anon,authenticated;
grant select on public.journey_service_settlements to authenticated;
grant insert,update,delete on public.journey_service_settlements to authenticated;

commit;
