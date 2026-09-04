begin;

create or replace function public.protect_care_journey_delete()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('postgres','supabase_admin','service_role')
    or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
  then return old; end if;
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

commit;
