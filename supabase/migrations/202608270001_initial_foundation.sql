begin;

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'SUPER_ADMIN',
  'ADMIN',
  'PATIENT',
  'HOSPITAL_ADMIN',
  'HOSPITAL_COORDINATOR',
  'DOCTOR',
  'PHARMACY'
);

create type public.account_status as enum ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');
create type public.record_status as enum ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
create type public.verification_status as enum ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
create type public.provider_type as enum ('HOSPITAL', 'DOCTOR', 'PHARMACY');
create type public.audit_action as enum ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PAYMENT', 'LOGIN');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso2 text not null unique check (iso2 ~ '^[A-Z]{2}$'),
  iso3 text not null unique check (iso3 ~ '^[A-Z]{3}$'),
  name_i18n jsonb not null check (jsonb_typeof(name_i18n) = 'object'),
  phone_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete restrict,
  name_i18n jsonb not null check (jsonb_typeof(name_i18n) = 'object'),
  google_place_id text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index cities_country_google_place_uidx on public.cities(country_id, google_place_id) where google_place_id is not null;
create index cities_country_idx on public.cities(country_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  display_name text check (char_length(display_name) <= 160),
  phone text check (char_length(phone) <= 40),
  country_id uuid references public.countries(id) on delete set null,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'fr', 'ar')),
  avatar_path text,
  account_status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index profiles_country_idx on public.profiles(country_id);
create index profiles_status_idx on public.profiles(account_status);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role)
);

create index user_roles_role_idx on public.user_roles(role);

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.specialties(id) on delete set null,
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name_i18n jsonb not null check (jsonb_typeof(name_i18n) = 'object'),
  description_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(description_i18n) = 'object'),
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index specialties_parent_idx on public.specialties(parent_id);
create index specialties_status_idx on public.specialties(status);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name_i18n jsonb not null check (jsonb_typeof(name_i18n) = 'object'),
  description_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(description_i18n) = 'object'),
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index treatments_specialty_idx on public.treatments(specialty_id);
create index treatments_status_idx on public.treatments(status);

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(legal_name) between 2 and 240),
  display_name_i18n jsonb not null check (jsonb_typeof(display_name_i18n) = 'object'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(description_i18n) = 'object'),
  country_id uuid not null references public.countries(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  website_url text,
  public_email text,
  public_phone text,
  international_patient_services boolean not null default false,
  google_place_id text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  status public.record_status not null default 'DRAFT',
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((is_verified and verified_at is not null) or not is_verified)
);

create index hospitals_country_city_idx on public.hospitals(country_id, city_id);
create index hospitals_public_idx on public.hospitals(status, is_verified);
create unique index hospitals_google_place_uidx on public.hospitals(google_place_id) where google_place_id is not null;

create table public.hospital_branches (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name_i18n jsonb not null check (jsonb_typeof(name_i18n) = 'object'),
  country_id uuid not null references public.countries(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  address_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(address_i18n) = 'object'),
  google_place_id text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  public_phone text,
  public_email text,
  is_main boolean not null default false,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index hospital_branches_hospital_idx on public.hospital_branches(hospital_id);
create unique index hospital_branches_single_main_uidx on public.hospital_branches(hospital_id) where is_main;
create unique index hospital_branches_google_place_uidx on public.hospital_branches(google_place_id) where google_place_id is not null;

create table public.hospital_specialties (
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (hospital_id, specialty_id)
);

create index hospital_specialties_specialty_idx on public.hospital_specialties(specialty_id);

create table public.hospital_treatments (
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  branch_id uuid references public.hospital_branches(id) on delete cascade,
  treatment_id uuid not null references public.treatments(id) on delete restrict,
  starting_price numeric(14,2) check (starting_price >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (hospital_id, branch_id, treatment_id)
);

create index hospital_treatments_treatment_idx on public.hospital_treatments(treatment_id);

create table public.hospital_memberships (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  branch_id uuid references public.hospital_branches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null check (role in ('HOSPITAL_ADMIN', 'HOSPITAL_COORDINATOR')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (hospital_id, branch_id, user_id, role)
);

create index hospital_memberships_user_idx on public.hospital_memberships(user_id) where is_active;
create index hospital_memberships_hospital_idx on public.hospital_memberships(hospital_id) where is_active;

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  display_name text check (char_length(display_name) <= 180),
  biography_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(biography_i18n) = 'object'),
  years_experience smallint check (years_experience between 0 and 80),
  license_number text,
  license_country_id uuid references public.countries(id) on delete set null,
  languages text[] not null default '{}'::text[] check (languages <@ array['en', 'fr', 'ar']::text[]),
  consultation_details jsonb not null default '{}'::jsonb check (jsonb_typeof(consultation_details) = 'object'),
  availability_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(availability_settings) = 'object'),
  profile_image_path text,
  status public.record_status not null default 'DRAFT',
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((is_verified and verified_at is not null) or not is_verified)
);

