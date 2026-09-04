begin;

create type public.care_journey_status as enum (
  'DRAFT','PLANNING','READY_FOR_CONFIRMATION','CONFIRMED','IN_PROGRESS','FOLLOW_UP','COMPLETED','CANCELLED'
);
create type public.journey_selection_state as enum (
  'ADMIN_SELECTED','PATIENT_TO_CHOOSE','PATIENT_SELECTED','NOT_REQUIRED'
);
create type public.journey_service_type as enum (
  'DOCTOR_CONSULTATION','HOSPITAL_PROCEDURE','LABORATORY','RADIOLOGY'
);
create type public.journey_service_status as enum (
  'PLANNED','REQUESTED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','ARCHIVED'
);

-- Bookings already parent appointments, finance, travel and clinical records.
-- Extend that aggregate so an Admin may open the journey before an offer exists.
alter table public.bookings
  alter column case_id drop not null,
  alter column offer_id drop not null,
  alter column provider_type drop not null,
  alter column treatment_id drop not null,
  add column journey_status public.care_journey_status not null default 'DRAFT',
  add column expected_start_date date,
  add column expected_end_date date,
  add column created_by uuid references auth.users(id) on delete restrict,
  add column coordination_notes text check (coordination_notes is null or char_length(coordination_notes) <= 4000),
  add constraint bookings_expected_dates_check check (
    expected_end_date is null or expected_start_date is null or expected_end_date >= expected_start_date
  );

do $$
declare constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.bookings'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%provider_type%hospital_id%'
  loop
    execute format('alter table public.bookings drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.bookings add constraint bookings_provider_scope_check check (
  num_nonnulls(hospital_id,pharmacy_id,radiology_center_id,medical_laboratory_id)<=1 and (
    (provider_type is null and num_nonnulls(hospital_id,pharmacy_id,radiology_center_id,medical_laboratory_id,doctor_id)=0) or
    (provider_type='HOSPITAL' and hospital_id is not null) or
    (provider_type='PHARMACY' and pharmacy_id is not null) or
    (provider_type='RADIOLOGY_CENTER' and radiology_center_id is not null) or
    (provider_type='MEDICAL_LABORATORY' and medical_laboratory_id is not null) or
    (provider_type='DOCTOR' and doctor_id is not null)
  )
);

update public.bookings set
  journey_status = case status
    when 'PENDING_CONFIRMATION' then 'PLANNING'::public.care_journey_status
    when 'CONFIRMED' then 'CONFIRMED'::public.care_journey_status
    when 'SCHEDULED' then 'CONFIRMED'::public.care_journey_status
    when 'IN_PROGRESS' then 'IN_PROGRESS'::public.care_journey_status
    when 'COMPLETED' then 'COMPLETED'::public.care_journey_status
    when 'CANCELLED' then 'CANCELLED'::public.care_journey_status
  end,
  expected_start_date = coalesce(planned_arrival,planned_care_date),
  expected_end_date = estimated_completion;

create table public.journey_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_type public.journey_service_type not null,
  selection_state public.journey_selection_state not null,
  status public.journey_service_status not null default 'PLANNED',
  title text not null check (char_length(title) between 2 and 240),
  doctor_id uuid references public.doctors(id) on delete restrict,
  hospital_id uuid references public.hospitals(id) on delete restrict,
  medical_laboratory_id uuid references public.medical_laboratories(id) on delete restrict,
  radiology_center_id uuid references public.radiology_centers(id) on delete restrict,
  planned_date date,
  notes text check (notes is null or char_length(notes) <= 3000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  check (
    selection_state in ('PATIENT_TO_CHOOSE','NOT_REQUIRED') or
    (service_type='DOCTOR_CONSULTATION' and doctor_id is not null) or
    (service_type='HOSPITAL_PROCEDURE' and hospital_id is not null) or
    (service_type='LABORATORY' and medical_laboratory_id is not null) or
    (service_type='RADIOLOGY' and radiology_center_id is not null)
  ),
  check (
    num_nonnulls(doctor_id,hospital_id,medical_laboratory_id,radiology_center_id) <= 1
  )
);
create index journey_services_booking_idx on public.journey_services(booking_id,service_type,status);
create unique index journey_services_one_committed_choice_idx
  on public.journey_services(booking_id,service_type)
  where status in ('CONFIRMED','IN_PROGRESS','COMPLETED');

