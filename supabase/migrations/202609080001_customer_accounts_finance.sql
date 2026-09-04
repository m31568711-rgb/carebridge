begin;

-- Keep the original unit_amount as a compatibility field while making its
-- financial meaning explicit.  Existing Part 5 items remain historical base
-- cost records with a zero fee; new CareBridge customer-account items use 30%.
alter table public.invoice_items
  add column service_category text not null default 'OTHER'
    check (service_category in ('DOCTOR','HOSPITAL','PROCEDURE','LABORATORY','RADIOLOGY','ACCOMMODATION','TRAVEL','TRANSPORT','OTHER')),
  add column base_unit_amount numeric(14,2),
  add column carebridge_fee_percent numeric(5,2) not null default 0
    check (carebridge_fee_percent in (0,30));

update public.invoice_items set base_unit_amount=unit_amount where base_unit_amount is null;
alter table public.invoice_items alter column base_unit_amount set not null;
alter table public.invoice_items add constraint invoice_items_base_unit_amount_check check (base_unit_amount>=0 and base_unit_amount=unit_amount);

alter table public.invoice_items drop column line_amount;
alter table public.invoice_items
  add column carebridge_fee_amount numeric(14,2) generated always as (round(quantity*base_unit_amount*carebridge_fee_percent/100,2)) stored,
  add column line_amount numeric(14,2) generated always as (round(quantity*base_unit_amount*(1+carebridge_fee_percent/100),2)) stored;

create or replace function public.protect_invoice_delete()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return old; end if;
  if old.status<>'DRAFT' or not public.can_manage_booking_finance(old.booking_id) then
    raise exception 'only draft invoices can be deleted; issue adjustments or cancellations instead';
  end if;
  return old;
end; $$;

create trigger invoices_protect_delete before delete on public.invoices for each row execute function public.protect_invoice_delete();

-- The existing item trigger already limits changes to drafts.  This trigger
-- prevents a browser client from changing the stored historical fee policy.
create or replace function public.protect_customer_invoice_item()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' and current_user not in ('postgres','supabase_admin','service_role')
    and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
    and new.carebridge_fee_percent<>30 then
    raise exception 'new customer-account items require the current CareBridge fee';
  end if;
  if tg_op='UPDATE' and old.carebridge_fee_percent is distinct from new.carebridge_fee_percent then
    raise exception 'the applied CareBridge fee is immutable';
  end if;
  return new;
end; $$;
create trigger invoice_items_customer_finance_protect before insert or update on public.invoice_items for each row execute function public.protect_customer_invoice_item();

revoke all on function public.protect_invoice_delete(),public.protect_customer_invoice_item() from public;
grant execute on function public.protect_invoice_delete(),public.protect_customer_invoice_item() to authenticated;

commit;