create index doctors_public_idx on public.doctors(status, is_verified);
create index doctors_license_country_idx on public.doctors(license_country_id);

create table public.doctor_specialties (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (doctor_id, specialty_id)
);

create index doctor_specialties_specialty_idx on public.doctor_specialties(specialty_id);
create unique index doctor_specialties_single_primary_uidx on public.doctor_specialties(doctor_id) where is_primary;

create table public.doctor_hospitals (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  branch_id uuid references public.hospital_branches(id) on delete cascade,
  title text,
  is_primary boolean not null default false,
  consultation_price numeric(14,2) check (consultation_price >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (doctor_id, hospital_id, branch_id)
);

create index doctor_hospitals_hospital_idx on public.doctor_hospitals(hospital_id);
create index doctor_hospitals_doctor_idx on public.doctor_hospitals(doctor_id);

create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  legal_name text not null check (char_length(legal_name) between 2 and 240),
  display_name_i18n jsonb not null check (jsonb_typeof(display_name_i18n) = 'object'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  country_id uuid not null references public.countries(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  address_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(address_i18n) = 'object'),
  google_place_id text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  public_phone text,
  public_email text,
  website_url text,
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  status public.record_status not null default 'DRAFT',
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((is_verified and verified_at is not null) or not is_verified)
);

create index pharmacies_country_city_idx on public.pharmacies(country_id, city_id);
create index pharmacies_public_idx on public.pharmacies(status, is_verified);
create unique index pharmacies_google_place_uidx on public.pharmacies(google_place_id) where google_place_id is not null;

create table public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_type public.provider_type not null,
  hospital_id uuid references public.hospitals(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete cascade,
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  document_type text not null check (char_length(document_type) between 2 and 100),
  storage_bucket text not null default 'provider-private',
  object_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status public.verification_status not null default 'PENDING',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  expires_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(hospital_id, doctor_id, pharmacy_id) = 1),
  check (
    (provider_type = 'HOSPITAL' and hospital_id is not null) or
    (provider_type = 'DOCTOR' and doctor_id is not null) or
    (provider_type = 'PHARMACY' and pharmacy_id is not null)
  ),
  unique (storage_bucket, object_path)
);

create index provider_documents_hospital_idx on public.provider_documents(hospital_id);
create index provider_documents_doctor_idx on public.provider_documents(doctor_id);
create index provider_documents_pharmacy_idx on public.provider_documents(pharmacy_id);
create index provider_documents_status_idx on public.provider_documents(status);

create table public.provider_accreditations (
  id uuid primary key default gen_random_uuid(),
  provider_type public.provider_type not null,
  hospital_id uuid references public.hospitals(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete cascade,
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  accreditation_name text not null,
  issuing_organization text not null,
  credential_number text,
  issued_at date,
  expires_at date,
  document_id uuid references public.provider_documents(id) on delete set null,
  status public.verification_status not null default 'PENDING',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(hospital_id, doctor_id, pharmacy_id) = 1),
  check (
    (provider_type = 'HOSPITAL' and hospital_id is not null) or
    (provider_type = 'DOCTOR' and doctor_id is not null) or
    (provider_type = 'PHARMACY' and pharmacy_id is not null)
  ),
  check (expires_at is null or issued_at is null or expires_at >= issued_at)
);

create index provider_accreditations_hospital_idx on public.provider_accreditations(hospital_id);
create index provider_accreditations_doctor_idx on public.provider_accreditations(doctor_id);
create index provider_accreditations_pharmacy_idx on public.provider_accreditations(pharmacy_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (char_length(type) between 2 and 100),
  title_key text,
  message_key text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (title_key is not null or message_key is not null or data <> '{}'::jsonb)
);

create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications(recipient_id, created_at desc) where read_at is null;
create index notifications_related_idx on public.notifications(related_entity_type, related_entity_id) where related_entity_id is not null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null check (char_length(entity_type) between 2 and 100),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_action_created_idx on public.audit_logs(action, created_at desc);