-- Backfill one clinical coordination line for legacy provider bookings where possible.
insert into public.journey_services(
  booking_id,service_type,selection_state,status,title,doctor_id,hospital_id,medical_laboratory_id,radiology_center_id,created_by
)
select b.id,
  case b.provider_type
    when 'DOCTOR' then 'DOCTOR_CONSULTATION'::public.journey_service_type
    when 'HOSPITAL' then 'HOSPITAL_PROCEDURE'::public.journey_service_type
    when 'MEDICAL_LABORATORY' then 'LABORATORY'::public.journey_service_type
    when 'RADIOLOGY_CENTER' then 'RADIOLOGY'::public.journey_service_type
  end,
  'ADMIN_SELECTED',
  case when b.status in ('CONFIRMED','SCHEDULED','IN_PROGRESS','COMPLETED')
    then 'CONFIRMED'::public.journey_service_status else 'REQUESTED'::public.journey_service_status end,
  coalesce(o.title,'CareBridge clinical service'),
  case when b.provider_type='DOCTOR' then b.doctor_id end,
  case when b.provider_type='HOSPITAL' then b.hospital_id end,
  case when b.provider_type='MEDICAL_LABORATORY' then b.medical_laboratory_id end,
  case when b.provider_type='RADIOLOGY_CENTER' then b.radiology_center_id end,
  coalesce(o.created_by,b.patient_id)
from public.bookings b
left join public.offers o on o.id=b.offer_id
where b.provider_type in ('DOCTOR','HOSPITAL','MEDICAL_LABORATORY','RADIOLOGY_CENTER');

create function public.journey_has_clinical_service(target_booking_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.journey_services s
    where s.booking_id=target_booking_id
      and s.selection_state in ('ADMIN_SELECTED','PATIENT_SELECTED')
      and s.status in ('REQUESTED','CONFIRMED','IN_PROGRESS','COMPLETED')
      and (
        (s.service_type='DOCTOR_CONSULTATION' and s.doctor_id is not null) or
        (s.service_type='HOSPITAL_PROCEDURE' and s.hospital_id is not null) or
        (s.service_type='LABORATORY' and s.medical_laboratory_id is not null) or
        (s.service_type='RADIOLOGY' and s.radiology_center_id is not null)
      )
  );
$$;

