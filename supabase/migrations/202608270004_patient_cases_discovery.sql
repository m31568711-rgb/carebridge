alter type public.provider_type add value if not exists 'RADIOLOGY_CENTER';
alter type public.provider_type add value if not exists 'MEDICAL_LABORATORY';

begin;

create type public.medical_case_status as enum (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'RECOMMENDATION_AVAILABLE',
  'CLOSED',
  'CANCELLED'
);

create type public.case_access_status as enum ('ACTIVE', 'REVOKED');
create type public.recommendation_status as enum ('DRAFT', 'SUBMITTED', 'WITHDRAWN');
create type public.case_document_type as enum ('MEDICAL_REPORT', 'LAB_RESULT', 'RADIOLOGY', 'PRESCRIPTION', 'OTHER');

create table public.medical_cases (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 180),
  description text not null check (char_length(description) between 10 and 8000),
  symptoms_notes text check (symptoms_notes is null or char_length(symptoms_notes) <= 8000),
  preferred_country_id uuid references public.countries(id) on delete set null,
  preferred_city_id uuid references public.cities(id) on delete set null,
  location_preference text check (location_preference is null or char_length(location_preference) <= 500),
  preferred_latitude numeric(9,6) check (preferred_latitude between -90 and 90),
  preferred_longitude numeric(9,6) check (preferred_longitude between -180 and 180),
  status public.medical_case_status not null default 'DRAFT',
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((preferred_latitude is null) = (preferred_longitude is null))
);

create index medical_cases_patient_idx on public.medical_cases(patient_id, updated_at desc);
create index medical_cases_specialty_status_idx on public.medical_cases(specialty_id, status);

create table public.case_doctor_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.medical_cases(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  status public.case_access_status not null default 'ACTIVE',
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (case_id, doctor_id)
);

create index case_doctor_assignments_doctor_idx on public.case_doctor_assignments(doctor_id, status);
create index case_doctor_assignments_case_idx on public.case_doctor_assignments(case_id, status);

create table public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.medical_cases(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  document_type public.case_document_type not null default 'OTHER',
  object_path text not null unique check (object_path !~ '(^|/)\.\.(/|$)'),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/dicom')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 26214400),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index case_documents_case_idx on public.case_documents(case_id, created_at desc);

create table public.treatment_recommendations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.medical_cases(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  treatment_id uuid not null references public.treatments(id) on delete restrict,
  recommendation_notes text not null check (char_length(recommendation_notes) between 10 and 8000),
  next_steps text check (next_steps is null or char_length(next_steps) <= 4000),
  status public.recommendation_status not null default 'DRAFT',
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (case_id, doctor_id)
);

create index treatment_recommendations_case_idx on public.treatment_recommendations(case_id, status);
create index treatment_recommendations_doctor_idx on public.treatment_recommendations(doctor_id, updated_at desc);

create table public.radiology_centers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  legal_name text not null check (char_length(legal_name) between 2 and 240),
  display_name_i18n jsonb not null check (jsonb_typeof(display_name_i18n) = 'object'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(description_i18n) = 'object'),
  country_id uuid not null references public.countries(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  address_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(address_i18n) = 'object'),
  public_phone text,
  public_email text,
  website_url text,
  google_place_id text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  status public.record_status not null default 'DRAFT',
  verification_state public.provider_verification_state not null default 'DRAFT',
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((is_verified and verified_at is not null) or not is_verified)
);

create index radiology_centers_discovery_idx on public.radiology_centers(status, verification_state, country_id, city_id);

create table public.medical_laboratories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  legal_name text not null check (char_length(legal_name) between 2 and 240),
  display_name_i18n jsonb not null check (jsonb_typeof(display_name_i18n) = 'object'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(description_i18n) = 'object'),
  country_id uuid not null references public.countries(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  address_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(address_i18n) = 'object'),
  public_phone text,
  public_email text,
  website_url text,
  google_place_id text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  status public.record_status not null default 'DRAFT',
  verification_state public.provider_verification_state not null default 'DRAFT',
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((is_verified and verified_at is not null) or not is_verified)
);

create index medical_laboratories_discovery_idx on public.medical_laboratories(status, verification_state, country_id, city_id);

alter table public.provider_documents
  add column radiology_center_id uuid references public.radiology_centers(id) on delete cascade,
  add column medical_laboratory_id uuid references public.medical_laboratories(id) on delete cascade;
