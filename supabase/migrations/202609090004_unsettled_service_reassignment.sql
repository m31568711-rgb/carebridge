begin;
create or replace function public.protect_journey_service_settlement()
returns trigger language plpgsql security definer set search_path='' as $$
declare service public.journey_services;
begin
  if current_user not in ('postgres','supabase_admin','service_role') and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' and not public.has_admin_privilege('finance.manage') then raise exception 'provider settlement change denied';end if;
  select * into service from public.journey_services where id=new.journey_service_id;
  if service.id is null or new.booking_id is distinct from service.booking_id or new.agreed_amount is distinct from service.base_cost or new.currency is distinct from service.currency or new.doctor_id is distinct from service.doctor_id or new.hospital_id is distinct from service.hospital_id or new.medical_laboratory_id is distinct from service.medical_laboratory_id or new.radiology_center_id is distinct from service.radiology_center_id then raise exception 'provider settlement relationship mismatch';end if;
  if tg_op='UPDATE' and (new.journey_service_id is distinct from old.journey_service_id or new.booking_id is distinct from old.booking_id) then raise exception 'provider settlement relationship is immutable';end if;
  if tg_op='UPDATE' and old.settled_amount>0 and (new.provider_type is distinct from old.provider_type or new.doctor_id is distinct from old.doctor_id or new.hospital_id is distinct from old.hospital_id or new.medical_laboratory_id is distinct from old.medical_laboratory_id or new.radiology_center_id is distinct from old.radiology_center_id or new.agreed_amount is distinct from old.agreed_amount or new.currency is distinct from old.currency) then raise exception 'settled provider scope is immutable';end if;
  new.status:=case when new.status='CANCELLED' then 'CANCELLED'::public.provider_settlement_status when new.settled_amount=0 then 'PENDING'::public.provider_settlement_status when new.settled_amount<new.agreed_amount then 'PARTIALLY_SETTLED'::public.provider_settlement_status else 'SETTLED'::public.provider_settlement_status end;
  if tg_op='UPDATE' and new.settled_amount<>old.settled_amount then new.last_settled_at:=timezone('utc',now());end if;
  return new;
end;$$;
revoke all on function public.protect_journey_service_settlement() from public,anon,authenticated;
commit;
