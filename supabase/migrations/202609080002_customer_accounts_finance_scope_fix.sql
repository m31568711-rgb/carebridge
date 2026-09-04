begin;

-- Finance-scoped administrators are permitted by can_manage_booking_finance,
-- but are intentionally not granted broad booking reads.  This relationship
-- guard must therefore resolve the booking internally while retaining the
-- caller's auth.uid() for authorization decisions.
create or replace function public.protect_invoice_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare booking public.bookings; manager boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into booking from public.bookings where id=new.booking_id;
  manager:=public.can_manage_booking_finance(new.booking_id);
  if not manager then raise exception 'invoice change is not permitted'; end if;
  if booking.id is null or new.patient_id<>booking.patient_id or new.offer_id<>booking.offer_id or new.provider_type<>booking.provider_type
    or new.hospital_id is distinct from booking.hospital_id or new.pharmacy_id is distinct from booking.pharmacy_id
    or new.radiology_center_id is distinct from booking.radiology_center_id or new.medical_laboratory_id is distinct from booking.medical_laboratory_id then raise exception 'invoice relationship does not match booking'; end if;
  if tg_op='INSERT' then
    if new.status<>'DRAFT' or new.created_by<>auth.uid() then raise exception 'invoice must begin as a draft'; end if;
  else
    if new.booking_id is distinct from old.booking_id or new.offer_id is distinct from old.offer_id or new.patient_id is distinct from old.patient_id or new.provider_type is distinct from old.provider_type or new.created_by is distinct from old.created_by then raise exception 'invoice relationship fields are immutable'; end if;
    if old.status<>'DRAFT' and (new.currency is distinct from old.currency or new.due_date is distinct from old.due_date or new.notes is distinct from old.notes) then raise exception 'issued invoice contents are locked'; end if;
    if new.subtotal is distinct from old.subtotal or new.total_amount is distinct from old.total_amount or new.amount_paid is distinct from old.amount_paid then raise exception 'invoice totals are server managed'; end if;
    if new.status is distinct from old.status and not ((old.status='DRAFT' and new.status in ('ISSUED','CANCELLED')) or (old.status in ('ISSUED','PARTIALLY_PAID','OVERDUE') and new.status in ('PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')) or (old.status='PAID' and new.status='REFUNDED')) then raise exception 'invoice transition is not permitted'; end if;
  end if;
  if new.status='ISSUED' and (tg_op='INSERT' or old.status is distinct from 'ISSUED') then new.issued_at:=timezone('utc',now()); end if;
  return new;
end; $$;

revoke all on function public.protect_invoice_change() from public;
grant execute on function public.protect_invoice_change() to authenticated;

commit;
