begin;

-- A journey service is the financial source of truth for clinical coordination.
alter table public.journey_services
  add column if not exists base_cost numeric(14,2) check (base_cost is null or base_cost >= 0),
  add column if not exists carebridge_fee_percent numeric(5,2) not null default 30 check (carebridge_fee_percent between 0 and 100),
  add column if not exists carebridge_fee_amount numeric(14,2) generated always as (case when base_cost is null then null else round(base_cost * carebridge_fee_percent / 100, 2) end) stored,
  add column if not exists customer_total numeric(14,2) generated always as (case when base_cost is null then null else round(base_cost + (base_cost * carebridge_fee_percent / 100), 2) end) stored;

update public.journey_services
set base_cost=selected_price, carebridge_fee_percent=30
where base_cost is null and selected_price is not null;

alter table public.invoice_items add column if not exists journey_service_id uuid references public.journey_services(id) on delete set null;
create unique index if not exists invoice_items_journey_service_uidx on public.invoice_items(journey_service_id) where journey_service_id is not null;

-- The original finance migration intentionally constrained the early fixed fee to 30.
-- Journey pricing stores the applied historical percentage and may be adjusted by an authorised Admin.
alter table public.invoice_items drop constraint if exists invoice_items_carebridge_fee_percent_check;
alter table public.invoice_items add constraint invoice_items_carebridge_fee_percent_check check (carebridge_fee_percent between 0 and 100);

-- The provider/offer is legitimately unknown while an Admin is preparing a Patient-to-choose service.
alter table public.invoices alter column offer_id drop not null;
alter table public.invoices alter column provider_type drop not null;
do $$ declare n text; begin
  for n in select conname from pg_constraint where conrelid='public.invoices'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%provider_type%hospital_id%' loop
    execute format('alter table public.invoices drop constraint %I',n);
  end loop;
end $$;
alter table public.invoices add constraint invoices_provider_scope_check check (
  num_nonnulls(hospital_id,pharmacy_id,radiology_center_id,medical_laboratory_id)<=1 and (
    (provider_type is null and num_nonnulls(hospital_id,pharmacy_id,radiology_center_id,medical_laboratory_id)=0) or
    (provider_type='HOSPITAL' and hospital_id is not null) or
    (provider_type='PHARMACY' and pharmacy_id is not null) or
    (provider_type='RADIOLOGY_CENTER' and radiology_center_id is not null) or
    (provider_type='MEDICAL_LABORATORY' and medical_laboratory_id is not null) or provider_type='DOCTOR'
  )
);

create or replace function public.protect_invoice_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare booking public.bookings; manager boolean; blank_provider boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into booking from public.bookings where id=new.booking_id;
  manager:=public.can_manage_booking_finance(new.booking_id);
  if not manager then raise exception 'invoice change is not permitted'; end if;
  blank_provider:=new.provider_type is null and num_nonnulls(new.hospital_id,new.pharmacy_id,new.radiology_center_id,new.medical_laboratory_id)=0;
  if booking.id is null or new.patient_id is distinct from booking.patient_id or (not blank_provider and (new.offer_id is distinct from booking.offer_id or new.provider_type is distinct from booking.provider_type or new.hospital_id is distinct from booking.hospital_id or new.pharmacy_id is distinct from booking.pharmacy_id or new.radiology_center_id is distinct from booking.radiology_center_id or new.medical_laboratory_id is distinct from booking.medical_laboratory_id)) then raise exception 'invoice relationship does not match booking'; end if;
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

-- This RPC is deliberately security-definer: public provider tables are not a reliable
-- Admin service-form catalogue under RLS. It returns only active, verified choices.
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
    select 'LABORATORY'::text,l.id,coalesce(l.name_i18n->>'en',l.name_i18n->>'ar','Laboratory'),null::uuid,null::uuid,null::numeric,null::text
    from public.medical_laboratories l where l.status='ACTIVE' and l.is_verified
  union all
    select 'RADIOLOGY'::text,r.id,coalesce(r.name_i18n->>'en',r.name_i18n->>'ar','Radiology'),null::uuid,null::uuid,null::numeric,null::text
    from public.radiology_centers r where r.status='ACTIVE' and r.is_verified;