create function public.create_admin_care_journey(
  target_patient uuid,
  target_type public.care_journey_type,
  target_start date default null,
  target_end date default null,
  target_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
  if not public.has_admin_privilege('bookings.manage') then raise exception 'care journey creation denied'; end if;
  if not exists(select 1 from public.profiles p where p.id=target_patient and p.account_status='ACTIVE')
    or not exists(select 1 from public.user_roles r where r.user_id=target_patient and r.role='PATIENT')
  then raise exception 'active patient account required'; end if;
  if target_end is not null and target_start is not null and target_end<target_start then raise exception 'invalid journey dates'; end if;
  insert into public.bookings(
    booking_reference,patient_id,journey_type,journey_timezone,journey_status,
    expected_start_date,expected_end_date,planned_arrival,estimated_completion,coordination_notes,created_by
  ) values (
    'CB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),target_patient,target_type,'UTC','DRAFT',
    target_start,target_end,target_start,target_end,target_notes,auth.uid()
  ) returning id into new_id;
  return new_id;
end; $$;

create function public.protect_care_journey_lifecycle()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.journey_status is not distinct from old.journey_status then return new; end if;
  if current_user not in ('postgres','supabase_admin','service_role')
    and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
    and not public.has_admin_privilege('bookings.manage')
  then raise exception 'care journey lifecycle change denied'; end if;
  if not (
    (old.journey_status='DRAFT' and new.journey_status in ('PLANNING','CANCELLED')) or
    (old.journey_status='PLANNING' and new.journey_status in ('DRAFT','READY_FOR_CONFIRMATION','CANCELLED')) or
    (old.journey_status='READY_FOR_CONFIRMATION' and new.journey_status in ('PLANNING','CONFIRMED','CANCELLED')) or
    (old.journey_status='CONFIRMED' and new.journey_status in ('IN_PROGRESS','CANCELLED')) or
    (old.journey_status='IN_PROGRESS' and new.journey_status in ('FOLLOW_UP','COMPLETED','CANCELLED')) or
    (old.journey_status='FOLLOW_UP' and new.journey_status in ('IN_PROGRESS','COMPLETED','CANCELLED'))
  ) then raise exception 'invalid care journey transition'; end if;
  if new.journey_status in ('READY_FOR_CONFIRMATION','CONFIRMED','IN_PROGRESS','FOLLOW_UP','COMPLETED')
    and not public.journey_has_clinical_service(old.id)
  then raise exception 'a valid clinical service is required before confirming a care journey'; end if;
  return new;
end; $$;

create function public.protect_care_journey_delete()
returns trigger language plpgsql set search_path='' as $$
begin
  if not public.has_admin_privilege('bookings.manage') then raise exception 'care journey delete denied'; end if;
  if old.journey_status not in ('DRAFT','PLANNING') then raise exception 'only draft or planning journeys may be deleted'; end if;
  if exists(select 1 from public.journey_services s where s.booking_id=old.id and s.status not in ('PLANNED','CANCELLED','ARCHIVED'))
    or exists(select 1 from public.appointments x where x.booking_id=old.id)
    or exists(select 1 from public.invoices x where x.booking_id=old.id)
    or exists(select 1 from public.accommodation_bookings x where x.booking_id=old.id)
    or exists(select 1 from public.travel_plans x where x.booking_id=old.id)
    or exists(select 1 from public.clinical_encounters x where x.booking_id=old.id)
    or exists(select 1 from public.lab_orders x where x.booking_id=old.id)
    or exists(select 1 from public.radiology_orders x where x.booking_id=old.id)
  then raise exception 'journey history must be preserved; cancel it instead'; end if;
  return old;
end; $$;

create function public.protect_journey_service_change()
returns trigger language plpgsql set search_path='' as $$
declare patient_owner boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return coalesce(new,old); end if;
  patient_owner := exists(select 1 from public.bookings b where b.id=coalesce(new.booking_id,old.booking_id) and b.patient_id=auth.uid());
  if tg_op='INSERT' then
    if not public.has_admin_privilege('bookings.manage') then raise exception 'journey service creation denied'; end if;
  elsif tg_op='DELETE' then
    if not public.has_admin_privilege('bookings.manage') then raise exception 'journey service delete denied'; end if;
    if old.status not in ('PLANNED','CANCELLED','ARCHIVED') then raise exception 'confirmed service history cannot be deleted'; end if;
  elsif patient_owner then
    if old.selection_state<>'PATIENT_TO_CHOOSE' or new.selection_state<>'PATIENT_SELECTED'
      or new.booking_id<>old.booking_id or new.service_type<>old.service_type or new.title<>old.title
    then raise exception 'patient journey selection change denied'; end if;
  elsif not public.has_admin_privilege('bookings.manage') then raise exception 'journey service update denied'; end if;
  if tg_op='UPDATE' and new.status is distinct from old.status and not(
    (old.status='PLANNED' and new.status in ('REQUESTED','CONFIRMED','CANCELLED')) or
    (old.status='REQUESTED' and new.status in ('PLANNED','CONFIRMED','CANCELLED')) or
    (old.status='CONFIRMED' and new.status in ('IN_PROGRESS','CANCELLED')) or
    (old.status='IN_PROGRESS' and new.status in ('COMPLETED','CANCELLED')) or
    (old.status in ('COMPLETED','CANCELLED') and new.status='ARCHIVED')
  ) then raise exception 'invalid journey service transition'; end if;
  if tg_op='UPDATE' and old.status in ('CONFIRMED','IN_PROGRESS','COMPLETED','ARCHIVED') and (
    new.booking_id<>old.booking_id or new.service_type<>old.service_type or new.selection_state<>old.selection_state
    or new.doctor_id is distinct from old.doctor_id or new.hospital_id is distinct from old.hospital_id
    or new.medical_laboratory_id is distinct from old.medical_laboratory_id or new.radiology_center_id is distinct from old.radiology_center_id
  ) then raise exception 'confirmed clinical service relationships are immutable'; end if;
  return coalesce(new,old);
end; $$;

create function public.record_care_journey_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.journey_status is distinct from old.journey_status then
    insert into public.journey_events(booking_id,event_type,related_entity_type,related_entity_id,status_label,created_by)
    values(new.id,'journey.'||lower(new.journey_status::text),'bookings',new.id,new.journey_status::text,auth.uid());
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
    values(new.patient_id,'journey.status','journey.notifications.statusTitle','journey.notifications.statusMessage','booking',new.id);
  end if;
  return new;
end; $$;

-- Preserve the original booking controls while permitting the Admin planning aggregate.
create or replace function public.protect_booking_change()
returns trigger language plpgsql set search_path='' as $$
declare is_admin boolean; is_patient boolean; is_manager boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  is_admin := public.has_admin_privilege('bookings.manage');
  if tg_op='INSERT' then
    if not is_admin then raise exception 'bookings are created only by an accepted offer or an administrator'; end if;
    return new;
  end if;
  is_patient:=old.patient_id=auth.uid(); is_manager:=public.can_manage_booking(old);
  if is_patient then
    if new.provider_notes is distinct from old.provider_notes or new.coordination_notes is distinct from old.coordination_notes
      or new.expected_start_date is distinct from old.expected_start_date or new.expected_end_date is distinct from old.expected_end_date
      or new.planned_arrival is distinct from old.planned_arrival or new.planned_care_date is distinct from old.planned_care_date
      or new.estimated_completion is distinct from old.estimated_completion or new.journey_status is distinct from old.journey_status
    then raise exception 'patient cannot edit coordinated journey fields'; end if;
    if new.status is distinct from old.status and not(old.status in ('PENDING_CONFIRMATION','CONFIRMED','SCHEDULED') and new.status='CANCELLED') then raise exception 'patient booking transition is not permitted'; end if;
  elsif is_admin then
    if old.journey_status not in ('DRAFT','PLANNING') and (
      new.patient_id is distinct from old.patient_id or new.case_id is distinct from old.case_id or new.offer_id is distinct from old.offer_id
      or new.provider_type is distinct from old.provider_type or new.treatment_id is distinct from old.treatment_id
    ) then raise exception 'confirmed journey relationships are immutable'; end if;
  elsif is_manager then
    if new.patient_id is distinct from old.patient_id or new.case_id is distinct from old.case_id or new.offer_id is distinct from old.offer_id
      or new.provider_type is distinct from old.provider_type or new.treatment_id is distinct from old.treatment_id
      or new.journey_status is distinct from old.journey_status then raise exception 'booking relationship fields are immutable'; end if;
    if new.patient_notes is distinct from old.patient_notes then raise exception 'provider cannot edit patient notes'; end if;
    if new.status is distinct from old.status and not(
      (old.status='PENDING_CONFIRMATION' and new.status in ('CONFIRMED','CANCELLED')) or
      (old.status='CONFIRMED' and new.status in ('SCHEDULED','CANCELLED')) or
      (old.status='SCHEDULED' and new.status in ('IN_PROGRESS','CANCELLED')) or
      (old.status='IN_PROGRESS' and new.status in ('COMPLETED','CANCELLED'))
    ) then raise exception 'booking status transition is not permitted'; end if;
  else raise exception 'booking update is not permitted'; end if;
  return new;
end; $$;

create or replace function public.create_booking_for_accepted_offer()
returns trigger language plpgsql security definer set search_path='' as $$
declare patient uuid; new_booking_id uuid; clinical_type public.journey_service_type;
begin
  if new.status='ACCEPTED' and old.status is distinct from 'ACCEPTED' then
    select patient_id into patient from public.medical_cases where id=new.case_id;
    insert into public.bookings(
      booking_reference,patient_id,case_id,offer_id,provider_type,hospital_id,pharmacy_id,radiology_center_id,
      medical_laboratory_id,doctor_id,treatment_id,planned_arrival,planned_care_date,estimated_completion,
      expected_start_date,expected_end_date,journey_status,created_by
    ) values (
      'CB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),patient,new.case_id,new.id,new.provider_type,
      new.hospital_id,new.pharmacy_id,new.radiology_center_id,new.medical_laboratory_id,new.doctor_id,new.treatment_id,
      new.proposed_start_date,new.proposed_start_date,new.proposed_end_date,new.proposed_start_date,new.proposed_end_date,'DRAFT',new.created_by
    ) returning id into new_booking_id;
    clinical_type:=case new.provider_type
      when 'DOCTOR' then 'DOCTOR_CONSULTATION'::public.journey_service_type
      when 'HOSPITAL' then 'HOSPITAL_PROCEDURE'::public.journey_service_type
      when 'MEDICAL_LABORATORY' then 'LABORATORY'::public.journey_service_type
      when 'RADIOLOGY_CENTER' then 'RADIOLOGY'::public.journey_service_type
      else null end;
    if clinical_type is not null then
      insert into public.journey_services(booking_id,service_type,selection_state,status,title,doctor_id,hospital_id,medical_laboratory_id,radiology_center_id,planned_date,created_by)
      values(
        new_booking_id,clinical_type,'PATIENT_SELECTED','REQUESTED',new.title,
        case when new.provider_type='DOCTOR' then new.doctor_id end,
        case when new.provider_type='HOSPITAL' then new.hospital_id end,
        case when new.provider_type='MEDICAL_LABORATORY' then new.medical_laboratory_id end,
        case when new.provider_type='RADIOLOGY_CENTER' then new.radiology_center_id end,
        new.proposed_start_date,new.created_by
      );
      update public.bookings set journey_status='PLANNING' where id=new_booking_id;
      update public.bookings set journey_status='READY_FOR_CONFIRMATION' where id=new_booking_id;
      update public.bookings set journey_status='CONFIRMED' where id=new_booking_id;
    else
      update public.bookings set journey_status='PLANNING' where id=new_booking_id;
    end if;
    update public.offers set status='EXPIRED' where case_id=new.case_id and id<>new.id and status in ('SENT','VIEWED');
  end if;
  return new;
end; $$;

alter table public.journey_services enable row level security;
create policy journey_services_scoped_read on public.journey_services for select to authenticated using(
  public.has_admin_privilege('bookings.manage') or exists(select 1 from public.bookings b where b.id=booking_id)
);
create policy journey_services_admin_insert on public.journey_services for insert to authenticated with check(public.has_admin_privilege('bookings.manage'));
create policy journey_services_scoped_update on public.journey_services for update to authenticated
  using(public.has_admin_privilege('bookings.manage') or exists(select 1 from public.bookings b where b.id=booking_id and b.patient_id=auth.uid()))
  with check(public.has_admin_privilege('bookings.manage') or exists(select 1 from public.bookings b where b.id=booking_id and b.patient_id=auth.uid()));
create policy journey_services_admin_delete on public.journey_services for delete to authenticated using(public.has_admin_privilege('bookings.manage'));
create policy bookings_admin_delete on public.bookings for delete to authenticated using(public.has_admin_privilege('bookings.manage'));

create trigger bookings_journey_lifecycle before update on public.bookings for each row execute function public.protect_care_journey_lifecycle();
create trigger bookings_journey_delete before delete on public.bookings for each row execute function public.protect_care_journey_delete();
create trigger bookings_journey_event after update on public.bookings for each row execute function public.record_care_journey_event();
create trigger journey_services_protect before insert or update or delete on public.journey_services for each row execute function public.protect_journey_service_change();
create trigger journey_services_updated before update on public.journey_services for each row execute function public.set_updated_at();
create trigger journey_services_audit after insert or update or delete on public.journey_services for each row execute function public.audit_admin_change();

grant select,insert,update,delete on public.journey_services to authenticated;
revoke all on function public.journey_has_clinical_service(uuid) from public,anon;
grant execute on function public.journey_has_clinical_service(uuid),public.create_admin_care_journey(uuid,public.care_journey_type,date,date,text) to authenticated;
revoke all on function public.create_admin_care_journey(uuid,public.care_journey_type,date,date,text) from public,anon;

commit;
