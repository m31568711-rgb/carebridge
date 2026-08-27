begin;

create type public.provider_verification_state as enum (
  'DRAFT',
  'PENDING_REVIEW',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED'
);

alter table public.countries
  add column currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$');

alter table public.specialties
  add column icon_identifier text check (icon_identifier is null or icon_identifier ~ '^[a-z0-9-]+$'),
  add column display_order integer not null default 0 check (display_order >= 0);

alter table public.treatments add column slug text;
update public.treatments set slug = replace(code, '_', '-') where slug is null;
alter table public.treatments alter column slug set not null;
alter table public.treatments add constraint treatments_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
create unique index treatments_slug_uidx on public.treatments(slug);

alter table public.hospitals
  add column short_description_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(short_description_i18n) = 'object'),
  add column international_patient_phone text,
  add column logo_path text,
  add column cover_image_path text,
  add column address_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(address_i18n) = 'object'),
  add column verification_state public.provider_verification_state not null default 'DRAFT';

alter table public.hospital_treatments
  add column estimated_stay_days smallint check (estimated_stay_days is null or estimated_stay_days between 0 and 365),
  add column notes_i18n jsonb not null default '{}'::jsonb check (jsonb_typeof(notes_i18n) = 'object');

alter table public.doctors
  add column professional_title text check (professional_title is null or char_length(professional_title) <= 160),
  add column license_expiration_date date,
  add column verification_state public.provider_verification_state not null default 'DRAFT';

alter table public.doctor_hospitals
  add column consultation_available boolean not null default false;

alter table public.pharmacies
  add column working_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(working_hours) = 'object'),
  add column verification_state public.provider_verification_state not null default 'DRAFT';

alter table public.provider_documents
  add column issued_at date;

alter table public.provider_accreditations
  add column admin_notes text;

update public.hospitals
set verification_state = case when is_verified then 'VERIFIED'::public.provider_verification_state when status = 'DRAFT' then 'DRAFT'::public.provider_verification_state else 'PENDING_REVIEW'::public.provider_verification_state end;
update public.doctors
set verification_state = case when is_verified then 'VERIFIED'::public.provider_verification_state when status = 'DRAFT' then 'DRAFT'::public.provider_verification_state else 'PENDING_REVIEW'::public.provider_verification_state end;
update public.pharmacies
set verification_state = case when is_verified then 'VERIFIED'::public.provider_verification_state when status = 'DRAFT' then 'DRAFT'::public.provider_verification_state else 'PENDING_REVIEW'::public.provider_verification_state end;

create index hospitals_verification_state_idx on public.hospitals(verification_state, status);
create index doctors_verification_state_idx on public.doctors(verification_state, status);
create index pharmacies_verification_state_idx on public.pharmacies(verification_state, status);
create index specialties_display_order_idx on public.specialties(display_order, code);

create table public.languages (
  code text primary key check (code ~ '^[a-z]{2,8}(?:-[A-Z]{2})?$'),
  name_i18n jsonb not null check (jsonb_typeof(name_i18n) = 'object'),
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.doctor_languages (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  language_code text not null references public.languages(code) on delete restrict,
  proficiency text not null default 'PROFESSIONAL' check (proficiency in ('BASIC', 'CONVERSATIONAL', 'PROFESSIONAL', 'NATIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (doctor_id, language_code)
);

create index doctor_languages_language_idx on public.doctor_languages(language_code);

create table public.admin_privileges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission ~ '^[a-z_]+(?:\.[a-z_]+)*$'),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, permission)
);

create index admin_privileges_user_idx on public.admin_privileges(user_id);