create table public.app_settings (
  key text primary key check (key ~ '^[a-z0-9_.-]+$'),
  value jsonb not null,
  description_key text,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create function public.has_role(target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = target_role
  );
$$;

create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('SUPER_ADMIN') or public.has_role('ADMIN');
$$;

create function public.is_hospital_member(target_hospital_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hospital_memberships
    where hospital_id = target_hospital_id and user_id = auth.uid() and is_active
  );
$$;

create function public.is_hospital_admin(target_hospital_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.hospital_memberships
    where hospital_id = target_hospital_id and user_id = auth.uid() and role = 'HOSPITAL_ADMIN' and is_active
  );
$$;

create function public.is_doctor_owner(target_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.doctors where id = target_doctor_id and user_id = auth.uid()
  );
$$;

create function public.is_pharmacy_owner(target_pharmacy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pharmacies where id = target_pharmacy_id and owner_user_id = auth.uid()
  );
$$;

create function public.can_manage_provider_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  provider_kind text;
  provider_id uuid;
begin
  provider_kind := split_part(object_name, '/', 1);
  provider_id := split_part(object_name, '/', 2)::uuid;

  if public.is_platform_admin() then return true; end if;
  if provider_kind = 'hospital' then return public.is_hospital_member(provider_id); end if;
  if provider_kind = 'doctor' then return public.is_doctor_owner(provider_id); end if;
  if provider_kind = 'pharmacy' then return public.is_pharmacy_owner(provider_id); end if;
  return false;
exception when others then
  return false;
end;
$$;

create function public.insert_audit_event(
  event_action public.audit_action,
  event_entity_type text,
  event_entity_id uuid default null,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null
    and current_user not in ('postgres', 'supabase_admin', 'service_role')
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'authentication required';
  end if;
  if jsonb_typeof(event_metadata) <> 'object' then raise exception 'metadata must be an object'; end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), event_action, event_entity_type, event_entity_id, event_metadata)
  returning id into new_id;

  return new_id;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  preferred_language text;
begin
  preferred_language := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'en');
  if preferred_language not in ('en', 'fr', 'ar') then preferred_language := 'en'; end if;

  insert into public.profiles (id, first_name, last_name, display_name, preferred_language)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')), ''),
    preferred_language
  );

  insert into public.user_roles (user_id, role) values (new.id, 'PATIENT') on conflict do nothing;
  return new;
end;
$$;

create function public.protect_verification_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_platform_admin()
    or current_user in ('postgres', 'supabase_admin', 'service_role')
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  if tg_table_name in ('hospitals', 'doctors', 'pharmacies') then
    if new.is_verified is distinct from old.is_verified or new.verified_at is distinct from old.verified_at then
      raise exception 'verification fields require a platform administrator';
    end if;
  elsif tg_table_name = 'provider_documents' then
    if new.status is distinct from old.status
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.review_notes is distinct from old.review_notes then
      raise exception 'verification status requires a platform administrator';
    end if;
  elsif tg_table_name = 'provider_accreditations' then
    if new.status is distinct from old.status then
      raise exception 'verification status requires a platform administrator';
    end if;
  end if;

  return new;
end;
$$;

