begin;

create type public.care_journey_type as enum ('LOCAL_CARE', 'INTERNATIONAL_MEDICAL_TRAVEL');
create type public.appointment_type as enum ('CONSULTATION', 'PRE_TREATMENT_ASSESSMENT', 'TREATMENT_PROCEDURE', 'FOLLOW_UP', 'LAB_RADIOLOGY', 'DISCHARGE_FINAL_REVIEW');
create type public.appointment_status as enum ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
create type public.invoice_status as enum ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');
create type public.payment_method as enum ('BANK_TRANSFER', 'CASH', 'CARD_AT_PROVIDER', 'OTHER');
create type public.accommodation_mode as enum ('NOT_REQUIRED', 'SELF_ARRANGED', 'COORDINATED');
create type public.transport_type as enum ('AIRPORT_PICKUP', 'HOTEL_TO_HOSPITAL', 'HOSPITAL_TO_HOTEL', 'LOCAL_TRANSPORT', 'DISCHARGE_TRANSPORT');
create type public.transport_status as enum ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

alter table public.bookings
  add column journey_type public.care_journey_type not null default 'LOCAL_CARE',
  add column journey_timezone text not null default 'UTC' check (char_length(journey_timezone) between 1 and 80);
create index bookings_journey_type_status_idx on public.bookings(journey_type, status, updated_at desc);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete restrict,
  provider_type public.provider_type not null,
  hospital_id uuid references public.hospitals(id) on delete restrict,
  pharmacy_id uuid references public.pharmacies(id) on delete restrict,
  radiology_center_id uuid references public.radiology_centers(id) on delete restrict,
  medical_laboratory_id uuid references public.medical_laboratories(id) on delete restrict,
  doctor_id uuid references public.doctors(id) on delete restrict,
  appointment_type public.appointment_type not null,
  scheduled_at timestamptz not null,
  timezone text not null check (char_length(timezone) between 1 and 80),
  duration_minutes smallint not null check (duration_minutes between 5 and 720),
  location_name text not null check (char_length(location_name) between 2 and 300),
  location_details text check (location_details is null or char_length(location_details) <= 1000),
  status public.appointment_status not null default 'REQUESTED',
  instructions text check (instructions is null or char_length(instructions) <= 4000),
  patient_notes text check (patient_notes is null or char_length(patient_notes) <= 2000),
  provider_notes text check (provider_notes is null or char_length(provider_notes) <= 4000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(hospital_id, pharmacy_id, radiology_center_id, medical_laboratory_id) <= 1),
  check (
    (provider_type = 'HOSPITAL' and hospital_id is not null) or
    (provider_type = 'PHARMACY' and pharmacy_id is not null) or
    (provider_type = 'RADIOLOGY_CENTER' and radiology_center_id is not null) or
    (provider_type = 'MEDICAL_LABORATORY' and medical_laboratory_id is not null) or
    (provider_type = 'DOCTOR' and doctor_id is not null)
  )
);
create index appointments_booking_time_idx on public.appointments(booking_id, scheduled_at desc);
create index appointments_patient_time_idx on public.appointments(patient_id, scheduled_at desc);
create index appointments_doctor_time_idx on public.appointments(doctor_id, scheduled_at desc) where doctor_id is not null;
create index appointments_status_time_idx on public.appointments(status, scheduled_at desc);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique check (invoice_number ~ '^CBI-[A-Z0-9]{10,20}$'),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  offer_id uuid not null references public.offers(id) on delete restrict,
  patient_id uuid not null references auth.users(id) on delete restrict,
  provider_type public.provider_type not null,
  hospital_id uuid references public.hospitals(id) on delete restrict,
  pharmacy_id uuid references public.pharmacies(id) on delete restrict,
  radiology_center_id uuid references public.radiology_centers(id) on delete restrict,
  medical_laboratory_id uuid references public.medical_laboratories(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  due_date date,
  status public.invoice_status not null default 'DRAFT',
  notes text check (notes is null or char_length(notes) <= 4000),
  issued_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (amount_paid <= total_amount or status = 'REFUNDED'),
  check (num_nonnulls(hospital_id, pharmacy_id, radiology_center_id, medical_laboratory_id) <= 1),
  check (
    (provider_type = 'HOSPITAL' and hospital_id is not null) or
    (provider_type = 'PHARMACY' and pharmacy_id is not null) or
    (provider_type = 'RADIOLOGY_CENTER' and radiology_center_id is not null) or
    (provider_type = 'MEDICAL_LABORATORY' and medical_laboratory_id is not null) or
    provider_type = 'DOCTOR'
  )
);
create index invoices_booking_created_idx on public.invoices(booking_id, created_at desc);
create index invoices_patient_status_idx on public.invoices(patient_id, status, due_date);
create index invoices_provider_status_idx on public.invoices(provider_type, status, created_at desc);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null check (char_length(description) between 2 and 500),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_amount numeric(14,2) not null check (unit_amount >= 0),
  line_amount numeric(14,2) generated always as (round(quantity * unit_amount, 2)) stored,
  display_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index invoice_items_invoice_order_idx on public.invoice_items(invoice_id, display_order, created_at);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  patient_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  paid_at timestamptz not null,
  method public.payment_method not null,
  reference_number text check (reference_number is null or char_length(reference_number) <= 180),
  notes text check (notes is null or char_length(notes) <= 2000),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);