end; $$;
revoke all on function public.admin_journey_service_catalog() from public,anon;
grant execute on function public.admin_journey_service_catalog() to authenticated;

create or replace function public.sync_journey_service_finance()
returns trigger language plpgsql security definer set search_path='' as $$
declare b public.bookings; inv uuid; item uuid; provider public.provider_type; invno text;
begin
  if tg_op='DELETE' then
    update public.invoice_items set journey_service_id=null where journey_service_id=old.id;
    return old;
  end if;
  if new.base_cost is null or new.currency is null then return new; end if;
  select * into b from public.bookings where id=new.booking_id;
  if new.service_type='HOSPITAL_PROCEDURE' then provider:='HOSPITAL'; elsif new.service_type='LABORATORY' then provider:='MEDICAL_LABORATORY'; elsif new.service_type='RADIOLOGY' then provider:='RADIOLOGY_CENTER'; else provider:='DOCTOR'; end if;
  select ii.invoice_id into inv from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where ii.journey_service_id=new.id and i.status='DRAFT' limit 1;
  if inv is null then
    invno:='CBI-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14));
    insert into public.invoices(invoice_number,booking_id,offer_id,patient_id,provider_type,hospital_id,medical_laboratory_id,radiology_center_id,currency,status,created_by)
    values(invno,new.booking_id,b.offer_id,b.patient_id,
      case when new.selection_state='PATIENT_TO_CHOOSE' then null else provider end,
      case when new.selection_state<>'PATIENT_TO_CHOOSE' and provider='HOSPITAL' then new.hospital_id end,
      case when new.selection_state<>'PATIENT_TO_CHOOSE' and provider='MEDICAL_LABORATORY' then new.medical_laboratory_id end,
      case when new.selection_state<>'PATIENT_TO_CHOOSE' and provider='RADIOLOGY_CENTER' then new.radiology_center_id end,
      new.currency,'DRAFT',coalesce(new.created_by,auth.uid())) returning id into inv;
    insert into public.invoice_items(invoice_id,journey_service_id,description,service_category,quantity,unit_amount,base_unit_amount,carebridge_fee_percent,display_order)
    values(inv,new.id,new.title,case new.service_type when 'DOCTOR_CONSULTATION' then 'DOCTOR' when 'HOSPITAL_PROCEDURE' then 'PROCEDURE' when 'LABORATORY' then 'LABORATORY' else 'RADIOLOGY' end,1,new.base_cost,new.base_cost,new.carebridge_fee_percent,0);
  else
    update public.invoice_items set description=new.title,service_category=case new.service_type when 'DOCTOR_CONSULTATION' then 'DOCTOR' when 'HOSPITAL_PROCEDURE' then 'PROCEDURE' when 'LABORATORY' then 'LABORATORY' else 'RADIOLOGY' end,unit_amount=new.base_cost,base_unit_amount=new.base_cost,carebridge_fee_percent=new.carebridge_fee_percent where journey_service_id=new.id;
  end if;
  return new;
end; $$;
drop trigger if exists journey_service_finance_sync on public.journey_services;
create trigger journey_service_finance_sync after insert or update of title,base_cost,currency,carebridge_fee_percent,selection_state,doctor_id,hospital_id,medical_laboratory_id,radiology_center_id on public.journey_services for each row execute function public.sync_journey_service_finance();

-- Close the overly broad original read predicate while retaining Admin, patient and assigned clinical access.
drop policy if exists journey_services_scoped_read on public.journey_services;
create policy journey_services_scoped_read on public.journey_services for select to authenticated using (
  public.has_admin_privilege('bookings.manage') or exists(select 1 from public.bookings b where b.id=booking_id and b.patient_id=auth.uid()) or
  (doctor_id is not null and public.is_doctor_owner(doctor_id)) or exists(select 1 from public.bookings b where b.id=booking_id and public.can_manage_booking(b))
);

commit;
