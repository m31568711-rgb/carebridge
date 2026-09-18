begin;
-- Repair diagnostic provider labels using the existing normalized schema.
-- Preserve the Admin privilege gate, safe search path and restricted grants.
create or replace function public.admin_journey_service_catalog()
returns table(option_type text,id uuid,label text,hospital_id uuid,treatment_id uuid,starting_price numeric,currency text)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.has_admin_privilege('bookings.manage') then raise exception 'journey service catalogue denied'; end if;
  return query
    select 'DOCTOR'::text,d.id,coalesce(d.display_name,trim(d.first_name||' '||d.last_name)),null::uuid,null::uuid,null::numeric,null::text
    from public.doctors d where d.status='ACTIVE' and d.is_verified
  union all
    select 'HOSPITAL'::text,h.id,coalesce(h.display_name_i18n->>'en',h.display_name_i18n->>'ar',h.legal_name),h.id,null::uuid,null::numeric,null::text
    from public.hospitals h where h.status='ACTIVE' and h.is_verified
  union all
    select 'PROCEDURE'::text,ht.treatment_id,coalesce(t.name_i18n->>'en',t.name_i18n->>'ar',t.code),ht.hospital_id,ht.treatment_id,ht.starting_price,ht.currency
    from public.hospital_treatments ht join public.hospitals h on h.id=ht.hospital_id join public.treatments t on t.id=ht.treatment_id
    where ht.status='ACTIVE' and h.status='ACTIVE' and h.is_verified and t.status='ACTIVE'
  union all
    select 'LABORATORY'::text,l.id,coalesce(l.display_name_i18n->>'en',l.display_name_i18n->>'ar',l.legal_name),null::uuid,null::uuid,null::numeric,null::text
    from public.medical_laboratories l where l.status='ACTIVE' and l.is_verified
  union all
    select 'RADIOLOGY'::text,r.id,coalesce(r.display_name_i18n->>'en',r.display_name_i18n->>'ar',r.legal_name),null::uuid,null::uuid,null::numeric,null::text
    from public.radiology_centers r where r.status='ACTIVE' and r.is_verified;
end; $$;
revoke all on function public.admin_journey_service_catalog() from public,anon;
grant execute on function public.admin_journey_service_catalog() to authenticated;
commit;
