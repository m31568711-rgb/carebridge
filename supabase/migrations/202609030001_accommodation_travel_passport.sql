begin;

create type public.accommodation_arrangement as enum ('NOT_REQUIRED', 'PATIENT_WILL_CHOOSE', 'PATIENT_SELECTED', 'CAREBRIDGE_ARRANGED');
create type public.accommodation_booking_status as enum ('HELD', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED');
create type public.travel_arrangement as enum ('PATIENT_SELF_ARRANGED', 'CAREBRIDGE_ARRANGED');
create type public.travel_trip_type as enum ('ONE_WAY', 'RETURN_ONLY', 'ROUND_TRIP');
create type public.travel_booking_status as enum ('DRAFT', 'HELD', 'CONFIRMED', 'TICKETED', 'COMPLETED', 'CANCELLED');
create type public.travel_document_type as enum ('PASSPORT_COPY', 'TICKET', 'ITINERARY', 'OTHER');

create table public.accommodation_properties (
  id uuid primary key default gen_random_uuid(),
  property_name text not null check (char_length(property_name) between 2 and 240),
  city_id uuid not null references public.cities(id) on delete restrict,
  location_address text not null check (char_length(location_address) between 2 and 500),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  notes text check (notes is null or char_length(notes) <= 3000),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index accommodation_properties_city_active_idx on public.accommodation_properties(city_id, is_active, property_name);

create table public.accommodation_room_options (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.accommodation_properties(id) on delete cascade,
  room_type text not null check (char_length(room_type) between 2 and 160),
  available_rooms integer not null check (available_rooms between 1 and 100000),
  price_per_night numeric(14,2) not null check (price_per_night >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  meal_plan text not null check (char_length(meal_plan) between 2 and 160),
  wellness_services text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 3000),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(property_id, room_type)
);
create index accommodation_room_options_property_active_idx on public.accommodation_room_options(property_id, is_active);

create table public.accommodation_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.accommodation_properties(id) on delete cascade,
  object_path text not null unique check (object_path !~ '(^|/)\.\.(/|$)'),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  display_order smallint not null default 0,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);
create index accommodation_photos_property_idx on public.accommodation_photos(property_id, display_order, created_at);

create table public.journey_accommodation_preferences (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete restrict,
  arrangement public.accommodation_arrangement not null,
  notes text check (notes is null or char_length(notes) <= 2000),
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index journey_accommodation_preferences_patient_idx on public.journey_accommodation_preferences(patient_id, updated_at desc);

create table public.accommodation_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete restrict,
  room_option_id uuid not null references public.accommodation_room_options(id) on delete restrict,
  arrangement public.accommodation_arrangement not null check (arrangement in ('PATIENT_SELECTED','CAREBRIDGE_ARRANGED')),
  check_in_date date not null,
  check_out_date date not null,
  number_of_rooms integer not null check (number_of_rooms between 1 and 100),
  guests integer not null check (guests between 1 and 500),
  nights integer generated always as (check_out_date - check_in_date) stored,
  price_per_night numeric(14,2) not null check (price_per_night >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  total_amount numeric(14,2) generated always as (round((check_out_date - check_in_date) * number_of_rooms * price_per_night, 2)) stored,
  final_price numeric(14,2) check (final_price is null or final_price >= 0),
  status public.accommodation_booking_status not null default 'HELD',
  notes text check (notes is null or char_length(notes) <= 3000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (check_out_date > check_in_date)
);
create unique index accommodation_bookings_one_current_journey_idx on public.accommodation_bookings(booking_id) where status in ('HELD','CONFIRMED','CHECKED_IN');
create index accommodation_bookings_capacity_idx on public.accommodation_bookings(room_option_id, check_in_date, check_out_date, status);
create index accommodation_bookings_patient_idx on public.accommodation_bookings(patient_id, created_at desc);

alter table public.travel_plans
  add column travel_arrangement public.travel_arrangement not null default 'PATIENT_SELF_ARRANGED',
  add column trip_type public.travel_trip_type not null default 'ROUND_TRIP',
  add column origin_location text check (origin_location is null or char_length(origin_location) <= 240),
  add column destination_location text check (destination_location is null or char_length(destination_location) <= 240),
  add column outbound_departure_at timestamptz,
  add column outbound_arrival_at timestamptz,
  add column return_departure_at timestamptz,
  add column return_arrival_at timestamptz,
  add column outbound_flight_number text check (outbound_flight_number is null or char_length(outbound_flight_number) <= 40),
  add column return_airline text check (return_airline is null or char_length(return_airline) <= 180),
  add column return_flight_number text check (return_flight_number is null or char_length(return_flight_number) <= 40),
  add column ticket_reference text check (ticket_reference is null or char_length(ticket_reference) <= 180),
  add column cabin_class text check (cabin_class is null or char_length(cabin_class) <= 80),
  add column ticket_price numeric(14,2) check (ticket_price is null or ticket_price >= 0),
  add column ticket_currency text check (ticket_currency is null or ticket_currency ~ '^[A-Z]{3}$'),
  add column booking_status public.travel_booking_status not null default 'DRAFT';

update public.travel_plans
set travel_arrangement = 'CAREBRIDGE_ARRANGED',
    outbound_flight_number = arrival_flight_number,
    return_flight_number = departure_flight_number
where accommodation_mode = 'COORDINATED' or arrival_flight_number is not null or departure_flight_number is not null;

create or replace function public.can_manage_booking_travel(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_booking_provider(target_booking_id) or public.is_platform_admin();
$$;

create table public.patient_passports (
  patient_id uuid primary key references auth.users(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  full_name_as_passport text not null check (char_length(full_name_as_passport) between 2 and 240),
  passport_number text not null check (char_length(passport_number) between 3 and 40),
  nationality text not null check (char_length(nationality) between 2 and 120),
  date_of_birth date not null,
  issue_date date not null,
  expiry_date date not null,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expiry_date > issue_date)
);
create unique index patient_passports_number_idx on public.patient_passports(passport_number);

create table public.travel_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  document_type public.travel_document_type not null,
  object_path text not null unique check (object_path !~ '(^|/)\.\.(/|$)'),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 15728640),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);
create index travel_documents_booking_type_idx on public.travel_documents(booking_id, document_type, created_at desc);

create function public.reserve_accommodation(
  target_booking_id uuid,
  target_room_option_id uuid,
  target_arrangement public.accommodation_arrangement,
  target_check_in date,
  target_check_out date,
  target_rooms integer,
  target_guests integer,
  target_final_price numeric default null,
  target_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  target_booking public.bookings;
  room_option public.accommodation_room_options;
  reserved_rooms integer;
  reservation_id uuid;
  is_admin boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into target_booking from public.bookings where id=target_booking_id;
  is_admin := public.is_platform_admin();
  if target_booking.id is null or target_booking.journey_type <> 'INTERNATIONAL_MEDICAL_TRAVEL' then raise exception 'international booking required'; end if;
  if not is_admin and target_booking.patient_id <> auth.uid() then raise exception 'accommodation access denied'; end if;
  if target_arrangement not in ('PATIENT_SELECTED','CAREBRIDGE_ARRANGED') then raise exception 'invalid accommodation arrangement'; end if;
  if not is_admin and target_arrangement <> 'PATIENT_SELECTED' then raise exception 'patient arrangement denied'; end if;
  if target_check_out <= target_check_in or target_rooms not between 1 and 100 or target_guests not between 1 and 500 then raise exception 'invalid stay'; end if;
  if exists(select 1 from public.accommodation_bookings where booking_id=target_booking_id and status in ('HELD','CONFIRMED','CHECKED_IN')) then raise exception 'accommodation already arranged'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_room_option_id::text, 0));
  select aro.* into room_option from public.accommodation_room_options aro join public.accommodation_properties ap on ap.id=aro.property_id where aro.id=target_room_option_id and aro.is_active and ap.is_active;
  if room_option.id is null then raise exception 'accommodation option unavailable'; end if;
  select coalesce(sum(number_of_rooms),0)::integer into reserved_rooms from public.accommodation_bookings
    where room_option_id=target_room_option_id and status in ('HELD','CONFIRMED','CHECKED_IN')
      and check_in_date < target_check_out and check_out_date > target_check_in;
  if reserved_rooms + target_rooms > room_option.available_rooms then raise exception 'insufficient room availability'; end if;
  insert into public.accommodation_bookings(booking_id,patient_id,room_option_id,arrangement,check_in_date,check_out_date,number_of_rooms,guests,price_per_night,currency,final_price,status,notes,created_by)
  values(target_booking_id,target_booking.patient_id,target_room_option_id,target_arrangement,target_check_in,target_check_out,target_rooms,target_guests,room_option.price_per_night,room_option.currency,case when is_admin then target_final_price else null end,case when is_admin then 'CONFIRMED' else 'HELD' end,target_notes,auth.uid()) returning id into reservation_id;
  insert into public.journey_accommodation_preferences(booking_id,patient_id,arrangement,notes,updated_by)
    values(target_booking_id,target_booking.patient_id,target_arrangement,target_notes,auth.uid())
    on conflict(booking_id) do update set arrangement=excluded.arrangement,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=timezone('utc',now());
  return reservation_id;
end; $$;

create function public.protect_accommodation_reservation() returns trigger language plpgsql set search_path='' as $$
declare target_booking public.bookings; room_capacity integer; reserved_rooms integer;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into target_booking from public.bookings where id=new.booking_id;
  if target_booking.id is null or target_booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' or new.patient_id<>target_booking.patient_id then raise exception 'invalid accommodation journey'; end if;
  if tg_op='UPDATE' then
    if new.booking_id is distinct from old.booking_id or new.patient_id is distinct from old.patient_id or new.room_option_id is distinct from old.room_option_id or new.created_by is distinct from old.created_by then raise exception 'accommodation relationships are immutable'; end if;
    if not public.is_platform_admin() then
      if old.patient_id<>auth.uid() or new.status<>'CANCELLED' or old.status not in ('HELD','CONFIRMED') then raise exception 'accommodation update denied'; end if;
    end if;
  elsif not public.is_platform_admin() then raise exception 'use secure accommodation reservation'; end if;
  if new.status in ('HELD','CONFIRMED','CHECKED_IN') then
    perform pg_advisory_xact_lock(hashtextextended(new.room_option_id::text,0));
    select available_rooms into room_capacity from public.accommodation_room_options where id=new.room_option_id and is_active;
    select coalesce(sum(number_of_rooms),0)::integer into reserved_rooms from public.accommodation_bookings where room_option_id=new.room_option_id and id<>new.id and status in ('HELD','CONFIRMED','CHECKED_IN') and check_in_date<new.check_out_date and check_out_date>new.check_in_date;
    if room_capacity is null or reserved_rooms+new.number_of_rooms>room_capacity then raise exception 'insufficient room availability'; end if;
  end if;
  return new;
end; $$;

create function public.protect_accommodation_preference() returns trigger language plpgsql set search_path='' as $$
declare target_booking public.bookings;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into target_booking from public.bookings where id=new.booking_id;
  if target_booking.id is null or target_booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' or new.patient_id<>target_booking.patient_id or new.updated_by<>auth.uid() then raise exception 'invalid accommodation preference'; end if;
  if not public.is_platform_admin() and (target_booking.patient_id<>auth.uid() or new.arrangement not in ('NOT_REQUIRED','PATIENT_WILL_CHOOSE')) then raise exception 'accommodation preference denied'; end if;
  return new;
end; $$;

create or replace function public.protect_travel_plan_change() returns trigger language plpgsql set search_path='' as $$
declare target_booking public.bookings; patient_user boolean; manager boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into target_booking from public.bookings where id=new.booking_id;
  patient_user := target_booking.patient_id=auth.uid();
  manager := public.can_manage_booking_travel(new.booking_id);
  if target_booking.id is null or target_booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' or new.patient_id<>target_booking.patient_id or new.updated_by<>auth.uid() then raise exception 'travel plan change is not permitted'; end if;
  if not manager and not (patient_user and new.travel_arrangement='PATIENT_SELF_ARRANGED') then raise exception 'travel plan change is not permitted'; end if;
  if tg_op='UPDATE' and (new.booking_id is distinct from old.booking_id or new.patient_id is distinct from old.patient_id) then raise exception 'travel plan relationship fields are immutable'; end if;
  if patient_user and not manager and tg_op='UPDATE' and old.travel_arrangement='CAREBRIDGE_ARRANGED' then raise exception 'CareBridge travel is managed by administration'; end if;
  if new.trip_type='ROUND_TRIP' and new.return_departure_at is null then raise exception 'return departure is required'; end if;
  if new.ticket_price is not null and new.ticket_currency is null then raise exception 'ticket currency is required'; end if;
  return new;
end; $$;

create function public.protect_passport_change() returns trigger language plpgsql set search_path='' as $$
declare target_booking public.bookings;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into target_booking from public.bookings where id=new.booking_id;
  if target_booking.id is null or target_booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' or target_booking.patient_id<>new.patient_id or new.updated_by<>auth.uid() then raise exception 'passport change denied'; end if;
  if not public.is_platform_admin() and new.patient_id<>auth.uid() then raise exception 'passport change denied'; end if;
  if not exists(select 1 from public.travel_plans where booking_id=new.booking_id and travel_arrangement='CAREBRIDGE_ARRANGED') then raise exception 'passport is only collected for CareBridge-arranged travel'; end if;
  if tg_op='UPDATE' and new.patient_id is distinct from old.patient_id then raise exception 'passport owner is immutable'; end if;
  return new;
end; $$;

create function public.protect_travel_document_change() returns trigger language plpgsql set search_path='' as $$
declare target_booking public.bookings;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into target_booking from public.bookings where id=new.booking_id;
  if target_booking.id is null or target_booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' or target_booking.patient_id<>new.patient_id or new.uploaded_by<>auth.uid() then raise exception 'travel document change denied'; end if;
  if not public.is_platform_admin() and new.patient_id<>auth.uid() then raise exception 'travel document change denied'; end if;
  if new.document_type='PASSPORT_COPY' and not exists(select 1 from public.travel_plans where booking_id=new.booking_id and travel_arrangement='CAREBRIDGE_ARRANGED') then raise exception 'passport copy is only collected for CareBridge-arranged travel'; end if;
  return new;
end; $$;

create function public.can_access_travel_document(object_name text, for_write boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare target_patient uuid; target_booking uuid; document_kind text;
begin
  target_patient:=split_part(object_name,'/',1)::uuid;
  target_booking:=split_part(object_name,'/',2)::uuid;
  document_kind:=split_part(object_name,'/',3);
  if public.is_platform_admin() then return exists(select 1 from public.bookings where id=target_booking and patient_id=target_patient and journey_type='INTERNATIONAL_MEDICAL_TRAVEL'); end if;
  if target_patient<>auth.uid() or not exists(select 1 from public.bookings where id=target_booking and patient_id=auth.uid() and journey_type='INTERNATIONAL_MEDICAL_TRAVEL') then return false; end if;
  if document_kind='PASSPORT_COPY' then return exists(select 1 from public.travel_plans where booking_id=target_booking and travel_arrangement='CAREBRIDGE_ARRANGED'); end if;
  return document_kind in ('TICKET','ITINERARY','OTHER');
exception when others then return false;
end; $$;

create function public.audit_travel_sensitive_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb; target_id uuid; action_name public.audit_action;
begin
  if auth.uid() is null then if tg_op='DELETE' then return old; else return new; end if; end if;
  row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_id:=nullif(row_data->>'id','')::uuid;
  if target_id is null then target_id:=nullif(row_data->>'booking_id','')::uuid; end if;
  action_name:=case when tg_op='INSERT' then 'CREATE'::public.audit_action when tg_op='DELETE' then 'DELETE'::public.audit_action else 'UPDATE'::public.audit_action end;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),action_name,tg_table_name,target_id,jsonb_build_object('booking_id',row_data->>'booking_id','document_type',row_data->>'document_type','status',row_data->>'status'));
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