create index payment_records_invoice_paid_idx on public.payment_records(invoice_id, paid_at desc);
create index payment_records_booking_paid_idx on public.payment_records(booking_id, paid_at desc);

create table public.payment_documents (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payment_records(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique check (object_path !~ '(^|/)\.\.(/|$)'),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);
create index payment_documents_payment_idx on public.payment_documents(payment_id, created_at desc);

create table public.travel_plans (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete restrict,
  arrival_at timestamptz,
  departure_at timestamptz,
  airline text check (airline is null or char_length(airline) <= 180),
  arrival_flight_number text check (arrival_flight_number is null or char_length(arrival_flight_number) <= 40),
  departure_flight_number text check (departure_flight_number is null or char_length(departure_flight_number) <= 40),
  origin_airport text check (origin_airport is null or char_length(origin_airport) <= 180),
  destination_airport text check (destination_airport is null or char_length(destination_airport) <= 180),
  arrival_terminal text check (arrival_terminal is null or char_length(arrival_terminal) <= 80),
  travel_notes text check (travel_notes is null or char_length(travel_notes) <= 3000),
  accommodation_mode public.accommodation_mode not null default 'NOT_REQUIRED',
  accommodation_name text check (accommodation_name is null or char_length(accommodation_name) <= 240),
  accommodation_address text check (accommodation_address is null or char_length(accommodation_address) <= 500),
  check_in_date date,
  check_out_date date,
  accommodation_reference text check (accommodation_reference is null or char_length(accommodation_reference) <= 180),
  accommodation_notes text check (accommodation_notes is null or char_length(accommodation_notes) <= 2000),
  companion_name text check (companion_name is null or char_length(companion_name) <= 180),
  companion_relationship text check (companion_relationship is null or char_length(companion_relationship) <= 120),
  companion_contact text check (companion_contact is null or char_length(companion_contact) <= 240),
  companion_notes text check (companion_notes is null or char_length(companion_notes) <= 1000),
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (departure_at is null or arrival_at is null or departure_at >= arrival_at),
  check (check_out_date is null or check_in_date is null or check_out_date >= check_in_date),
  check (accommodation_mode <> 'COORDINATED' or accommodation_name is not null)
);
create index travel_plans_patient_idx on public.travel_plans(patient_id, updated_at desc);

create table public.transport_arrangements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete restrict,
  transport_type public.transport_type not null,
  pickup_at timestamptz not null,
  pickup_location text not null check (char_length(pickup_location) between 2 and 500),
  destination text not null check (char_length(destination) between 2 and 500),
  provider_label text check (provider_label is null or char_length(provider_label) <= 180),
  contact text check (contact is null or char_length(contact) <= 240),
  status public.transport_status not null default 'PLANNED',
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index transport_booking_pickup_idx on public.transport_arrangements(booking_id, pickup_at);
create index transport_status_pickup_idx on public.transport_arrangements(status, pickup_at);

create table public.journey_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z0-9_.-]+$'),
  related_entity_type text check (related_entity_type is null or char_length(related_entity_type) <= 80),
  related_entity_id uuid,
  status_label text check (status_label is null or char_length(status_label) <= 80),
  occurred_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);
create index journey_events_booking_time_idx on public.journey_events(booking_id, occurred_at desc);

