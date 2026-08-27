begin;

-- PostgreSQL privileges and RLS are independent. Grant only the operations for
-- which the existing policies provide a row-level authorization decision.
grant usage on schema public to anon, authenticated;

grant select on table
  public.countries,
  public.cities,
  public.specialties,
  public.treatments,
  public.hospitals,
  public.hospital_branches,
  public.hospital_specialties,
  public.hospital_treatments,
  public.doctors,
  public.doctor_specialties,
  public.doctor_languages,
  public.doctor_hospitals,
  public.pharmacies,
  public.provider_accreditations,
  public.languages,
  public.app_settings
to anon;

grant select on all tables in schema public to authenticated;

grant insert, update, delete on table
  public.countries,
  public.cities,
  public.specialties,
  public.treatments,
  public.hospitals,
  public.hospital_branches,
  public.hospital_specialties,
  public.hospital_treatments,
  public.hospital_memberships,
  public.doctors,
  public.doctor_specialties,
  public.doctor_languages,
  public.doctor_hospitals,
  public.pharmacies,
  public.provider_documents,
  public.provider_accreditations,
  public.languages,
  public.admin_privileges,
  public.user_roles,
  public.app_settings
to authenticated;

grant insert on table public.profiles to authenticated;
grant insert on table public.notifications to authenticated;

-- Preserve the deliberately narrow updates established in Part 1.
revoke update on table public.profiles from authenticated;
grant update (first_name, last_name, display_name, phone, country_id, preferred_language, avatar_path)
  on table public.profiles to authenticated;
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;

commit;
