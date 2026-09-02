begin;

create or replace function public.admin_list_accounts(requested_type text)
returns table (
  user_id uuid,
  email text,
  full_name text,
  date_of_birth date,
  gender text,
  phone text,
  account_status text,
  role_label text,
  relationship_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'insufficient privileges';
  end if;
  if requested_type not in ('patients','doctors','provider_staff','laboratory_staff','radiology_staff') then
    raise exception 'invalid account type';
  end if;

  return query
  select
    p.id,
    u.email::text,
    coalesce(nullif(p.display_name, ''), nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email::text),
    p.date_of_birth,
    p.gender,
    p.phone,
    p.account_status::text,
    coalesce((select ur.role::text from public.user_roles ur where ur.user_id = p.id order by ur.created_at limit 1), 'PATIENT'),
    case requested_type
      when 'doctors' then (select coalesce(d.display_name, trim(concat_ws(' ', d.first_name, d.last_name))) from public.doctors d where d.user_id = p.id limit 1)
      when 'provider_staff' then (select h.display_name_i18n ->> 'en' from public.hospital_memberships hm join public.hospitals h on h.id = hm.hospital_id where hm.user_id = p.id and hm.is_active order by hm.created_at limit 1)
      when 'laboratory_staff' then (select l.display_name_i18n ->> 'en' from public.diagnostic_provider_memberships dm join public.medical_laboratories l on l.id = dm.medical_laboratory_id where dm.user_id = p.id and dm.provider_type = 'MEDICAL_LABORATORY' and dm.is_active order by dm.created_at limit 1)
      when 'radiology_staff' then (select r.display_name_i18n ->> 'en' from public.diagnostic_provider_memberships dm join public.radiology_centers r on r.id = dm.radiology_center_id where dm.user_id = p.id and dm.provider_type = 'RADIOLOGY_CENTER' and dm.is_active order by dm.created_at limit 1)
      else null
    end,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where case requested_type
    when 'patients' then exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role = 'PATIENT')
    when 'doctors' then exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role = 'DOCTOR')
    when 'provider_staff' then exists (select 1 from public.hospital_memberships hm where hm.user_id = p.id and hm.is_active)
    when 'laboratory_staff' then exists (select 1 from public.diagnostic_provider_memberships dm where dm.user_id = p.id and dm.provider_type = 'MEDICAL_LABORATORY' and dm.is_active)
    when 'radiology_staff' then exists (select 1 from public.diagnostic_provider_memberships dm where dm.user_id = p.id and dm.provider_type = 'RADIOLOGY_CENTER' and dm.is_active)
    else false
  end
  order by p.created_at desc
  limit 250;
end;
$$;

revoke all on function public.admin_list_accounts(text) from public;
grant execute on function public.admin_list_accounts(text) to authenticated;

commit;