alter table public.provider_documents drop constraint provider_documents_check;
alter table public.provider_documents drop constraint provider_documents_check1;
alter table public.provider_documents add check (num_nonnulls(hospital_id, doctor_id, pharmacy_id, radiology_center_id, medical_laboratory_id) = 1);
alter table public.provider_documents add check (
  (provider_type = 'HOSPITAL' and hospital_id is not null) or
  (provider_type = 'DOCTOR' and doctor_id is not null) or
  (provider_type = 'PHARMACY' and pharmacy_id is not null) or
  (provider_type = 'RADIOLOGY_CENTER' and radiology_center_id is not null) or
  (provider_type = 'MEDICAL_LABORATORY' and medical_laboratory_id is not null)
);
create index provider_documents_radiology_center_idx on public.provider_documents(radiology_center_id);
create index provider_documents_medical_laboratory_idx on public.provider_documents(medical_laboratory_id);

alter table public.provider_accreditations
  add column radiology_center_id uuid references public.radiology_centers(id) on delete cascade,
  add column medical_laboratory_id uuid references public.medical_laboratories(id) on delete cascade;
alter table public.provider_accreditations drop constraint provider_accreditations_check;
alter table public.provider_accreditations drop constraint provider_accreditations_check1;
alter table public.provider_accreditations add check (num_nonnulls(hospital_id, doctor_id, pharmacy_id, radiology_center_id, medical_laboratory_id) = 1);
alter table public.provider_accreditations add check (
  (provider_type = 'HOSPITAL' and hospital_id is not null) or
  (provider_type = 'DOCTOR' and doctor_id is not null) or
  (provider_type = 'PHARMACY' and pharmacy_id is not null) or
  (provider_type = 'RADIOLOGY_CENTER' and radiology_center_id is not null) or
  (provider_type = 'MEDICAL_LABORATORY' and medical_laboratory_id is not null)
);
create index provider_accreditations_radiology_center_idx on public.provider_accreditations(radiology_center_id);
create index provider_accreditations_medical_laboratory_idx on public.provider_accreditations(medical_laboratory_id);