create function public.admin_update_profile_status(target_user_id uuid, new_status public.account_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then raise exception 'insufficient privileges'; end if;
  update public.profiles set account_status = new_status where id = target_user_id;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger hospitals_protect_verification before update on public.hospitals for each row execute function public.protect_verification_fields();
create trigger doctors_protect_verification before update on public.doctors for each row execute function public.protect_verification_fields();
create trigger pharmacies_protect_verification before update on public.pharmacies for each row execute function public.protect_verification_fields();
create trigger provider_documents_protect_verification before update on public.provider_documents for each row execute function public.protect_verification_fields();
create trigger provider_accreditations_protect_verification before update on public.provider_accreditations for each row execute function public.protect_verification_fields();

create trigger countries_set_updated_at before update on public.countries for each row execute function public.set_updated_at();
create trigger cities_set_updated_at before update on public.cities for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger specialties_set_updated_at before update on public.specialties for each row execute function public.set_updated_at();
create trigger treatments_set_updated_at before update on public.treatments for each row execute function public.set_updated_at();
create trigger hospitals_set_updated_at before update on public.hospitals for each row execute function public.set_updated_at();
create trigger hospital_branches_set_updated_at before update on public.hospital_branches for each row execute function public.set_updated_at();
create trigger hospital_treatments_set_updated_at before update on public.hospital_treatments for each row execute function public.set_updated_at();
create trigger hospital_memberships_set_updated_at before update on public.hospital_memberships for each row execute function public.set_updated_at();
create trigger doctors_set_updated_at before update on public.doctors for each row execute function public.set_updated_at();
create trigger doctor_hospitals_set_updated_at before update on public.doctor_hospitals for each row execute function public.set_updated_at();
create trigger pharmacies_set_updated_at before update on public.pharmacies for each row execute function public.set_updated_at();
create trigger provider_documents_set_updated_at before update on public.provider_documents for each row execute function public.set_updated_at();
create trigger provider_accreditations_set_updated_at before update on public.provider_accreditations for each row execute function public.set_updated_at();
create trigger app_settings_set_updated_at before update on public.app_settings for each row execute function public.set_updated_at();

alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.specialties enable row level security;
alter table public.treatments enable row level security;
alter table public.hospitals enable row level security;
alter table public.hospital_branches enable row level security;
alter table public.hospital_specialties enable row level security;
alter table public.hospital_treatments enable row level security;
alter table public.hospital_memberships enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_specialties enable row level security;
alter table public.doctor_hospitals enable row level security;
alter table public.pharmacies enable row level security;
alter table public.provider_documents enable row level security;
alter table public.provider_accreditations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

create policy countries_public_read on public.countries for select using (is_active or public.is_platform_admin());
create policy countries_admin_write on public.countries for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy cities_public_read on public.cities for select using (is_active or public.is_platform_admin());
create policy cities_admin_write on public.cities for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy profiles_self_or_admin_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_platform_admin());
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_self_or_admin_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_platform_admin()) with check (id = auth.uid() or public.is_platform_admin());

create policy user_roles_self_or_admin_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());
create policy user_roles_admin_insert on public.user_roles for insert to authenticated with check (public.is_platform_admin());
create policy user_roles_admin_update on public.user_roles for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy user_roles_admin_delete on public.user_roles for delete to authenticated using (public.is_platform_admin());

create policy specialties_public_read on public.specialties for select using (status = 'ACTIVE' or public.is_platform_admin());
create policy specialties_admin_write on public.specialties for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy treatments_public_read on public.treatments for select using (status = 'ACTIVE' or public.is_platform_admin());
create policy treatments_admin_write on public.treatments for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy hospitals_public_or_scoped_read on public.hospitals for select using ((status = 'ACTIVE' and is_verified) or public.is_platform_admin() or public.is_hospital_member(id));
create policy hospitals_admin_insert on public.hospitals for insert to authenticated with check (public.is_platform_admin());
create policy hospitals_scoped_update on public.hospitals for update to authenticated using (public.is_platform_admin() or public.is_hospital_admin(id)) with check (public.is_platform_admin() or public.is_hospital_admin(id));
create policy hospitals_admin_delete on public.hospitals for delete to authenticated using (public.is_platform_admin());

create policy hospital_branches_public_or_scoped_read on public.hospital_branches for select using (public.is_hospital_member(hospital_id) or public.is_platform_admin() or exists (select 1 from public.hospitals h where h.id = hospital_id and h.status = 'ACTIVE' and h.is_verified) and status = 'ACTIVE');
create policy hospital_branches_scoped_insert on public.hospital_branches for insert to authenticated with check (public.is_hospital_admin(hospital_id));
create policy hospital_branches_scoped_update on public.hospital_branches for update to authenticated using (public.is_hospital_admin(hospital_id)) with check (public.is_hospital_admin(hospital_id));
create policy hospital_branches_scoped_delete on public.hospital_branches for delete to authenticated using (public.is_hospital_admin(hospital_id));

create policy hospital_specialties_public_or_scoped_read on public.hospital_specialties for select using (public.is_hospital_member(hospital_id) or public.is_platform_admin() or exists (select 1 from public.hospitals h where h.id = hospital_id and h.status = 'ACTIVE' and h.is_verified));
create policy hospital_specialties_scoped_write on public.hospital_specialties for all to authenticated using (public.is_hospital_admin(hospital_id)) with check (public.is_hospital_admin(hospital_id));
create policy hospital_treatments_public_or_scoped_read on public.hospital_treatments for select using (public.is_hospital_member(hospital_id) or public.is_platform_admin() or exists (select 1 from public.hospitals h where h.id = hospital_id and h.status = 'ACTIVE' and h.is_verified) and status = 'ACTIVE');
create policy hospital_treatments_scoped_write on public.hospital_treatments for all to authenticated using (public.is_hospital_admin(hospital_id)) with check (public.is_hospital_admin(hospital_id));