create function public.has_admin_privilege(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('SUPER_ADMIN') or (
    public.has_role('ADMIN') and exists (
      select 1 from public.admin_privileges
      where user_id = auth.uid()
        and (
          permission = required_permission
          or (permission = 'master_data.all' and required_permission like 'master_data.%')
        )
    )
  );
$$;

revoke all on function public.has_admin_privilege(text) from public;
grant execute on function public.has_admin_privilege(text) to authenticated;
grant execute on function public.has_admin_privilege(text) to anon;

create or replace function public.is_hospital_member(target_hospital_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_privilege('providers.hospitals') or exists (
    select 1 from public.hospital_memberships
    where hospital_id = target_hospital_id and user_id = auth.uid() and is_active
  );
$$;

create or replace function public.is_hospital_admin(target_hospital_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_privilege('providers.hospitals') or exists (
    select 1 from public.hospital_memberships
    where hospital_id = target_hospital_id and user_id = auth.uid()
      and role = 'HOSPITAL_ADMIN' and is_active
  );
$$;

create or replace function public.is_doctor_owner(target_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_privilege('providers.doctors') or exists (
    select 1 from public.doctors where id = target_doctor_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_pharmacy_owner(target_pharmacy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_privilege('providers.pharmacies') or exists (
    select 1 from public.pharmacies where id = target_pharmacy_id and owner_user_id = auth.uid()
  );
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
  return false;
exception when others then
  return false;
end;
$$;

alter table public.languages enable row level security;
alter table public.doctor_languages enable row level security;
alter table public.admin_privileges enable row level security;

create policy languages_public_read on public.languages for select using (is_active or public.is_platform_admin());
create policy languages_admin_write on public.languages for all to authenticated
  using (public.has_admin_privilege('master_data.languages'))
  with check (public.has_admin_privilege('master_data.languages'));

create policy doctor_languages_public_or_owner_read on public.doctor_languages for select using (
  public.is_doctor_owner(doctor_id)
  or public.is_platform_admin()
  or exists (
    select 1 from public.doctors d
    where d.id = doctor_id and d.status = 'ACTIVE' and d.is_verified
  )
);
create policy doctor_languages_scoped_write on public.doctor_languages for all to authenticated
  using (public.is_doctor_owner(doctor_id) or public.has_admin_privilege('providers.doctors'))
  with check (public.is_doctor_owner(doctor_id) or public.has_admin_privilege('providers.doctors'));

create policy admin_privileges_own_or_super_read on public.admin_privileges for select to authenticated
  using (user_id = auth.uid() or public.has_role('SUPER_ADMIN'));
create policy admin_privileges_super_write on public.admin_privileges for all to authenticated
  using (public.has_role('SUPER_ADMIN')) with check (public.has_role('SUPER_ADMIN'));

drop policy countries_admin_write on public.countries;
create policy countries_admin_write on public.countries for all to authenticated
  using (public.has_admin_privilege('master_data.countries'))
  with check (public.has_admin_privilege('master_data.countries'));

drop policy cities_admin_write on public.cities;
create policy cities_admin_write on public.cities for all to authenticated
  using (public.has_admin_privilege('master_data.cities'))
  with check (public.has_admin_privilege('master_data.cities'));

drop policy specialties_admin_write on public.specialties;
create policy specialties_admin_write on public.specialties for all to authenticated
  using (public.has_admin_privilege('master_data.specialties'))
  with check (public.has_admin_privilege('master_data.specialties'));

drop policy treatments_admin_write on public.treatments;
create policy treatments_admin_write on public.treatments for all to authenticated
  using (public.has_admin_privilege('master_data.treatments'))
  with check (public.has_admin_privilege('master_data.treatments'));

drop policy hospitals_admin_insert on public.hospitals;
drop policy hospitals_scoped_update on public.hospitals;
drop policy hospitals_admin_delete on public.hospitals;
create policy hospitals_admin_insert on public.hospitals for insert to authenticated
  with check (public.has_admin_privilege('providers.hospitals'));
create policy hospitals_scoped_update on public.hospitals for update to authenticated
  using (public.has_admin_privilege('providers.hospitals') or public.is_hospital_admin(id))
  with check (public.has_admin_privilege('providers.hospitals') or public.is_hospital_admin(id));
create policy hospitals_admin_delete on public.hospitals for delete to authenticated
  using (public.has_admin_privilege('providers.hospitals'));

drop policy doctors_admin_insert on public.doctors;
drop policy doctors_owner_update on public.doctors;
drop policy doctors_admin_delete on public.doctors;
create policy doctors_admin_insert on public.doctors for insert to authenticated
  with check (public.has_admin_privilege('providers.doctors'));
create policy doctors_owner_update on public.doctors for update to authenticated
  using (public.has_admin_privilege('providers.doctors') or user_id = auth.uid())
  with check (public.has_admin_privilege('providers.doctors') or user_id = auth.uid());
create policy doctors_admin_delete on public.doctors for delete to authenticated
  using (public.has_admin_privilege('providers.doctors'));

drop policy pharmacies_admin_insert on public.pharmacies;
drop policy pharmacies_owner_update on public.pharmacies;
drop policy pharmacies_admin_delete on public.pharmacies;
create policy pharmacies_admin_insert on public.pharmacies for insert to authenticated
  with check (public.has_admin_privilege('providers.pharmacies'));
create policy pharmacies_owner_update on public.pharmacies for update to authenticated
  using (public.has_admin_privilege('providers.pharmacies') or owner_user_id = auth.uid())
  with check (public.has_admin_privilege('providers.pharmacies') or owner_user_id = auth.uid());
create policy pharmacies_admin_delete on public.pharmacies for delete to authenticated
  using (public.has_admin_privilege('providers.pharmacies'));

drop policy doctor_hospitals_scoped_write on public.doctor_hospitals;
create policy doctor_hospitals_scoped_write on public.doctor_hospitals for all to authenticated
  using (
    public.has_admin_privilege('providers.doctors')
    or public.is_doctor_owner(doctor_id)
    or public.is_hospital_admin(hospital_id)
  )
  with check (
    public.has_admin_privilege('providers.doctors')
    or public.is_doctor_owner(doctor_id)
    or public.is_hospital_admin(hospital_id)
  );

drop policy provider_documents_scoped_read on public.provider_documents;
drop policy provider_documents_scoped_insert on public.provider_documents;
drop policy provider_documents_scoped_update on public.provider_documents;
drop policy provider_documents_scoped_delete on public.provider_documents;
create policy provider_documents_scoped_read on public.provider_documents for select to authenticated using (
  public.has_admin_privilege('providers.documents') or uploaded_by = auth.uid()
  or (hospital_id is not null and public.is_hospital_member(hospital_id))
  or (doctor_id is not null and public.is_doctor_owner(doctor_id))
  or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))
);
create policy provider_documents_scoped_insert on public.provider_documents for insert to authenticated with check (
  public.has_admin_privilege('providers.documents')
  or uploaded_by = auth.uid() and (
    (hospital_id is not null and public.is_hospital_member(hospital_id))
    or (doctor_id is not null and public.is_doctor_owner(doctor_id))
    or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))
  )
);
create policy provider_documents_scoped_update on public.provider_documents for update to authenticated
  using (
    public.has_admin_privilege('providers.documents')
    or (hospital_id is not null and public.is_hospital_member(hospital_id))
    or (doctor_id is not null and public.is_doctor_owner(doctor_id))
    or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))
  )
  with check (
    public.has_admin_privilege('providers.documents')
    or (hospital_id is not null and public.is_hospital_member(hospital_id))
    or (doctor_id is not null and public.is_doctor_owner(doctor_id))
    or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))
  );