create table public.radiology_center_specialties (
  radiology_center_id uuid not null references public.radiology_centers(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (radiology_center_id, specialty_id)
);

create index radiology_center_specialties_specialty_idx on public.radiology_center_specialties(specialty_id);

create table public.medical_laboratory_specialties (
  medical_laboratory_id uuid not null references public.medical_laboratories(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (medical_laboratory_id, specialty_id)
);

create index medical_laboratory_specialties_specialty_idx on public.medical_laboratory_specialties(specialty_id);

create function public.is_case_patient(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.medical_cases
    where id = target_case_id and patient_id = auth.uid()
  );
$$;

create function public.is_case_doctor(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.case_doctor_assignments a
    join public.doctors d on d.id = a.doctor_id
    where a.case_id = target_case_id
      and a.status = 'ACTIVE'
      and d.user_id = auth.uid()
      and d.status = 'ACTIVE'
      and d.verification_state = 'VERIFIED'
  );
$$;

create function public.can_access_medical_case(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_case_patient(target_case_id)
    or public.is_case_doctor(target_case_id)
    or public.has_admin_privilege('cases.manage');
$$;

create function public.is_radiology_center_owner(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.radiology_centers where id = target_id and owner_user_id = auth.uid());
$$;

create function public.is_medical_laboratory_owner(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.medical_laboratories where id = target_id and owner_user_id = auth.uid());
$$;

create function public.can_access_case_object(object_name text, write_access boolean default false)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_patient_id uuid;
  path_case_id uuid;
begin
  path_patient_id := split_part(object_name, '/', 1)::uuid;
  path_case_id := split_part(object_name, '/', 2)::uuid;
  if write_access then
    return path_patient_id = auth.uid() and exists (
      select 1 from public.medical_cases c
      where c.id = path_case_id and c.patient_id = path_patient_id
    );
  end if;
  return exists (
    select 1 from public.medical_cases c
    where c.id = path_case_id
      and c.patient_id = path_patient_id
      and public.can_access_medical_case(c.id)
  );
exception when others then
  return false;
end;
$$;

create function public.protect_medical_case_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or public.has_admin_privilege('cases.manage') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.patient_id <> auth.uid() or new.status <> 'DRAFT' then
      raise exception 'patients may create only their own draft medical cases';
    end if;
    return new;
  end if;

  if new.patient_id is distinct from old.patient_id then
    raise exception 'medical case ownership cannot be changed';
  end if;

  if old.status <> 'DRAFT' and (
    new.specialty_id is distinct from old.specialty_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.symptoms_notes is distinct from old.symptoms_notes
  ) then
    raise exception 'submitted medical details cannot be changed by the patient';
  end if;

  if not (
    (old.status = 'DRAFT' and new.status in ('DRAFT', 'SUBMITTED', 'CANCELLED'))
    or (old.status in ('SUBMITTED', 'UNDER_REVIEW') and new.status in (old.status, 'CANCELLED'))
    or (old.status = 'RECOMMENDATION_AVAILABLE' and new.status in ('RECOMMENDATION_AVAILABLE', 'CLOSED', 'CANCELLED'))
    or (old.status in ('CLOSED', 'CANCELLED') and new.status = old.status)
  ) then
    raise exception 'medical case status transition is not permitted';
  end if;

  return new;
end;
$$;

create function public.normalize_medical_case_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'SUBMITTED' and old.status is distinct from 'SUBMITTED' then
    new.submitted_at := coalesce(new.submitted_at, timezone('utc', now()));
  end if;
  if new.status in ('CLOSED', 'CANCELLED') and old.status is distinct from new.status then
    new.closed_at := coalesce(new.closed_at, timezone('utc', now()));
  elsif new.status not in ('CLOSED', 'CANCELLED') then
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create function public.protect_treatment_recommendation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  case_specialty uuid;
  treatment_specialty uuid;
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role')
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    and not public.has_admin_privilege('cases.manage') then
    if not exists (
      select 1 from public.doctors d
      join public.case_doctor_assignments a on a.doctor_id = d.id
      where d.id = new.doctor_id and d.user_id = auth.uid()
        and d.verification_state = 'VERIFIED' and d.status = 'ACTIVE'
        and a.case_id = new.case_id and a.status = 'ACTIVE'
    ) then
      raise exception 'doctor is not authorized to recommend treatment for this case';
    end if;
  end if;

  select specialty_id into case_specialty from public.medical_cases where id = new.case_id;
  select specialty_id into treatment_specialty from public.treatments where id = new.treatment_id and status = 'ACTIVE';
  if case_specialty is null or treatment_specialty is null or case_specialty <> treatment_specialty then
    raise exception 'recommended treatment must belong to the case specialty';
  end if;

  if new.status = 'SUBMITTED' then
    new.submitted_at := coalesce(new.submitted_at, timezone('utc', now()));
  else
    new.submitted_at := null;
  end if;
  return new;
end;
$$;

create function public.sync_case_recommendation_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'SUBMITTED' then
    update public.medical_cases
    set status = 'RECOMMENDATION_AVAILABLE'
    where id = new.case_id and status not in ('CLOSED', 'CANCELLED');
  elsif tg_op = 'UPDATE' and old.status = 'SUBMITTED' and new.status <> 'SUBMITTED'
    and not exists (
      select 1 from public.treatment_recommendations r
      where r.case_id = new.case_id and r.status = 'SUBMITTED' and r.id <> new.id
    ) then
    update public.medical_cases
    set status = 'UNDER_REVIEW'
    where id = new.case_id and status = 'RECOMMENDATION_AVAILABLE';
  end if;
  return new;
end;
$$;

create function public.search_providers(
  p_query text default null,
  p_provider_type text default null,
  p_country_id uuid default null,
  p_city_id uuid default null,
  p_specialty_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  provider_type public.provider_type,
  provider_id uuid,
  location_id uuid,
  name_i18n jsonb,
  description_i18n jsonb,
  country_id uuid,
  city_id uuid,
  specialty_ids uuid[],
  latitude double precision,
  longitude double precision,
  public_phone text,
  public_email text,
  website_url text,
  distance_km double precision,
  total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with provider_rows as (
    select 'HOSPITAL'::public.provider_type as provider_type, h.id as provider_id, b.id as location_id,
      h.display_name_i18n as name_i18n, h.short_description_i18n as description_i18n,
      coalesce(b.country_id, h.country_id) as country_id, coalesce(b.city_id, h.city_id) as city_id,
      coalesce((select array_agg(hs.specialty_id) from public.hospital_specialties hs where hs.hospital_id = h.id), '{}'::uuid[]) as specialty_ids,
      coalesce(b.latitude, h.latitude)::double precision as latitude,
      coalesce(b.longitude, h.longitude)::double precision as longitude,
      coalesce(b.public_phone, h.public_phone) as public_phone,
      coalesce(b.public_email, h.public_email) as public_email,
      h.website_url
    from public.hospitals h
    left join lateral (
      select hb.* from public.hospital_branches hb
      where hb.hospital_id = h.id and hb.status = 'ACTIVE'
      order by hb.is_main desc, hb.created_at asc limit 1
    ) b on true
    where h.status = 'ACTIVE' and h.verification_state = 'VERIFIED'

    union all
    select 'DOCTOR'::public.provider_type, d.id, coalesce(dh.branch_id, dh.hospital_id),
      jsonb_build_object('en', coalesce(d.display_name, d.first_name || ' ' || d.last_name), 'fr', coalesce(d.display_name, d.first_name || ' ' || d.last_name), 'ar', coalesce(d.display_name, d.first_name || ' ' || d.last_name)),
      d.biography_i18n,
      coalesce(hb.country_id, h.country_id), coalesce(hb.city_id, h.city_id),
      coalesce((select array_agg(ds.specialty_id) from public.doctor_specialties ds where ds.doctor_id = d.id), '{}'::uuid[]),
      coalesce(hb.latitude, h.latitude)::double precision, coalesce(hb.longitude, h.longitude)::double precision,
      coalesce(hb.public_phone, h.public_phone), coalesce(hb.public_email, h.public_email), h.website_url
    from public.doctors d
    left join lateral (
      select x.* from public.doctor_hospitals x
      where x.doctor_id = d.id and x.status = 'ACTIVE'
      order by x.is_primary desc, x.created_at asc limit 1
    ) dh on true
    left join public.hospitals h on h.id = dh.hospital_id and h.status = 'ACTIVE' and h.verification_state = 'VERIFIED'
    left join public.hospital_branches hb on hb.id = dh.branch_id and hb.status = 'ACTIVE'
    where d.status = 'ACTIVE' and d.verification_state = 'VERIFIED'

    union all
    select 'PHARMACY'::public.provider_type, p.id, p.id, p.display_name_i18n, '{}'::jsonb,
      p.country_id, p.city_id, '{}'::uuid[], p.latitude::double precision, p.longitude::double precision,
      p.public_phone, p.public_email, p.website_url
    from public.pharmacies p where p.status = 'ACTIVE' and p.verification_state = 'VERIFIED'

    union all
    select 'RADIOLOGY_CENTER'::public.provider_type, r.id, r.id, r.display_name_i18n, r.description_i18n,
      r.country_id, r.city_id,
      coalesce((select array_agg(rs.specialty_id) from public.radiology_center_specialties rs where rs.radiology_center_id = r.id), '{}'::uuid[]),
      r.latitude::double precision, r.longitude::double precision, r.public_phone, r.public_email, r.website_url
    from public.radiology_centers r where r.status = 'ACTIVE' and r.verification_state = 'VERIFIED'

    union all
    select 'MEDICAL_LABORATORY'::public.provider_type, l.id, l.id, l.display_name_i18n, l.description_i18n,
      l.country_id, l.city_id,
      coalesce((select array_agg(ls.specialty_id) from public.medical_laboratory_specialties ls where ls.medical_laboratory_id = l.id), '{}'::uuid[]),
      l.latitude::double precision, l.longitude::double precision, l.public_phone, l.public_email, l.website_url
    from public.medical_laboratories l where l.status = 'ACTIVE' and l.verification_state = 'VERIFIED'
  ), filtered as (
    select pr.*,
      case when p_latitude is not null and p_longitude is not null and pr.latitude is not null and pr.longitude is not null then
        6371 * acos(least(1, greatest(-1,
          cos(radians(p_latitude)) * cos(radians(pr.latitude)) * cos(radians(pr.longitude) - radians(p_longitude))
          + sin(radians(p_latitude)) * sin(radians(pr.latitude))
        )))
      end as distance_km
    from provider_rows pr
    where (p_provider_type is null or pr.provider_type::text = upper(p_provider_type))
      and (p_country_id is null or pr.country_id = p_country_id)
      and (p_city_id is null or pr.city_id = p_city_id)
      and (p_specialty_id is null or p_specialty_id = any(pr.specialty_ids))
      and (coalesce(trim(p_query), '') = '' or pr.name_i18n::text ilike '%' || trim(p_query) || '%')
  )
  select f.provider_type, f.provider_id, f.location_id, f.name_i18n, f.description_i18n,
    f.country_id, f.city_id, f.specialty_ids, f.latitude, f.longitude,
    f.public_phone, f.public_email, f.website_url, f.distance_km, count(*) over() as total_count
  from filtered f
  order by f.distance_km asc nulls last, f.name_i18n->>'en' asc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

create or replace function public.can_manage_provider_object(object_name text)
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
  if public.has_admin_privilege('providers.documents') then return true; end if;
  if provider_kind = 'hospital' then return public.is_hospital_member(provider_id); end if;
  if provider_kind = 'doctor' then return public.is_doctor_owner(provider_id); end if;
  if provider_kind = 'pharmacy' then return public.is_pharmacy_owner(provider_id); end if;
  if provider_kind = 'radiology_center' then return public.is_radiology_center_owner(provider_id); end if;
  if provider_kind = 'medical_laboratory' then return public.is_medical_laboratory_owner(provider_id); end if;
  return false;
exception when others then
  return false;
end;
$$;

create or replace function public.protect_verification_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  if tg_table_name in ('hospitals', 'doctors', 'pharmacies', 'radiology_centers', 'medical_laboratories') then
    if (tg_op = 'INSERT' and (new.is_verified or new.verified_at is not null or new.verification_state <> 'DRAFT'))
      or (tg_op = 'UPDATE' and (
        new.is_verified is distinct from old.is_verified
        or new.verified_at is distinct from old.verified_at
        or new.verification_state is distinct from old.verification_state
      )) then
      if not public.has_admin_privilege('providers.verify') then
        raise exception 'verification fields require provider verification permission';
      end if;
    end if;
  elsif tg_table_name = 'provider_documents' then
    if (tg_op = 'INSERT' and (new.status <> 'PENDING' or new.reviewed_by is not null or new.reviewed_at is not null or new.review_notes is not null))
      or (tg_op = 'UPDATE' and (new.status is distinct from old.status
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.review_notes is distinct from old.review_notes)) then
      if not public.has_admin_privilege('providers.verify') then
        raise exception 'document verification requires provider verification permission';
      end if;
    end if;
  elsif tg_table_name = 'provider_accreditations' then
    if (tg_op = 'INSERT' and new.status <> 'PENDING')
      or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
      if not public.has_admin_privilege('providers.verify') then
        raise exception 'accreditation verification requires provider verification permission';
      end if;
    end if;
  end if;
  return new;
end;
$$;

alter table public.medical_cases enable row level security;
alter table public.case_doctor_assignments enable row level security;
alter table public.case_documents enable row level security;
alter table public.treatment_recommendations enable row level security;
alter table public.radiology_centers enable row level security;
alter table public.medical_laboratories enable row level security;
alter table public.radiology_center_specialties enable row level security;
alter table public.medical_laboratory_specialties enable row level security;

create policy medical_cases_scoped_read on public.medical_cases for select to authenticated
  using (public.can_access_medical_case(id));
create policy medical_cases_patient_insert on public.medical_cases for insert to authenticated
  with check (patient_id = auth.uid());
create policy medical_cases_patient_or_admin_update on public.medical_cases for update to authenticated
  using (patient_id = auth.uid() or public.has_admin_privilege('cases.manage'))
  with check (patient_id = auth.uid() or public.has_admin_privilege('cases.manage'));
create policy medical_cases_patient_or_admin_delete on public.medical_cases for delete to authenticated
  using ((patient_id = auth.uid() and status = 'DRAFT') or public.has_admin_privilege('cases.manage'));

create policy case_assignments_scoped_read on public.case_doctor_assignments for select to authenticated
  using (public.is_case_patient(case_id) or public.is_case_doctor(case_id) or public.has_admin_privilege('cases.manage'));
create policy case_assignments_admin_write on public.case_doctor_assignments for all to authenticated
  using (public.has_admin_privilege('cases.assign'))
  with check (public.has_admin_privilege('cases.assign'));

create policy case_documents_scoped_read on public.case_documents for select to authenticated
  using (public.can_access_medical_case(case_id));
create policy case_documents_patient_insert on public.case_documents for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_case_patient(case_id));
create policy case_documents_patient_update on public.case_documents for update to authenticated
  using (uploaded_by = auth.uid() and public.is_case_patient(case_id))
  with check (uploaded_by = auth.uid() and public.is_case_patient(case_id));
create policy case_documents_patient_or_admin_delete on public.case_documents for delete to authenticated
  using ((uploaded_by = auth.uid() and public.is_case_patient(case_id)) or public.has_admin_privilege('cases.manage'));

create policy recommendations_scoped_read on public.treatment_recommendations for select to authenticated
  using (
    (public.is_case_patient(case_id) and status = 'SUBMITTED')
    or public.is_case_doctor(case_id)
    or public.has_admin_privilege('cases.manage')
  );
create policy recommendations_doctor_insert on public.treatment_recommendations for insert to authenticated
  with check (public.is_case_doctor(case_id) or public.has_admin_privilege('cases.manage'));
create policy recommendations_doctor_update on public.treatment_recommendations for update to authenticated
  using ((public.is_case_doctor(case_id) and exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())) or public.has_admin_privilege('cases.manage'))
  with check ((public.is_case_doctor(case_id) and exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())) or public.has_admin_privilege('cases.manage'));
create policy recommendations_doctor_delete on public.treatment_recommendations for delete to authenticated
  using ((status = 'DRAFT' and exists (select 1 from public.doctors d where d.id = doctor_id and d.user_id = auth.uid())) or public.has_admin_privilege('cases.manage'));

create policy radiology_centers_public_or_owner_read on public.radiology_centers for select
  using ((status = 'ACTIVE' and verification_state = 'VERIFIED') or public.is_radiology_center_owner(id) or public.has_admin_privilege('providers.diagnostics'));
create policy radiology_centers_admin_insert on public.radiology_centers for insert to authenticated
  with check (public.has_admin_privilege('providers.diagnostics'));
create policy radiology_centers_owner_or_admin_update on public.radiology_centers for update to authenticated
  using (public.is_radiology_center_owner(id) or public.has_admin_privilege('providers.diagnostics'))
  with check (public.is_radiology_center_owner(id) or public.has_admin_privilege('providers.diagnostics'));
create policy radiology_centers_admin_delete on public.radiology_centers for delete to authenticated
  using (public.has_admin_privilege('providers.diagnostics'));

create policy medical_laboratories_public_or_owner_read on public.medical_laboratories for select
  using ((status = 'ACTIVE' and verification_state = 'VERIFIED') or public.is_medical_laboratory_owner(id) or public.has_admin_privilege('providers.diagnostics'));
create policy medical_laboratories_admin_insert on public.medical_laboratories for insert to authenticated
  with check (public.has_admin_privilege('providers.diagnostics'));
create policy medical_laboratories_owner_or_admin_update on public.medical_laboratories for update to authenticated
  using (public.is_medical_laboratory_owner(id) or public.has_admin_privilege('providers.diagnostics'))
  with check (public.is_medical_laboratory_owner(id) or public.has_admin_privilege('providers.diagnostics'));
create policy medical_laboratories_admin_delete on public.medical_laboratories for delete to authenticated
  using (public.has_admin_privilege('providers.diagnostics'));

create policy radiology_center_specialties_public_read on public.radiology_center_specialties for select
  using (exists (select 1 from public.radiology_centers r where r.id = radiology_center_id));
create policy radiology_center_specialties_scoped_write on public.radiology_center_specialties for all to authenticated
  using (public.is_radiology_center_owner(radiology_center_id) or public.has_admin_privilege('providers.diagnostics'))
  with check (public.is_radiology_center_owner(radiology_center_id) or public.has_admin_privilege('providers.diagnostics'));
create policy medical_laboratory_specialties_public_read on public.medical_laboratory_specialties for select
  using (exists (select 1 from public.medical_laboratories l where l.id = medical_laboratory_id));
create policy medical_laboratory_specialties_scoped_write on public.medical_laboratory_specialties for all to authenticated
  using (public.is_medical_laboratory_owner(medical_laboratory_id) or public.has_admin_privilege('providers.diagnostics'))
  with check (public.is_medical_laboratory_owner(medical_laboratory_id) or public.has_admin_privilege('providers.diagnostics'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-medical', 'patient-medical', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/dicom'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy patient_medical_scoped_read on storage.objects for select to authenticated
  using (bucket_id = 'patient-medical' and public.can_access_case_object(name, false));
create policy patient_medical_patient_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-medical' and public.can_access_case_object(name, true));
create policy patient_medical_patient_update on storage.objects for update to authenticated
  using (bucket_id = 'patient-medical' and public.can_access_case_object(name, true))
  with check (bucket_id = 'patient-medical' and public.can_access_case_object(name, true));
create policy patient_medical_patient_delete on storage.objects for delete to authenticated
  using (bucket_id = 'patient-medical' and public.can_access_case_object(name, true));

create trigger medical_cases_protect_fields before insert or update on public.medical_cases for each row execute function public.protect_medical_case_fields();
create trigger medical_cases_normalize_status before update on public.medical_cases for each row execute function public.normalize_medical_case_status();
create trigger treatment_recommendations_protect before insert or update on public.treatment_recommendations for each row execute function public.protect_treatment_recommendation();
create trigger treatment_recommendations_sync_case after insert or update on public.treatment_recommendations for each row execute function public.sync_case_recommendation_status();

create trigger medical_cases_set_updated_at before update on public.medical_cases for each row execute function public.set_updated_at();
create trigger case_doctor_assignments_set_updated_at before update on public.case_doctor_assignments for each row execute function public.set_updated_at();
create trigger case_documents_set_updated_at before update on public.case_documents for each row execute function public.set_updated_at();
create trigger treatment_recommendations_set_updated_at before update on public.treatment_recommendations for each row execute function public.set_updated_at();
create trigger radiology_centers_set_updated_at before update on public.radiology_centers for each row execute function public.set_updated_at();
create trigger medical_laboratories_set_updated_at before update on public.medical_laboratories for each row execute function public.set_updated_at();
create trigger radiology_centers_protect_verification before insert or update on public.radiology_centers for each row execute function public.protect_verification_fields();
create trigger medical_laboratories_protect_verification before insert or update on public.medical_laboratories for each row execute function public.protect_verification_fields();
create trigger radiology_centers_sync_verification before insert or update of verification_state on public.radiology_centers for each row execute function public.sync_provider_verification();
create trigger medical_laboratories_sync_verification before insert or update of verification_state on public.medical_laboratories for each row execute function public.sync_provider_verification();

create trigger medical_cases_audit after insert or update or delete on public.medical_cases for each row execute function public.audit_admin_change();
create trigger case_doctor_assignments_audit after insert or update or delete on public.case_doctor_assignments for each row execute function public.audit_admin_change();
create trigger case_documents_audit after insert or update or delete on public.case_documents for each row execute function public.audit_admin_change();
create trigger treatment_recommendations_audit after insert or update or delete on public.treatment_recommendations for each row execute function public.audit_admin_change();
create trigger radiology_centers_audit after insert or update or delete on public.radiology_centers for each row execute function public.audit_admin_change();
create trigger medical_laboratories_audit after insert or update or delete on public.medical_laboratories for each row execute function public.audit_admin_change();

grant execute on function public.is_case_patient(uuid) to authenticated;
grant execute on function public.is_case_doctor(uuid) to authenticated;
grant execute on function public.can_access_medical_case(uuid) to authenticated;
grant execute on function public.can_access_case_object(text, boolean) to authenticated;
grant execute on function public.is_radiology_center_owner(uuid) to anon, authenticated;
grant execute on function public.is_medical_laboratory_owner(uuid) to anon, authenticated;
grant execute on function public.search_providers(text, text, uuid, uuid, uuid, double precision, double precision, integer, integer) to anon, authenticated;

grant select on table public.radiology_centers, public.medical_laboratories,
  public.radiology_center_specialties, public.medical_laboratory_specialties to anon;
grant select on table public.medical_cases, public.case_doctor_assignments, public.case_documents,
  public.treatment_recommendations, public.radiology_centers, public.medical_laboratories,
  public.radiology_center_specialties, public.medical_laboratory_specialties to authenticated;
grant insert, update, delete on table public.medical_cases, public.case_doctor_assignments,
  public.case_documents, public.treatment_recommendations, public.radiology_centers,
  public.medical_laboratories, public.radiology_center_specialties,
  public.medical_laboratory_specialties to authenticated;

commit;