create policy hospital_memberships_scoped_read on public.hospital_memberships for select to authenticated using (user_id = auth.uid() or public.is_platform_admin() or public.is_hospital_admin(hospital_id));
create policy hospital_memberships_scoped_insert on public.hospital_memberships for insert to authenticated with check (public.is_platform_admin() or (public.is_hospital_admin(hospital_id) and role = 'HOSPITAL_COORDINATOR'));
create policy hospital_memberships_scoped_update on public.hospital_memberships for update to authenticated using (public.is_platform_admin() or (public.is_hospital_admin(hospital_id) and role = 'HOSPITAL_COORDINATOR')) with check (public.is_platform_admin() or (public.is_hospital_admin(hospital_id) and role = 'HOSPITAL_COORDINATOR'));
create policy hospital_memberships_scoped_delete on public.hospital_memberships for delete to authenticated using (public.is_platform_admin() or (public.is_hospital_admin(hospital_id) and role = 'HOSPITAL_COORDINATOR'));

create policy doctors_public_or_owner_read on public.doctors for select using ((status = 'ACTIVE' and is_verified) or public.is_platform_admin() or user_id = auth.uid());
create policy doctors_admin_insert on public.doctors for insert to authenticated with check (public.is_platform_admin());
create policy doctors_owner_update on public.doctors for update to authenticated using (public.is_platform_admin() or user_id = auth.uid()) with check (public.is_platform_admin() or user_id = auth.uid());
create policy doctors_admin_delete on public.doctors for delete to authenticated using (public.is_platform_admin());

create policy doctor_specialties_public_or_owner_read on public.doctor_specialties for select using (public.is_doctor_owner(doctor_id) or public.is_platform_admin() or exists (select 1 from public.doctors d where d.id = doctor_id and d.status = 'ACTIVE' and d.is_verified));
create policy doctor_specialties_owner_write on public.doctor_specialties for all to authenticated using (public.is_doctor_owner(doctor_id) or public.is_platform_admin()) with check (public.is_doctor_owner(doctor_id) or public.is_platform_admin());
create policy doctor_hospitals_public_or_scoped_read on public.doctor_hospitals for select using (public.is_doctor_owner(doctor_id) or public.is_hospital_member(hospital_id) or public.is_platform_admin() or exists (select 1 from public.doctors d join public.hospitals h on h.id = hospital_id where d.id = doctor_id and d.status = 'ACTIVE' and d.is_verified and h.status = 'ACTIVE' and h.is_verified));
create policy doctor_hospitals_scoped_write on public.doctor_hospitals for all to authenticated using (public.is_platform_admin() or public.is_doctor_owner(doctor_id) or public.is_hospital_admin(hospital_id)) with check (public.is_platform_admin() or public.is_doctor_owner(doctor_id) or public.is_hospital_admin(hospital_id));

create policy pharmacies_public_or_owner_read on public.pharmacies for select using ((status = 'ACTIVE' and is_verified) or public.is_platform_admin() or owner_user_id = auth.uid());
create policy pharmacies_admin_insert on public.pharmacies for insert to authenticated with check (public.is_platform_admin());
create policy pharmacies_owner_update on public.pharmacies for update to authenticated using (public.is_platform_admin() or owner_user_id = auth.uid()) with check (public.is_platform_admin() or owner_user_id = auth.uid());
create policy pharmacies_admin_delete on public.pharmacies for delete to authenticated using (public.is_platform_admin());

create policy provider_documents_scoped_read on public.provider_documents for select to authenticated using (public.is_platform_admin() or uploaded_by = auth.uid() or (hospital_id is not null and public.is_hospital_member(hospital_id)) or (doctor_id is not null and public.is_doctor_owner(doctor_id)) or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id)));
create policy provider_documents_scoped_insert on public.provider_documents for insert to authenticated with check (public.is_platform_admin() or uploaded_by = auth.uid() and ((hospital_id is not null and public.is_hospital_member(hospital_id)) or (doctor_id is not null and public.is_doctor_owner(doctor_id)) or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))));
create policy provider_documents_scoped_update on public.provider_documents for update to authenticated using (public.is_platform_admin() or (hospital_id is not null and public.is_hospital_member(hospital_id)) or (doctor_id is not null and public.is_doctor_owner(doctor_id)) or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))) with check (public.is_platform_admin() or (hospital_id is not null and public.is_hospital_member(hospital_id)) or (doctor_id is not null and public.is_doctor_owner(doctor_id)) or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id)));
create policy provider_documents_scoped_delete on public.provider_documents for delete to authenticated using (public.is_platform_admin() or uploaded_by = auth.uid());