create function public.notify_accommodation_change() returns trigger language plpgsql security definer set search_path='' as $$
declare target_booking uuid; target_patient uuid; event_key text;
begin
  target_booking:=new.booking_id; target_patient:=new.patient_id;
  event_key:=case when tg_table_name='accommodation_bookings' then 'accommodation.'||lower(new.status::text) else 'accommodation.preference' end;
  if auth.uid()=target_patient then
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
      select ur.user_id,event_key,'travel.notifications.adminRequestTitle','travel.notifications.adminRequestMessage','booking',target_booking from public.user_roles ur where ur.role in ('ADMIN','SUPER_ADMIN');
  else
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
      values(target_patient,event_key,'travel.notifications.accommodationTitle','travel.notifications.accommodationMessage','booking',target_booking);
  end if;
  return new;
end; $$;

create function public.notify_travel_coordination_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid()=new.patient_id then
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
      select ur.user_id,'travel.patient_updated','travel.notifications.adminTravelTitle','travel.notifications.adminTravelMessage','booking',new.booking_id from public.user_roles ur where ur.role in ('ADMIN','SUPER_ADMIN');
  end if;
  return new;
end; $$;

alter table public.accommodation_properties enable row level security;
alter table public.accommodation_room_options enable row level security;
alter table public.accommodation_photos enable row level security;
alter table public.journey_accommodation_preferences enable row level security;
alter table public.accommodation_bookings enable row level security;
alter table public.patient_passports enable row level security;
alter table public.travel_documents enable row level security;

