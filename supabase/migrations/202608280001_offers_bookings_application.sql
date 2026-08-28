alter type public.app_role add value if not exists 'PROVIDER';

begin;

create type public.case_provider_access_status as enum ('ACTIVE', 'REVOKED');
create type public.offer_status as enum ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');
create type public.booking_status as enum ('PENDING_CONFIRMATION', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

create table public.case_provider_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.medical_cases(id) on delete cascade,
  provider_type public.provider_type not null check (provider_type <> 'DOCTOR'),
  hospital_id uuid references public.hospitals(id) on delete cascade,
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  radiology_center_id uuid references public.radiology_centers(id) on delete cascade,
  medical_laboratory_id uuid references public.medical_laboratories(id) on delete cascade,
  status public.case_provider_access_status not null default 'ACTIVE',
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(hospital_id, pharmacy_id, radiology_center_id, medical_laboratory_id) = 1),
  check (
    (provider_type = 'HOSPITAL' and hospital_id is not null) or
    (provider_type = 'PHARMACY' and pharmacy_id is not null) or
    (provider_type = 'RADIOLOGY_CENTER' and radiology_center_id is not null) or
    (provider_type = 'MEDICAL_LABORATORY' and medical_laboratory_id is not null)
  )
);
create unique index case_provider_assignments_scope_uidx on public.case_provider_assignments(
  case_id, provider_type, coalesce(hospital_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(pharmacy_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(radiology_center_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(medical_laboratory_id, '00000000-0000-0000-0000-000000000000')
);
create index case_provider_assignments_case_idx on public.case_provider_assignments(case_id, status);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.medical_cases(id) on delete cascade,
  recommendation_id uuid references public.treatment_recommendations(id) on delete set null,
  provider_type public.provider_type not null,
  hospital_id uuid references public.hospitals(id) on delete restrict,
  pharmacy_id uuid references public.pharmacies(id) on delete restrict,
  radiology_center_id uuid references public.radiology_centers(id) on delete restrict,
  medical_laboratory_id uuid references public.medical_laboratories(id) on delete restrict,
  doctor_id uuid references public.doctors(id) on delete restrict,
  treatment_id uuid not null references public.treatments(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 180),
  description text not null check (char_length(description) between 10 and 8000),
  estimated_cost numeric(14,2) not null check (estimated_cost >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  estimated_stay_days smallint check (estimated_stay_days between 0 and 365),
  proposed_start_date date,
  proposed_end_date date,
  included_services text[] not null default '{}',
  excluded_services text[] not null default '{}',
  provider_notes text check (provider_notes is null or char_length(provider_notes) <= 4000),
  decision_note text check (decision_note is null or char_length(decision_note) <= 2000),
  valid_until timestamptz not null,
  status public.offer_status not null default 'DRAFT',
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (proposed_end_date is null or proposed_start_date is null or proposed_end_date >= proposed_start_date),
  check (valid_until > created_at),
  check (num_nonnulls(hospital_id, pharmacy_id, radiology_center_id, medical_laboratory_id) <= 1),
  check (
    (provider_type = 'HOSPITAL' and hospital_id is not null) or
    (provider_type = 'PHARMACY' and pharmacy_id is not null) or
    (provider_type = 'RADIOLOGY_CENTER' and radiology_center_id is not null) or
    (provider_type = 'MEDICAL_LABORATORY' and medical_laboratory_id is not null) or
    (provider_type = 'DOCTOR' and doctor_id is not null)
  )
);
create index offers_case_status_idx on public.offers(case_id, status, created_at desc);
create index offers_created_by_idx on public.offers(created_by, updated_at desc);
create unique index offers_one_accepted_per_case_uidx on public.offers(case_id) where status = 'ACCEPTED';

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique check (booking_reference ~ '^CB-[A-Z0-9]{10,20}$'),
  patient_id uuid not null references auth.users(id) on delete restrict,
  case_id uuid not null references public.medical_cases(id) on delete restrict,
  offer_id uuid not null unique references public.offers(id) on delete restrict,
  provider_type public.provider_type not null,
  hospital_id uuid references public.hospitals(id) on delete restrict,
  pharmacy_id uuid references public.pharmacies(id) on delete restrict,
  radiology_center_id uuid references public.radiology_centers(id) on delete restrict,
  medical_laboratory_id uuid references public.medical_laboratories(id) on delete restrict,
  doctor_id uuid references public.doctors(id) on delete restrict,
  treatment_id uuid not null references public.treatments(id) on delete restrict,
  planned_arrival date,
  planned_care_date date,
  estimated_completion date,
  status public.booking_status not null default 'PENDING_CONFIRMATION',
  patient_notes text check (patient_notes is null or char_length(patient_notes) <= 2000),
  provider_notes text check (provider_notes is null or char_length(provider_notes) <= 4000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (estimated_completion is null or planned_care_date is null or estimated_completion >= planned_care_date),
  check (num_nonnulls(hospital_id, pharmacy_id, radiology_center_id, medical_laboratory_id) <= 1),
  check (
    (provider_type = 'HOSPITAL' and hospital_id is not null) or
    (provider_type = 'PHARMACY' and pharmacy_id is not null) or
    (provider_type = 'RADIOLOGY_CENTER' and radiology_center_id is not null) or
    (provider_type = 'MEDICAL_LABORATORY' and medical_laboratory_id is not null) or
    (provider_type = 'DOCTOR' and doctor_id is not null)
  )
);
create index bookings_patient_status_idx on public.bookings(patient_id, status, updated_at desc);
create index bookings_case_idx on public.bookings(case_id);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default timezone('utc', now())
);
create index booking_events_booking_idx on public.booking_events(booking_id, created_at);

create function public.is_case_provider(
  target_case_id uuid, target_provider_type public.provider_type,
  target_hospital_id uuid default null, target_pharmacy_id uuid default null,
  target_radiology_center_id uuid default null, target_medical_laboratory_id uuid default null
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.case_provider_assignments a
    where a.case_id = target_case_id and a.status = 'ACTIVE' and a.provider_type = target_provider_type
      and a.hospital_id is not distinct from target_hospital_id
      and a.pharmacy_id is not distinct from target_pharmacy_id
      and a.radiology_center_id is not distinct from target_radiology_center_id
      and a.medical_laboratory_id is not distinct from target_medical_laboratory_id
      and (
        (a.hospital_id is not null and public.is_hospital_member(a.hospital_id)) or
        (a.pharmacy_id is not null and public.is_pharmacy_owner(a.pharmacy_id)) or
        (a.radiology_center_id is not null and public.is_radiology_center_owner(a.radiology_center_id)) or
        (a.medical_laboratory_id is not null and public.is_medical_laboratory_owner(a.medical_laboratory_id))
      )
  );
$$;

create or replace function public.can_access_medical_case(target_case_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_case_patient(target_case_id) or public.is_case_doctor(target_case_id)
    or exists (
      select 1 from public.case_provider_assignments a where a.case_id=target_case_id and a.status='ACTIVE'
        and public.is_case_provider(a.case_id,a.provider_type,a.hospital_id,a.pharmacy_id,a.radiology_center_id,a.medical_laboratory_id)
    ) or public.has_admin_privilege('cases.manage');
$$;

create function public.can_manage_offer(target_offer public.offers)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_admin_privilege('offers.manage')
    or (target_offer.provider_type = 'DOCTOR' and target_offer.doctor_id is not null
      and public.is_doctor_owner(target_offer.doctor_id) and public.is_case_doctor(target_offer.case_id))
    or public.is_case_provider(target_offer.case_id, target_offer.provider_type, target_offer.hospital_id,
      target_offer.pharmacy_id, target_offer.radiology_center_id, target_offer.medical_laboratory_id);
$$;

create function public.is_offer_patient(target_offer public.offers)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.medical_cases c where c.id = target_offer.case_id and c.patient_id = auth.uid());
$$;

create function public.protect_offer_change()
returns trigger language plpgsql set search_path = '' as $$
declare is_admin boolean; is_patient boolean; is_manager boolean; case_specialty uuid; treatment_specialty uuid;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role', true),'') = 'service_role' then return new; end if;
  is_admin := public.has_admin_privilege('offers.manage');
  is_patient := public.is_offer_patient(new);
  is_manager := public.can_manage_offer(new);
  if tg_op = 'INSERT' then
    if not (is_manager or is_admin) or new.status <> 'DRAFT' or new.created_by <> auth.uid() then raise exception 'offer creation is not permitted'; end if;
  else
    if new.case_id is distinct from old.case_id or new.provider_type is distinct from old.provider_type
      or new.hospital_id is distinct from old.hospital_id or new.pharmacy_id is distinct from old.pharmacy_id
      or new.radiology_center_id is distinct from old.radiology_center_id or new.medical_laboratory_id is distinct from old.medical_laboratory_id
      or new.created_by is distinct from old.created_by then raise exception 'offer ownership fields are immutable'; end if;
    if old.status <> 'DRAFT' and (new.treatment_id is distinct from old.treatment_id or new.title is distinct from old.title
      or new.description is distinct from old.description or new.estimated_cost is distinct from old.estimated_cost
      or new.currency is distinct from old.currency or new.estimated_stay_days is distinct from old.estimated_stay_days
      or new.proposed_start_date is distinct from old.proposed_start_date or new.proposed_end_date is distinct from old.proposed_end_date
      or new.included_services is distinct from old.included_services or new.excluded_services is distinct from old.excluded_services
      or new.provider_notes is distinct from old.provider_notes) then raise exception 'sent offer contents are locked'; end if;
    if is_patient then
      if not ((old.status in ('SENT','VIEWED') and new.status in ('VIEWED','ACCEPTED','REJECTED')) or new.status = old.status) then raise exception 'patient offer transition is not permitted'; end if;
    elsif is_manager or is_admin then
      if not ((old.status = 'DRAFT' and new.status in ('DRAFT','SENT','WITHDRAWN'))
        or (old.status in ('SENT','VIEWED') and new.status in (old.status,'WITHDRAWN','EXPIRED')) or new.status = old.status) then raise exception 'provider offer transition is not permitted'; end if;
      if new.decision_note is distinct from old.decision_note then raise exception 'provider cannot change patient decision note'; end if;
    else raise exception 'offer update is not permitted'; end if;
  end if;
  select specialty_id into case_specialty from public.medical_cases where id = new.case_id;
  select specialty_id into treatment_specialty from public.treatments where id = new.treatment_id and status = 'ACTIVE';
  if case_specialty is null or treatment_specialty is distinct from case_specialty then raise exception 'offer treatment must belong to case specialty'; end if;
  if new.recommendation_id is not null and not exists (
    select 1 from public.treatment_recommendations r
    where r.id=new.recommendation_id and r.case_id=new.case_id and r.treatment_id=new.treatment_id and r.status='SUBMITTED'
  ) then raise exception 'offer recommendation must belong to the case and treatment'; end if;
  if new.doctor_id is not null and not exists (select 1 from public.case_doctor_assignments a where a.case_id=new.case_id and a.doctor_id=new.doctor_id and a.status='ACTIVE') then raise exception 'offer doctor must be assigned to the case'; end if;
  if tg_op='UPDATE' and new.status = 'SENT' and old.status is distinct from 'SENT' then new.sent_at := timezone('utc',now()); end if;
  if tg_op='UPDATE' and new.status = 'VIEWED' and old.status is distinct from 'VIEWED' then new.viewed_at := timezone('utc',now()); end if;
  if tg_op='UPDATE' and new.status in ('ACCEPTED','REJECTED') and old.status is distinct from new.status then new.decided_at := timezone('utc',now()); end if;
  if new.status = 'ACCEPTED' and new.valid_until < timezone('utc',now()) then raise exception 'expired offer cannot be accepted'; end if;
  return new;
end; $$;

create function public.create_booking_for_accepted_offer()
returns trigger language plpgsql security definer set search_path = '' as $$
declare patient uuid; new_booking_id uuid;
begin
  if new.status = 'ACCEPTED' and old.status is distinct from 'ACCEPTED' then
    select patient_id into patient from public.medical_cases where id = new.case_id;
    insert into public.bookings(booking_reference,patient_id,case_id,offer_id,provider_type,hospital_id,pharmacy_id,radiology_center_id,medical_laboratory_id,doctor_id,treatment_id,planned_arrival,planned_care_date,estimated_completion)
    values ('CB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),patient,new.case_id,new.id,new.provider_type,new.hospital_id,new.pharmacy_id,new.radiology_center_id,new.medical_laboratory_id,new.doctor_id,new.treatment_id,new.proposed_start_date,new.proposed_start_date,new.proposed_end_date)
    returning id into new_booking_id;
    update public.offers set status='EXPIRED' where case_id=new.case_id and id<>new.id and status in ('SENT','VIEWED');
  end if;
  return new;
end; $$;

create function public.can_manage_booking(target_booking public.bookings)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_admin_privilege('bookings.manage')
    or (target_booking.doctor_id is not null and public.is_doctor_owner(target_booking.doctor_id) and public.is_case_doctor(target_booking.case_id))
    or public.is_case_provider(target_booking.case_id,target_booking.provider_type,target_booking.hospital_id,target_booking.pharmacy_id,target_booking.radiology_center_id,target_booking.medical_laboratory_id);
$$;

create function public.protect_booking_change()
returns trigger language plpgsql set search_path = '' as $$
declare is_admin boolean; is_patient boolean; is_manager boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  if tg_op = 'INSERT' then raise exception 'bookings are created only by accepting an offer'; end if;
  is_admin := public.has_admin_privilege('bookings.manage'); is_patient := old.patient_id=auth.uid(); is_manager := public.can_manage_booking(old);
  if new.patient_id is distinct from old.patient_id or new.case_id is distinct from old.case_id or new.offer_id is distinct from old.offer_id
    or new.provider_type is distinct from old.provider_type or new.treatment_id is distinct from old.treatment_id then raise exception 'booking relationship fields are immutable'; end if;
  if is_patient then
    if new.provider_notes is distinct from old.provider_notes or new.planned_arrival is distinct from old.planned_arrival or new.planned_care_date is distinct from old.planned_care_date or new.estimated_completion is distinct from old.estimated_completion then raise exception 'patient cannot edit provider booking fields'; end if;
    if new.status is distinct from old.status and not (old.status in ('PENDING_CONFIRMATION','CONFIRMED','SCHEDULED') and new.status='CANCELLED') then raise exception 'patient booking transition is not permitted'; end if;
  elsif is_manager or is_admin then
    if new.patient_notes is distinct from old.patient_notes then raise exception 'provider cannot edit patient notes'; end if;
    if new.status is distinct from old.status and not (
      (old.status='PENDING_CONFIRMATION' and new.status in ('CONFIRMED','CANCELLED')) or
      (old.status='CONFIRMED' and new.status in ('SCHEDULED','CANCELLED')) or
      (old.status='SCHEDULED' and new.status in ('IN_PROGRESS','CANCELLED')) or
      (old.status='IN_PROGRESS' and new.status in ('COMPLETED','CANCELLED'))
    ) then raise exception 'booking status transition is not permitted'; end if;
  else raise exception 'booking update is not permitted'; end if;
  return new;
end; $$;

create function public.record_booking_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into public.booking_events(booking_id,from_status,to_status,changed_by)
    values (new.id,case when tg_op='INSERT' then null else old.status end,new.status,auth.uid());
  end if; return new;
end; $$;

create function public.notify_part4_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare patient uuid; creator uuid; event_key text;
begin
  if tg_table_name='offers' then
    select patient_id into patient from public.medical_cases where id=new.case_id; creator:=new.created_by;
    if new.status='SENT' and old.status is distinct from 'SENT' then event_key:='offer.sent';
      insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(patient,event_key,'part4.notifications.offerSentTitle','part4.notifications.offerSentMessage','offer',new.id);
    elsif new.status='VIEWED' and old.status is distinct from 'VIEWED' then event_key:='offer.viewed';
      insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(creator,event_key,'part4.notifications.offerViewedTitle','part4.notifications.offerViewedMessage','offer',new.id);
    elsif new.status='ACCEPTED' and old.status is distinct from 'ACCEPTED' then event_key:='offer.accepted';
      insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(creator,event_key,'part4.notifications.offerAcceptedTitle','part4.notifications.offerAcceptedMessage','offer',new.id);
    elsif new.status='REJECTED' and old.status is distinct from 'REJECTED' then event_key:='offer.rejected';
      insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(creator,event_key,'part4.notifications.offerRejectedTitle','part4.notifications.offerRejectedMessage','offer',new.id);
    end if;
  elsif tg_table_name='bookings' then
    if tg_op='INSERT' then
      insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(new.patient_id,'booking.created','part4.notifications.bookingCreatedTitle','part4.notifications.bookingCreatedMessage','booking',new.id);
    elsif new.status is distinct from old.status then
      insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(new.patient_id,'booking.status','part4.notifications.bookingStatusTitle','part4.notifications.bookingStatusMessage','booking',new.id);
    end if;
  end if; return new;
end; $$;

alter table public.case_provider_assignments enable row level security;
alter table public.offers enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;

create policy case_provider_assignments_scoped_read on public.case_provider_assignments for select to authenticated using (
  public.is_case_patient(case_id) or public.is_case_provider(case_id,provider_type,hospital_id,pharmacy_id,radiology_center_id,medical_laboratory_id) or public.has_admin_privilege('cases.manage'));
create policy case_provider_assignments_admin_write on public.case_provider_assignments for all to authenticated
  using (public.has_admin_privilege('cases.assign')) with check (public.has_admin_privilege('cases.assign'));

create policy offers_scoped_read on public.offers for select to authenticated using (public.is_offer_patient(offers) or public.can_manage_offer(offers) or public.has_admin_privilege('offers.manage'));
create policy offers_manager_insert on public.offers for insert to authenticated with check (public.can_manage_offer(offers) or public.has_admin_privilege('offers.manage'));
create policy offers_scoped_update on public.offers for update to authenticated using (public.is_offer_patient(offers) or public.can_manage_offer(offers) or public.has_admin_privilege('offers.manage')) with check (public.is_offer_patient(offers) or public.can_manage_offer(offers) or public.has_admin_privilege('offers.manage'));

create policy bookings_scoped_read on public.bookings for select to authenticated using (patient_id=auth.uid() or public.can_manage_booking(bookings) or public.has_admin_privilege('bookings.manage'));
create policy bookings_trigger_insert on public.bookings for insert to authenticated with check (public.has_admin_privilege('bookings.manage'));
create policy bookings_scoped_update on public.bookings for update to authenticated using (patient_id=auth.uid() or public.can_manage_booking(bookings) or public.has_admin_privilege('bookings.manage')) with check (patient_id=auth.uid() or public.can_manage_booking(bookings) or public.has_admin_privilege('bookings.manage'));
create policy booking_events_scoped_read on public.booking_events for select to authenticated using (exists (select 1 from public.bookings b where b.id=booking_id));

create trigger case_provider_assignments_updated before update on public.case_provider_assignments for each row execute function public.set_updated_at();
create trigger offers_protect before insert or update on public.offers for each row execute function public.protect_offer_change();
create trigger offers_updated before update on public.offers for each row execute function public.set_updated_at();
create trigger offers_booking after update on public.offers for each row execute function public.create_booking_for_accepted_offer();
create trigger offers_notify after update on public.offers for each row execute function public.notify_part4_event();
create trigger bookings_protect before insert or update on public.bookings for each row execute function public.protect_booking_change();
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();
create trigger bookings_history after insert or update on public.bookings for each row execute function public.record_booking_event();
create trigger bookings_notify after insert or update on public.bookings for each row execute function public.notify_part4_event();
create trigger case_provider_assignments_audit after insert or update or delete on public.case_provider_assignments for each row execute function public.audit_admin_change();
create trigger offers_audit after insert or update or delete on public.offers for each row execute function public.audit_admin_change();
create trigger bookings_audit after insert or update or delete on public.bookings for each row execute function public.audit_admin_change();

revoke all on function public.is_case_provider(uuid,public.provider_type,uuid,uuid,uuid,uuid) from public;
revoke all on function public.can_manage_offer(public.offers) from public;
revoke all on function public.is_offer_patient(public.offers) from public;
revoke all on function public.can_manage_booking(public.bookings) from public;
grant execute on function public.is_case_provider(uuid,public.provider_type,uuid,uuid,uuid,uuid), public.can_manage_offer(public.offers), public.is_offer_patient(public.offers), public.can_manage_booking(public.bookings) to authenticated;
grant select on table public.case_provider_assignments, public.offers, public.bookings, public.booking_events to authenticated;
grant insert,update,delete on table public.case_provider_assignments, public.offers, public.bookings to authenticated;

commit;