create policy provider_documents_scoped_delete on public.provider_documents for delete to authenticated using (
  public.has_admin_privilege('providers.documents') or uploaded_by = auth.uid()
);

drop policy provider_accreditations_scoped_write on public.provider_accreditations;
create policy provider_accreditations_scoped_write on public.provider_accreditations for all to authenticated
  using (
    public.has_admin_privilege('providers.verify')
    or (hospital_id is not null and public.is_hospital_admin(hospital_id))
    or (doctor_id is not null and public.is_doctor_owner(doctor_id))
    or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))
  )
  with check (
    public.has_admin_privilege('providers.verify')
    or (hospital_id is not null and public.is_hospital_admin(hospital_id))
    or (doctor_id is not null and public.is_doctor_owner(doctor_id))
    or (pharmacy_id is not null and public.is_pharmacy_owner(pharmacy_id))
  );

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

  if tg_table_name in ('hospitals', 'doctors', 'pharmacies') then
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

drop trigger hospitals_protect_verification on public.hospitals;
drop trigger doctors_protect_verification on public.doctors;
drop trigger pharmacies_protect_verification on public.pharmacies;
drop trigger provider_documents_protect_verification on public.provider_documents;
drop trigger provider_accreditations_protect_verification on public.provider_accreditations;
create trigger hospitals_protect_verification before insert or update on public.hospitals for each row execute function public.protect_verification_fields();
create trigger doctors_protect_verification before insert or update on public.doctors for each row execute function public.protect_verification_fields();
create trigger pharmacies_protect_verification before insert or update on public.pharmacies for each row execute function public.protect_verification_fields();
create trigger provider_documents_protect_verification before insert or update on public.provider_documents for each row execute function public.protect_verification_fields();
create trigger provider_accreditations_protect_verification before insert or update on public.provider_accreditations for each row execute function public.protect_verification_fields();