create policy accommodation_properties_scoped_read on public.accommodation_properties for select to authenticated using(is_active or public.is_platform_admin());
create policy accommodation_properties_admin_write on public.accommodation_properties for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy accommodation_room_options_scoped_read on public.accommodation_room_options for select to authenticated using((is_active and exists(select 1 from public.accommodation_properties ap where ap.id=property_id and ap.is_active)) or public.is_platform_admin());
create policy accommodation_room_options_admin_write on public.accommodation_room_options for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy accommodation_photos_scoped_read on public.accommodation_photos for select to authenticated using(exists(select 1 from public.accommodation_properties ap where ap.id=property_id and (ap.is_active or public.is_platform_admin())));
create policy accommodation_photos_admin_write on public.accommodation_photos for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy accommodation_preferences_scoped_read on public.journey_accommodation_preferences for select to authenticated using(patient_id=auth.uid() or public.is_platform_admin());
create policy accommodation_preferences_scoped_insert on public.journey_accommodation_preferences for insert to authenticated with check(patient_id=auth.uid() or public.is_platform_admin());
create policy accommodation_preferences_scoped_update on public.journey_accommodation_preferences for update to authenticated using(patient_id=auth.uid() or public.is_platform_admin()) with check(patient_id=auth.uid() or public.is_platform_admin());
create policy accommodation_bookings_scoped_read on public.accommodation_bookings for select to authenticated using(patient_id=auth.uid() or public.is_platform_admin());
create policy accommodation_bookings_admin_write on public.accommodation_bookings for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy accommodation_bookings_patient_cancel on public.accommodation_bookings for update to authenticated using(patient_id=auth.uid()) with check(patient_id=auth.uid());
create policy patient_passports_owner_admin_read on public.patient_passports for select to authenticated using(patient_id=auth.uid() or public.is_platform_admin());
create policy patient_passports_owner_admin_write on public.patient_passports for all to authenticated using(patient_id=auth.uid() or public.is_platform_admin()) with check(patient_id=auth.uid() or public.is_platform_admin());
create policy travel_documents_owner_admin_read on public.travel_documents for select to authenticated using(patient_id=auth.uid() or public.is_platform_admin());
create policy travel_documents_owner_admin_write on public.travel_documents for all to authenticated using(patient_id=auth.uid() or public.is_platform_admin()) with check(patient_id=auth.uid() or public.is_platform_admin());
create policy travel_plans_patient_self_write on public.travel_plans for insert to authenticated with check(patient_id=auth.uid() and travel_arrangement='PATIENT_SELF_ARRANGED');
create policy travel_plans_patient_self_update on public.travel_plans for update to authenticated using(patient_id=auth.uid() and travel_arrangement='PATIENT_SELF_ARRANGED') with check(patient_id=auth.uid() and travel_arrangement='PATIENT_SELF_ARRANGED');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('accommodation-media','accommodation-media',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('travel-documents','travel-documents',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy accommodation_media_public_read on storage.objects for select using(bucket_id='accommodation-media');
create policy accommodation_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='accommodation-media' and public.is_platform_admin());
create policy accommodation_media_admin_update on storage.objects for update to authenticated using(bucket_id='accommodation-media' and public.is_platform_admin()) with check(bucket_id='accommodation-media' and public.is_platform_admin());
create policy accommodation_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='accommodation-media' and public.is_platform_admin());
create policy travel_documents_scoped_read on storage.objects for select to authenticated using(bucket_id='travel-documents' and public.can_access_travel_document(name,false));
create policy travel_documents_scoped_insert on storage.objects for insert to authenticated with check(bucket_id='travel-documents' and public.can_access_travel_document(name,true));
create policy travel_documents_scoped_delete on storage.objects for delete to authenticated using(bucket_id='travel-documents' and public.can_access_travel_document(name,true));