create policy provider_accreditations_public_or_scoped_read on public.provider_accreditations for select using (status = 'APPROVED' or public.is_platform_admin() or (hospital_id is not null and public.is_hospital_member(hospital_id)) or (doctor_id is not null and public.is_doctor_owner(doctor_id)) or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id)));
create policy provider_accreditations_scoped_write on public.provider_accreditations for all to authenticated using (public.is_platform_admin() or (hospital_id is not null and public.is_hospital_admin(hospital_id)) or (doctor_id is not null and public.is_doctor_owner(doctor_id)) or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))) with check (public.is_platform_admin() or (hospital_id is not null and public.is_hospital_admin(hospital_id)) or (doctor_id is not null and public.is_doctor_owner(doctor_id)) or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id)));

create policy notifications_own_read on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_admin_insert on public.notifications for insert to authenticated with check (public.is_platform_admin());
create policy notifications_own_update on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_platform_admin());

create policy app_settings_public_read on public.app_settings for select using (is_public or public.is_platform_admin());
create policy app_settings_admin_write on public.app_settings for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

revoke all on function public.has_role(public.app_role) from public;
revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_hospital_member(uuid) from public;
revoke all on function public.is_hospital_admin(uuid) from public;
revoke all on function public.is_doctor_owner(uuid) from public;
revoke all on function public.is_pharmacy_owner(uuid) from public;
revoke all on function public.can_manage_provider_object(text) from public;
revoke all on function public.insert_audit_event(public.audit_action, text, uuid, jsonb) from public;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_hospital_member(uuid) to authenticated;
grant execute on function public.is_hospital_admin(uuid) to authenticated;
grant execute on function public.is_doctor_owner(uuid) to authenticated;
grant execute on function public.is_pharmacy_owner(uuid) to authenticated;
grant execute on function public.can_manage_provider_object(text) to authenticated;
grant execute on function public.has_role(public.app_role) to anon;
grant execute on function public.is_platform_admin() to anon;
grant execute on function public.is_hospital_member(uuid) to anon;
grant execute on function public.is_hospital_admin(uuid) to anon;
grant execute on function public.is_doctor_owner(uuid) to anon;
grant execute on function public.is_pharmacy_owner(uuid) to anon;
grant execute on function public.insert_audit_event(public.audit_action, text, uuid, jsonb) to service_role;
revoke all on function public.admin_update_profile_status(uuid, public.account_status) from public;
grant execute on function public.admin_update_profile_status(uuid, public.account_status) to authenticated;

revoke update on public.profiles from authenticated;
grant update (first_name, last_name, display_name, phone, country_id, preferred_language, avatar_path) on public.profiles to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('provider-public', 'provider-public', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('provider-private', 'provider-private', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy avatars_owner_read on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy provider_public_read on storage.objects for select using (bucket_id = 'provider-public');
create policy provider_public_scoped_write on storage.objects for insert to authenticated with check (bucket_id = 'provider-public' and public.can_manage_provider_object(name));
create policy provider_public_scoped_update on storage.objects for update to authenticated using (bucket_id = 'provider-public' and public.can_manage_provider_object(name)) with check (bucket_id = 'provider-public' and public.can_manage_provider_object(name));
create policy provider_public_scoped_delete on storage.objects for delete to authenticated using (bucket_id = 'provider-public' and public.can_manage_provider_object(name));
create policy provider_private_scoped_read on storage.objects for select to authenticated using (bucket_id = 'provider-private' and public.can_manage_provider_object(name));
create policy provider_private_scoped_insert on storage.objects for insert to authenticated with check (bucket_id = 'provider-private' and public.can_manage_provider_object(name));
create policy provider_private_scoped_update on storage.objects for update to authenticated using (bucket_id = 'provider-private' and public.can_manage_provider_object(name)) with check (bucket_id = 'provider-private' and public.can_manage_provider_object(name));
create policy provider_private_scoped_delete on storage.objects for delete to authenticated using (bucket_id = 'provider-private' and public.can_manage_provider_object(name));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

commit;
