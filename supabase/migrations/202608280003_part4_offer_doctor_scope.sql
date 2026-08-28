begin;

create function public.is_doctor_assigned_to_case(target_case_id uuid, target_doctor_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.case_doctor_assignments
    where case_id = target_case_id and doctor_id = target_doctor_id and status = 'ACTIVE'
  );
$$;

revoke all on function public.is_doctor_assigned_to_case(uuid, uuid) from public;

create or replace function public.protect_offer_change()
returns trigger language plpgsql set search_path = '' as $$
declare is_admin boolean; is_patient boolean; is_manager boolean; case_specialty uuid; treatment_specialty uuid;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role', true),'') = 'service_role' then return new; end if;
  is_admin := public.has_admin_privilege('offers.manage');
  is_patient := public.is_offer_patient(new);
  is_manager := public.can_manage_offer(new);
  if tg_op = 'INSERT' then
    if not (is_manager or is_admin) or new.status <> 'DRAFT' or new.created_by <> auth.uid() then raise exception 'offer creation is not permitted'; end if;
  else
    if new.case_id is distinct from old.case_id or new.provider_type is distinct from old.provider_type
      or new.hospital_id is distinct from old.hospital_id or new.pharmacy_id is distinct from old.pharmacy_id
      or new.radiology_center_id is distinct from old.radiology_center_id or new.medical_laboratory_id is distinct from old.medical_laboratory_id
      or new.created_by is distinct from old.created_by then raise exception 'offer ownership fields are immutable'; end if;
    if old.status <> 'DRAFT' and (new.treatment_id is distinct from old.treatment_id or new.title is distinct from old.title
      or new.description is distinct from old.description or new.estimated_cost is distinct from old.estimated_cost
      or new.currency is distinct from old.currency or new.estimated_stay_days is distinct from old.estimated_stay_days
      or new.proposed_start_date is distinct from old.proposed_start_date or new.proposed_end_date is distinct from old.proposed_end_date
      or new.included_services is distinct from old.included_services or new.excluded_services is distinct from old.excluded_services
      or new.provider_notes is distinct from old.provider_notes) then raise exception 'sent offer contents are locked'; end if;
    if is_patient then
      if not ((old.status in ('SENT','VIEWED') and new.status in ('VIEWED','ACCEPTED','REJECTED')) or new.status = old.status) then raise exception 'patient offer transition is not permitted'; end if;
    elsif is_manager or is_admin then
      if not ((old.status = 'DRAFT' and new.status in ('DRAFT','SENT','WITHDRAWN'))
        or (old.status in ('SENT','VIEWED') and new.status in (old.status,'WITHDRAWN','EXPIRED')) or new.status = old.status) then raise exception 'provider offer transition is not permitted'; end if;
      if new.decision_note is distinct from old.decision_note then raise exception 'provider cannot change patient decision note'; end if;
    else raise exception 'offer update is not permitted'; end if;
  end if;
  select specialty_id into case_specialty from public.medical_cases where id = new.case_id;
  select specialty_id into treatment_specialty from public.treatments where id = new.treatment_id and status = 'ACTIVE';
  if case_specialty is null or treatment_specialty is distinct from case_specialty then raise exception 'offer treatment must belong to case specialty'; end if;
  if new.recommendation_id is not null and not exists (
    select 1 from public.treatment_recommendations r
    where r.id=new.recommendation_id and r.case_id=new.case_id and r.treatment_id=new.treatment_id and r.status='SUBMITTED'
  ) then raise exception 'offer recommendation must belong to the case and treatment'; end if;
  if new.doctor_id is not null and not public.is_doctor_assigned_to_case(new.case_id, new.doctor_id) then raise exception 'offer doctor must be assigned to the case'; end if;
  if tg_op='UPDATE' and new.status = 'SENT' and old.status is distinct from 'SENT' then new.sent_at := timezone('utc',now()); end if;
  if tg_op='UPDATE' and new.status = 'VIEWED' and old.status is distinct from 'VIEWED' then new.viewed_at := timezone('utc',now()); end if;
  if tg_op='UPDATE' and new.status in ('ACCEPTED','REJECTED') and old.status is distinct from new.status then new.decided_at := timezone('utc',now()); end if;
  if new.status = 'ACCEPTED' and new.valid_until < timezone('utc',now()) then raise exception 'expired offer cannot be accepted'; end if;
  return new;
end; $$;

commit;