create trigger accommodation_properties_updated before update on public.accommodation_properties for each row execute function public.set_updated_at();
create trigger accommodation_room_options_updated before update on public.accommodation_room_options for each row execute function public.set_updated_at();
create trigger accommodation_preferences_protect before insert or update on public.journey_accommodation_preferences for each row execute function public.protect_accommodation_preference();
create trigger accommodation_preferences_updated before update on public.journey_accommodation_preferences for each row execute function public.set_updated_at();
create trigger accommodation_bookings_protect before insert or update on public.accommodation_bookings for each row execute function public.protect_accommodation_reservation();
create trigger accommodation_bookings_updated before update on public.accommodation_bookings for each row execute function public.set_updated_at();
create trigger patient_passports_protect before insert or update on public.patient_passports for each row execute function public.protect_passport_change();
create trigger patient_passports_updated before update on public.patient_passports for each row execute function public.set_updated_at();
create trigger travel_documents_protect before insert or update on public.travel_documents for each row execute function public.protect_travel_document_change();
create trigger accommodation_preferences_notify after insert or update on public.journey_accommodation_preferences for each row execute function public.notify_accommodation_change();
create trigger accommodation_bookings_notify after insert or update on public.accommodation_bookings for each row execute function public.notify_accommodation_change();
create trigger travel_plans_admin_notify after insert or update on public.travel_plans for each row execute function public.notify_travel_coordination_change();
create trigger accommodation_properties_audit after insert or update or delete on public.accommodation_properties for each row execute function public.audit_admin_change();
create trigger accommodation_room_options_audit after insert or update or delete on public.accommodation_room_options for each row execute function public.audit_admin_change();
create trigger accommodation_bookings_audit after insert or update or delete on public.accommodation_bookings for each row execute function public.audit_travel_sensitive_change();
create trigger patient_passports_audit after insert or update or delete on public.patient_passports for each row execute function public.audit_travel_sensitive_change();
create trigger travel_documents_audit after insert or update or delete on public.travel_documents for each row execute function public.audit_travel_sensitive_change();

revoke all on function public.reserve_accommodation(uuid,uuid,public.accommodation_arrangement,date,date,integer,integer,numeric,text),public.can_access_travel_document(text,boolean) from public;
grant execute on function public.reserve_accommodation(uuid,uuid,public.accommodation_arrangement,date,date,integer,integer,numeric,text),public.can_access_travel_document(text,boolean) to authenticated;
grant select on public.accommodation_properties,public.accommodation_room_options,public.accommodation_photos,public.journey_accommodation_preferences,public.accommodation_bookings,public.patient_passports,public.travel_documents to authenticated;
grant insert,update,delete on public.accommodation_properties,public.accommodation_room_options,public.accommodation_photos,public.accommodation_bookings,public.patient_passports,public.travel_documents to authenticated;
grant insert,update on public.journey_accommodation_preferences to authenticated;

commit;
