begin;

-- The Admin Edge Function is the only application path holding service_role.
-- Grant only the normalized account-linking operations it performs.
grant select, update on table public.profiles to service_role;
grant select, insert, delete on table public.user_roles to service_role;
grant insert on table public.doctors to service_role;
grant insert on table public.hospital_memberships to service_role;
grant insert on table public.diagnostic_provider_memberships to service_role;
grant insert on table public.audit_logs to service_role;

commit;