create function public.sync_provider_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.verification_state = 'VERIFIED' then
    new.is_verified := true;
    new.verified_at := coalesce(new.verified_at, timezone('utc', now()));
  else
    new.is_verified := false;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger hospitals_sync_verification before insert or update of verification_state on public.hospitals
for each row execute function public.sync_provider_verification();
create trigger doctors_sync_verification before insert or update of verification_state on public.doctors
for each row execute function public.sync_provider_verification();
create trigger pharmacies_sync_verification before insert or update of verification_state on public.pharmacies
for each row execute function public.sync_provider_verification();

create function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  previous_data jsonb;
  target_id uuid;
  event_action public.audit_action;
  event_metadata jsonb;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  row_data := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  previous_data := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  target_id := nullif(coalesce(row_data->>'id', previous_data->>'id'), '')::uuid;
  event_action := case
    when tg_op = 'INSERT' then 'CREATE'::public.audit_action
    when tg_op = 'DELETE' then 'DELETE'::public.audit_action
    when row_data->>'verification_state' = 'VERIFIED' and previous_data->>'verification_state' is distinct from 'VERIFIED' then 'APPROVE'::public.audit_action
    when row_data->>'verification_state' = 'REJECTED' and previous_data->>'verification_state' is distinct from 'REJECTED' then 'REJECT'::public.audit_action
    else 'UPDATE'::public.audit_action
  end;
  event_metadata := jsonb_strip_nulls(jsonb_build_object(
    'operation', tg_op,
    'status_before', previous_data->>'status',
    'status_after', row_data->>'status',
    'verification_before', previous_data->>'verification_state',
    'verification_after', row_data->>'verification_state'
  ));

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), event_action, tg_table_name, target_id, event_metadata);
  if tg_op = 'DELETE' then return old; else return new; end if;
exception when invalid_text_representation then
  insert into public.audit_logs (actor_id, action, entity_type, metadata)
  values (auth.uid(), event_action, tg_table_name, event_metadata);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger countries_audit after insert or update or delete on public.countries for each row execute function public.audit_admin_change();
create trigger cities_audit after insert or update or delete on public.cities for each row execute function public.audit_admin_change();
create trigger specialties_audit after insert or update or delete on public.specialties for each row execute function public.audit_admin_change();
create trigger treatments_audit after insert or update or delete on public.treatments for each row execute function public.audit_admin_change();
create trigger hospitals_audit after insert or update or delete on public.hospitals for each row execute function public.audit_admin_change();
create trigger hospital_branches_audit after insert or update or delete on public.hospital_branches for each row execute function public.audit_admin_change();
create trigger hospital_specialties_audit after insert or update or delete on public.hospital_specialties for each row execute function public.audit_admin_change();
create trigger hospital_treatments_audit after insert or update or delete on public.hospital_treatments for each row execute function public.audit_admin_change();
create trigger doctors_audit after insert or update or delete on public.doctors for each row execute function public.audit_admin_change();
create trigger doctor_specialties_audit after insert or update or delete on public.doctor_specialties for each row execute function public.audit_admin_change();
create trigger doctor_languages_audit after insert or update or delete on public.doctor_languages for each row execute function public.audit_admin_change();
create trigger doctor_hospitals_audit after insert or update or delete on public.doctor_hospitals for each row execute function public.audit_admin_change();
create trigger pharmacies_audit after insert or update or delete on public.pharmacies for each row execute function public.audit_admin_change();
create trigger provider_documents_audit after insert or update or delete on public.provider_documents for each row execute function public.audit_admin_change();
create trigger provider_accreditations_audit after insert or update or delete on public.provider_accreditations for each row execute function public.audit_admin_change();

create trigger languages_set_updated_at before update on public.languages for each row execute function public.set_updated_at();

insert into public.languages (code, name_i18n, display_order)
values
  ('en', '{"en":"English","fr":"Anglais","ar":"الإنجليزية"}', 10),
  ('fr', '{"en":"French","fr":"Français","ar":"الفرنسية"}', 20),
  ('ar', '{"en":"Arabic","fr":"Arabe","ar":"العربية"}', 30)
on conflict (code) do update set name_i18n = excluded.name_i18n, display_order = excluded.display_order;

insert into public.doctor_languages (doctor_id, language_code, proficiency)
select d.id, language_code, 'PROFESSIONAL'
from public.doctors d
cross join lateral unnest(d.languages) as language_code
on conflict (doctor_id, language_code) do nothing;

commit;