create function public.is_booking_patient(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bookings where id=target_booking_id and patient_id=auth.uid());
$$;
create function public.is_booking_provider(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b where b.id=target_booking_id
      and public.is_case_provider(b.case_id,b.provider_type,b.hospital_id,b.pharmacy_id,b.radiology_center_id,b.medical_laboratory_id)
  );
$$;
create function public.is_booking_doctor(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b where b.id=target_booking_id and b.doctor_id is not null
      and public.is_doctor_owner(b.doctor_id) and public.is_case_doctor(b.case_id)
  );
$$;
create function public.can_schedule_booking(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_booking_provider(target_booking_id) or public.is_booking_doctor(target_booking_id)
    or public.has_admin_privilege('appointments.manage');
$$;
create function public.can_manage_booking_finance(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_booking_provider(target_booking_id) or public.has_admin_privilege('finance.manage');
$$;
create function public.can_manage_booking_travel(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_booking_provider(target_booking_id) or public.has_admin_privilege('travel.manage');
$$;

create function public.protect_appointment_change()
returns trigger language plpgsql set search_path='' as $$
declare booking public.bookings; patient_user boolean; manager boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into booking from public.bookings where id=new.booking_id;
  if booking.id is null or new.patient_id<>booking.patient_id or new.provider_type<>booking.provider_type
    or new.hospital_id is distinct from booking.hospital_id or new.pharmacy_id is distinct from booking.pharmacy_id
    or new.radiology_center_id is distinct from booking.radiology_center_id or new.medical_laboratory_id is distinct from booking.medical_laboratory_id
    or (new.doctor_id is not null and not public.is_doctor_assigned_to_case(booking.case_id,new.doctor_id)) then raise exception 'appointment relationship does not match booking'; end if;
  patient_user:=booking.patient_id=auth.uid(); manager:=public.can_schedule_booking(new.booking_id);
  if tg_op='INSERT' then
    if not manager or new.created_by<>auth.uid() or new.status<>'REQUESTED' then raise exception 'appointment creation is not permitted'; end if;
  else
    if new.booking_id is distinct from old.booking_id or new.patient_id is distinct from old.patient_id or new.provider_type is distinct from old.provider_type or new.created_by is distinct from old.created_by then raise exception 'appointment relationship fields are immutable'; end if;
    if patient_user then
      if new.status is distinct from old.status and not (old.status in ('REQUESTED','CONFIRMED','RESCHEDULED') and new.status='CANCELLED') then raise exception 'patient appointment transition is not permitted'; end if;
      if new.scheduled_at is distinct from old.scheduled_at or new.timezone is distinct from old.timezone
        or new.duration_minutes is distinct from old.duration_minutes or new.location_name is distinct from old.location_name
        or new.location_details is distinct from old.location_details or new.appointment_type is distinct from old.appointment_type
        or new.doctor_id is distinct from old.doctor_id or new.provider_notes is distinct from old.provider_notes
        or new.instructions is distinct from old.instructions then raise exception 'patient cannot edit provider appointment fields'; end if;
    elsif manager then
      if new.patient_notes is distinct from old.patient_notes then raise exception 'provider cannot edit patient appointment notes'; end if;
      if new.status is distinct from old.status and not (
        (old.status='REQUESTED' and new.status in ('CONFIRMED','RESCHEDULED','CANCELLED')) or
        (old.status in ('CONFIRMED','RESCHEDULED') and new.status in ('RESCHEDULED','COMPLETED','CANCELLED','NO_SHOW'))
      ) then raise exception 'appointment transition is not permitted'; end if;
    else raise exception 'appointment update is not permitted'; end if;
  end if;
  return new;
end; $$;

create function public.protect_invoice_change()
returns trigger language plpgsql set search_path='' as $$
declare booking public.bookings; manager boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into booking from public.bookings where id=new.booking_id; manager:=public.can_manage_booking_finance(new.booking_id);
  if not manager then raise exception 'invoice change is not permitted'; end if;
  if booking.id is null or new.patient_id<>booking.patient_id or new.offer_id<>booking.offer_id or new.provider_type<>booking.provider_type
    or new.hospital_id is distinct from booking.hospital_id or new.pharmacy_id is distinct from booking.pharmacy_id
    or new.radiology_center_id is distinct from booking.radiology_center_id or new.medical_laboratory_id is distinct from booking.medical_laboratory_id then raise exception 'invoice relationship does not match booking'; end if;
  if tg_op='INSERT' then
    if new.status<>'DRAFT' or new.created_by<>auth.uid() then raise exception 'invoice must begin as a draft'; end if;
  else
    if new.booking_id is distinct from old.booking_id or new.offer_id is distinct from old.offer_id or new.patient_id is distinct from old.patient_id or new.provider_type is distinct from old.provider_type or new.created_by is distinct from old.created_by then raise exception 'invoice relationship fields are immutable'; end if;
    if old.status<>'DRAFT' and (new.currency is distinct from old.currency or new.due_date is distinct from old.due_date or new.notes is distinct from old.notes) then raise exception 'issued invoice contents are locked'; end if;
    if new.subtotal is distinct from old.subtotal or new.total_amount is distinct from old.total_amount or new.amount_paid is distinct from old.amount_paid then raise exception 'invoice totals are server managed'; end if;
    if new.status is distinct from old.status and not (
      (old.status='DRAFT' and new.status in ('ISSUED','CANCELLED')) or
      (old.status in ('ISSUED','PARTIALLY_PAID','OVERDUE') and new.status in ('PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')) or
      (old.status='PAID' and new.status='REFUNDED')
    ) then raise exception 'invoice transition is not permitted'; end if;
  end if;
  if new.status='ISSUED' and (tg_op='INSERT' or old.status is distinct from 'ISSUED') then new.issued_at:=timezone('utc',now()); end if;
  return new;
end; $$;

create function public.protect_invoice_item_change()
returns trigger language plpgsql set search_path='' as $$
declare target_invoice uuid; invoice_status public.invoice_status;
begin
  target_invoice:=case when tg_op='DELETE' then old.invoice_id else new.invoice_id end;
  select status into invoice_status from public.invoices where id=target_invoice;
  if current_user not in ('postgres','supabase_admin','service_role') and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then
    if invoice_status<>'DRAFT' or not public.can_manage_booking_finance((select booking_id from public.invoices where id=target_invoice)) then raise exception 'invoice item change is not permitted'; end if;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

create function public.recalculate_invoice(target_invoice_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare item_total numeric(14,2); paid_total numeric(14,2); current_status public.invoice_status;
begin
  select coalesce(sum(line_amount),0) into item_total from public.invoice_items where invoice_id=target_invoice_id;
  select coalesce(sum(amount),0) into paid_total from public.payment_records where invoice_id=target_invoice_id;
  select status into current_status from public.invoices where id=target_invoice_id;
  update public.invoices set subtotal=item_total,total_amount=item_total,amount_paid=least(paid_total,item_total),
    status=case when current_status in ('CANCELLED','REFUNDED','DRAFT') then current_status when item_total>0 and paid_total>=item_total then 'PAID'::public.invoice_status when paid_total>0 then 'PARTIALLY_PAID'::public.invoice_status else current_status end
  where id=target_invoice_id;
end; $$;
create function public.sync_invoice_totals()
returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.recalculate_invoice(case when tg_op='DELETE' then old.invoice_id else new.invoice_id end); if tg_op='DELETE' then return old; else return new; end if; end; $$;

create function public.protect_payment_record()
returns trigger language plpgsql set search_path='' as $$
declare invoice public.invoices;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into invoice from public.invoices where id=new.invoice_id;
  if invoice.id is null or not public.can_manage_booking_finance(invoice.booking_id) or new.booking_id<>invoice.booking_id or new.patient_id<>invoice.patient_id or new.currency<>invoice.currency or new.recorded_by<>auth.uid() or invoice.status not in ('ISSUED','PARTIALLY_PAID','OVERDUE') then raise exception 'payment recording is not permitted'; end if;
  if new.amount > invoice.total_amount-invoice.amount_paid then raise exception 'payment exceeds outstanding amount'; end if;
  return new;
end; $$;

create function public.protect_payment_document()
returns trigger language plpgsql set search_path='' as $$
declare payment public.payment_records;
begin
  select * into payment from public.payment_records where id=new.payment_id;
  if payment.id is null or new.booking_id<>payment.booking_id or new.patient_id<>payment.patient_id
    or new.uploaded_by<>auth.uid() or not public.can_manage_booking_finance(payment.booking_id)
    or new.mime_type not in ('application/pdf','image/jpeg','image/png','image/webp')
    or new.object_path not like new.patient_id::text||'/'||new.booking_id::text||'/'||new.payment_id::text||'/%'
    then raise exception 'payment document is not permitted'; end if;
  return new;
end; $$;

create function public.protect_travel_plan_change()
returns trigger language plpgsql set search_path='' as $$
declare booking public.bookings;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into booking from public.bookings where id=new.booking_id;
  if booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' or new.patient_id<>booking.patient_id or not public.can_manage_booking_travel(new.booking_id) or new.updated_by<>auth.uid() then raise exception 'travel plan change is not permitted'; end if;
  if tg_op='UPDATE' and (new.booking_id is distinct from old.booking_id or new.patient_id is distinct from old.patient_id) then raise exception 'travel plan relationship fields are immutable'; end if;
  return new;
end; $$;
create function public.protect_transport_change()
returns trigger language plpgsql set search_path='' as $$
declare booking public.bookings;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into booking from public.bookings where id=new.booking_id;
  if new.patient_id<>booking.patient_id or not public.can_manage_booking_travel(new.booking_id) then raise exception 'transport change is not permitted'; end if;
  if tg_op='INSERT' and new.created_by<>auth.uid() then raise exception 'transport creator does not match user'; end if;
  if tg_op='UPDATE' and (new.booking_id is distinct from old.booking_id or new.patient_id is distinct from old.patient_id or new.created_by is distinct from old.created_by) then raise exception 'transport relationship fields are immutable'; end if;
  return new;
end; $$;
create function public.protect_booking_journey_type()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.journey_type is distinct from old.journey_type then
    if current_user not in ('postgres','supabase_admin','service_role') and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' and not public.can_manage_booking_travel(old.id) then raise exception 'journey type change is not permitted'; end if;
    if new.journey_type='LOCAL_CARE' and exists(select 1 from public.travel_plans where booking_id=old.id) then raise exception 'remove international travel details before selecting local care'; end if;
  end if;
  return new;
end; $$;

create function public.record_part5_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare booking uuid; event_name text; related_id uuid; status_value text;
begin
  booking:=case when tg_table_name='invoices' then new.booking_id when tg_table_name='payment_records' then new.booking_id when tg_table_name='travel_plans' then new.booking_id when tg_table_name='transport_arrangements' then new.booking_id else new.booking_id end;
  related_id:=new.id;
  if tg_table_name='appointments' and (tg_op='INSERT' or new.status is distinct from old.status) then event_name:='appointment.'||lower(new.status::text);status_value:=new.status::text;
  elsif tg_table_name='invoices' and (tg_op='INSERT' or new.status is distinct from old.status) then event_name:='invoice.'||lower(new.status::text);status_value:=new.status::text;
  elsif tg_table_name='payment_records' then event_name:='payment.recorded';status_value:='RECORDED';
  elsif tg_table_name='travel_plans' then event_name:='travel.updated';status_value:=new.accommodation_mode::text;
  elsif tg_table_name='transport_arrangements' and (tg_op='INSERT' or new.status is distinct from old.status) then event_name:='transport.'||lower(new.status::text);status_value:=new.status::text;
  else return new; end if;
  insert into public.journey_events(booking_id,event_type,related_entity_type,related_entity_id,status_label,created_by)
  values(booking,event_name,tg_table_name,related_id,status_value,auth.uid());
  return new;
end; $$;

create function public.notify_part5_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare patient uuid; event_key text; entity_name text;
begin
  patient:=new.patient_id;entity_name:=case when tg_table_name='appointments' then 'appointment' when tg_table_name='invoices' then 'invoice' when tg_table_name='payment_records' then 'payment' when tg_table_name='travel_plans' then 'booking' else 'booking' end;
  if tg_table_name='appointments' and (tg_op='INSERT' or new.status is distinct from old.status) then event_key:='appointment.'||lower(new.status::text);
  elsif tg_table_name='invoices' and new.status='ISSUED' and old.status is distinct from 'ISSUED' then event_key:='invoice.issued';
  elsif tg_table_name='payment_records' then event_key:='payment.recorded';
  elsif tg_table_name='travel_plans' then event_key:='travel.updated';
  elsif tg_table_name='transport_arrangements' and (tg_op='INSERT' or new.status is distinct from old.status) then event_key:='transport.'||lower(new.status::text);
  else return new; end if;
  insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
  values(patient,event_key,'part5.notifications.'||replace(event_key,'.','')||'Title','part5.notifications.'||replace(event_key,'.','')||'Message',entity_name,new.id);
  return new;
end; $$;

create function public.can_access_payment_proof(object_name text, write_access boolean default false)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]; path_patient uuid; path_booking uuid;
begin
  parts:=storage.foldername(object_name); if array_length(parts,1)<4 then return false; end if;
  begin path_patient:=parts[1]::uuid;path_booking:=parts[2]::uuid;exception when invalid_text_representation then return false;end;
  if not exists(select 1 from public.bookings where id=path_booking and patient_id=path_patient) then return false; end if;
  if write_access then return public.can_manage_booking_finance(path_booking); end if;
  return path_patient=auth.uid() or public.can_manage_booking_finance(path_booking);
end; $$;

alter table public.appointments enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payment_records enable row level security;
alter table public.payment_documents enable row level security;
alter table public.travel_plans enable row level security;
alter table public.transport_arrangements enable row level security;
alter table public.journey_events enable row level security;

create policy appointments_scoped_read on public.appointments for select to authenticated using (patient_id=auth.uid() or public.can_schedule_booking(booking_id));
create policy appointments_manager_insert on public.appointments for insert to authenticated with check (public.can_schedule_booking(booking_id));
create policy appointments_scoped_update on public.appointments for update to authenticated using (patient_id=auth.uid() or public.can_schedule_booking(booking_id)) with check (patient_id=auth.uid() or public.can_schedule_booking(booking_id));
create policy invoices_scoped_read on public.invoices for select to authenticated using (patient_id=auth.uid() or public.can_manage_booking_finance(booking_id));
create policy invoices_manager_write on public.invoices for all to authenticated using (public.can_manage_booking_finance(booking_id)) with check (public.can_manage_booking_finance(booking_id));
create policy invoice_items_scoped_read on public.invoice_items for select to authenticated using (exists(select 1 from public.invoices i where i.id=invoice_id and (i.patient_id=auth.uid() or public.can_manage_booking_finance(i.booking_id))));
create policy invoice_items_manager_write on public.invoice_items for all to authenticated using (exists(select 1 from public.invoices i where i.id=invoice_id and public.can_manage_booking_finance(i.booking_id))) with check (exists(select 1 from public.invoices i where i.id=invoice_id and public.can_manage_booking_finance(i.booking_id)));
create policy payments_scoped_read on public.payment_records for select to authenticated using (patient_id=auth.uid() or public.can_manage_booking_finance(booking_id));
create policy payments_manager_insert on public.payment_records for insert to authenticated with check (public.can_manage_booking_finance(booking_id));
create policy payment_documents_scoped_read on public.payment_documents for select to authenticated using (patient_id=auth.uid() or public.can_manage_booking_finance(booking_id));
create policy payment_documents_manager_insert on public.payment_documents for insert to authenticated with check (public.can_manage_booking_finance(booking_id));
create policy payment_documents_manager_delete on public.payment_documents for delete to authenticated using (public.can_manage_booking_finance(booking_id));
create policy travel_plans_scoped_read on public.travel_plans for select to authenticated using (patient_id=auth.uid() or public.can_manage_booking_travel(booking_id));
create policy travel_plans_manager_write on public.travel_plans for all to authenticated using (public.can_manage_booking_travel(booking_id)) with check (public.can_manage_booking_travel(booking_id));
create policy transport_scoped_read on public.transport_arrangements for select to authenticated using (patient_id=auth.uid() or public.can_manage_booking_travel(booking_id));
create policy transport_manager_write on public.transport_arrangements for all to authenticated using (public.can_manage_booking_travel(booking_id)) with check (public.can_manage_booking_travel(booking_id));
create policy journey_events_scoped_read on public.journey_events for select to authenticated using (public.is_booking_patient(booking_id) or public.can_schedule_booking(booking_id) or public.is_booking_provider(booking_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy payment_proofs_select on storage.objects for select to authenticated using (bucket_id='payment-proofs' and public.can_access_payment_proof(name,false));
create policy payment_proofs_insert on storage.objects for insert to authenticated with check (bucket_id='payment-proofs' and public.can_access_payment_proof(name,true));
create policy payment_proofs_delete on storage.objects for delete to authenticated using (bucket_id='payment-proofs' and public.can_access_payment_proof(name,true));

create trigger appointments_protect before insert or update on public.appointments for each row execute function public.protect_appointment_change();
create trigger appointments_updated before update on public.appointments for each row execute function public.set_updated_at();
create trigger appointments_events after insert or update on public.appointments for each row execute function public.record_part5_event();
create trigger appointments_notify after insert or update on public.appointments for each row execute function public.notify_part5_event();
create trigger invoices_protect before insert or update on public.invoices for each row execute function public.protect_invoice_change();
create trigger invoices_updated before update on public.invoices for each row execute function public.set_updated_at();
create trigger invoices_events after insert or update on public.invoices for each row execute function public.record_part5_event();
create trigger invoices_notify after update on public.invoices for each row execute function public.notify_part5_event();
create trigger invoice_items_protect before insert or update or delete on public.invoice_items for each row execute function public.protect_invoice_item_change();
create trigger invoice_items_updated before update on public.invoice_items for each row execute function public.set_updated_at();
create trigger invoice_items_totals after insert or update or delete on public.invoice_items for each row execute function public.sync_invoice_totals();
create trigger payment_records_protect before insert on public.payment_records for each row execute function public.protect_payment_record();
create trigger payment_records_totals after insert on public.payment_records for each row execute function public.sync_invoice_totals();
create trigger payment_records_events after insert on public.payment_records for each row execute function public.record_part5_event();
create trigger payment_records_notify after insert on public.payment_records for each row execute function public.notify_part5_event();
create trigger payment_documents_protect before insert on public.payment_documents for each row execute function public.protect_payment_document();
create trigger travel_plans_protect before insert or update on public.travel_plans for each row execute function public.protect_travel_plan_change();
create trigger travel_plans_updated before update on public.travel_plans for each row execute function public.set_updated_at();
create trigger travel_plans_events after insert or update on public.travel_plans for each row execute function public.record_part5_event();
create trigger travel_plans_notify after insert or update on public.travel_plans for each row execute function public.notify_part5_event();
create trigger transport_protect before insert or update on public.transport_arrangements for each row execute function public.protect_transport_change();
create trigger transport_updated before update on public.transport_arrangements for each row execute function public.set_updated_at();
create trigger transport_events after insert or update on public.transport_arrangements for each row execute function public.record_part5_event();
create trigger transport_notify after insert or update on public.transport_arrangements for each row execute function public.notify_part5_event();
create trigger bookings_journey_type_protect before update on public.bookings for each row execute function public.protect_booking_journey_type();

create trigger appointments_audit after insert or update or delete on public.appointments for each row execute function public.audit_admin_change();
create trigger invoices_audit after insert or update or delete on public.invoices for each row execute function public.audit_admin_change();
create trigger invoice_items_audit after insert or update or delete on public.invoice_items for each row execute function public.audit_admin_change();
create trigger payment_records_audit after insert or update or delete on public.payment_records for each row execute function public.audit_admin_change();
create trigger travel_plans_audit after insert or update or delete on public.travel_plans for each row execute function public.audit_admin_change();
create trigger transport_audit after insert or update or delete on public.transport_arrangements for each row execute function public.audit_admin_change();

revoke all on function public.is_booking_patient(uuid),public.is_booking_provider(uuid),public.is_booking_doctor(uuid),public.can_schedule_booking(uuid),public.can_manage_booking_finance(uuid),public.can_manage_booking_travel(uuid),public.can_access_payment_proof(text,boolean) from public;
grant execute on function public.is_booking_patient(uuid),public.is_booking_provider(uuid),public.is_booking_doctor(uuid),public.can_schedule_booking(uuid),public.can_manage_booking_finance(uuid),public.can_manage_booking_travel(uuid),public.can_access_payment_proof(text,boolean) to authenticated;
grant select on public.appointments,public.invoices,public.invoice_items,public.payment_records,public.payment_documents,public.travel_plans,public.transport_arrangements,public.journey_events to authenticated;
grant insert,update on public.appointments,public.invoices,public.invoice_items,public.travel_plans,public.transport_arrangements to authenticated;
grant delete on public.invoice_items,public.payment_documents to authenticated;
grant insert on public.payment_records,public.payment_documents to authenticated;

commit;
