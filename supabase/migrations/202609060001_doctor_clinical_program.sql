begin;

-- Phase 1 journeys may be opened before a legacy medical case exists.
alter table public.clinical_encounters alter column case_id drop not null;
alter table public.prescriptions alter column case_id drop not null;
alter table public.lab_orders alter column case_id drop not null;
alter table public.radiology_orders alter column case_id drop not null;
alter table public.journey_services add column appointment_id uuid references public.appointments(id) on delete set null;
create unique index journey_services_appointment_uidx on public.journey_services(appointment_id) where appointment_id is not null;

-- A doctor may be assigned through the legacy booking/case or a Journey consultation service.
create or replace function public.is_booking_doctor(target_booking_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.bookings b join public.doctors d on d.user_id=auth.uid() and d.status='ACTIVE' and d.verification_state='VERIFIED'
    where b.id=target_booking_id
      and (b.doctor_id=d.id or exists(
        select 1 from public.journey_services s where s.booking_id=b.id and s.doctor_id=d.id
          and s.service_type='DOCTOR_CONSULTATION' and s.status not in('CANCELLED','ARCHIVED')
      ))
      and (b.case_id is null or public.is_case_doctor(b.case_id))
  );
$$;

-- Admin/support users can coordinate the journey, but cannot author/read private doctor records.
create or replace function public.can_manage_clinical_booking(target_booking uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select public.is_booking_doctor(target_booking);
$$;

create or replace function public.clinical_scope_matches(target_booking uuid,target_patient uuid,target_case uuid,target_doctor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.bookings b
    where b.id=target_booking and b.patient_id=target_patient and b.case_id is not distinct from target_case
      and (b.doctor_id=target_doctor or exists(
        select 1 from public.journey_services s where s.booking_id=b.id and s.doctor_id=target_doctor
          and s.service_type='DOCTOR_CONSULTATION' and s.status not in('CANCELLED','ARCHIVED')
      ))
  );
$$;

create or replace function public.protect_encounter_lifecycle()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return coalesce(new,old); end if;
  if tg_op='DELETE' then
    if old.status<>'OPEN' or not public.can_manage_clinical_booking(old.booking_id) then raise exception 'only an open encounter may be deleted by its doctor'; end if;
    return old;
  end if;
  if tg_op='UPDATE' then
    if old.status in('COMPLETED','CANCELLED') and new is distinct from old then raise exception 'final encounter history is immutable'; end if;
    if new.status is distinct from old.status and not(old.status='OPEN' and new.status in('COMPLETED','CANCELLED')) then raise exception 'invalid encounter transition'; end if;
  end if;
  return new;
end; $$;
create trigger encounters_lifecycle before update or delete on public.clinical_encounters for each row execute function public.protect_encounter_lifecycle();

create or replace function public.protect_draft_clinical_delete()
returns trigger language plpgsql set search_path='' as $$
declare allowed boolean:=false;
begin
  if current_user in('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return old; end if;
  if not public.can_manage_clinical_booking(old.booking_id) then raise exception 'clinical delete denied'; end if;
  allowed:=case tg_table_name
    when 'prescriptions' then old.status='DRAFT'
    when 'lab_orders' then old.status='ORDERED' and not exists(select 1 from public.lab_results r where r.lab_order_id=old.id)
    when 'radiology_orders' then old.status='ORDERED' and not exists(select 1 from public.radiology_results r where r.radiology_order_id=old.id)
    when 'clinical_follow_ups' then old.status='PLANNED'
    else false end;
  if not allowed then raise exception 'only draft clinical records without history may be deleted'; end if;
  return old;
end; $$;
create trigger prescriptions_safe_delete before delete on public.prescriptions for each row execute function public.protect_draft_clinical_delete();
create trigger lab_orders_safe_delete before delete on public.lab_orders for each row execute function public.protect_draft_clinical_delete();
create trigger radiology_orders_safe_delete before delete on public.radiology_orders for each row execute function public.protect_draft_clinical_delete();
create trigger followups_safe_delete before delete on public.clinical_follow_ups for each row execute function public.protect_draft_clinical_delete();

create policy encounters_doctor_delete on public.clinical_encounters for delete to authenticated using(public.can_manage_clinical_booking(booking_id) and status='OPEN');
create policy prescriptions_doctor_delete on public.prescriptions for delete to authenticated using(public.can_manage_clinical_booking(booking_id) and status='DRAFT');
create policy lab_orders_doctor_delete on public.lab_orders for delete to authenticated using(public.can_manage_clinical_booking(booking_id) and status='ORDERED');
create policy radiology_orders_doctor_delete on public.radiology_orders for delete to authenticated using(public.can_manage_clinical_booking(booking_id) and status='ORDERED');
create policy followups_doctor_delete on public.clinical_follow_ups for delete to authenticated using(public.can_manage_clinical_booking(booking_id) and status='PLANNED');
grant delete on public.clinical_encounters,public.prescriptions,public.lab_orders,public.radiology_orders,public.clinical_follow_ups to authenticated;

create function public.doctor_recommend_journey_treatment(
  target_booking_id uuid,target_treatment_id uuid,target_notes text,target_next_steps text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; d public.doctors; recommendation_id uuid; service_id uuid; case_specialty uuid; treatment_specialty uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into d from public.doctors where user_id=auth.uid() and status='ACTIVE' and verification_state='VERIFIED';
  select * into b from public.bookings where id=target_booking_id for update;
  if d.id is null or b.id is null or not public.is_booking_doctor(b.id) then raise exception 'doctor journey access denied'; end if;
  if char_length(trim(target_notes)) not between 10 and 8000 or char_length(coalesce(target_next_steps,''))>4000 then raise exception 'invalid recommendation'; end if;
  select specialty_id into treatment_specialty from public.treatments where id=target_treatment_id and status='ACTIVE';
  if treatment_specialty is null then raise exception 'treatment unavailable'; end if;
  if b.case_id is not null then
    select specialty_id into case_specialty from public.medical_cases where id=b.case_id;
    if case_specialty is distinct from treatment_specialty then raise exception 'treatment specialty mismatch'; end if;
    insert into public.treatment_recommendations(case_id,doctor_id,treatment_id,recommendation_notes,next_steps,status,submitted_at)
    values(b.case_id,d.id,target_treatment_id,trim(target_notes),nullif(trim(target_next_steps),''),'SUBMITTED',timezone('utc',now()))
    on conflict(case_id,doctor_id) do update set treatment_id=excluded.treatment_id,recommendation_notes=excluded.recommendation_notes,
      next_steps=excluded.next_steps,status='SUBMITTED',submitted_at=timezone('utc',now()) returning id into recommendation_id;
  end if;
  select id into service_id from public.journey_services where booking_id=b.id and doctor_id=d.id and service_type='DOCTOR_CONSULTATION'
    and status not in('CANCELLED','ARCHIVED') order by created_at limit 1 for update;
  if service_id is null then
    insert into public.journey_services(booking_id,service_type,selection_state,status,title,doctor_id,treatment_id,notes,created_by)
    values(b.id,'DOCTOR_CONSULTATION','ADMIN_SELECTED','REQUESTED','Treatment recommendation',d.id,target_treatment_id,trim(target_notes),auth.uid()) returning id into service_id;
  else
    update public.journey_services set treatment_id=target_treatment_id,notes=trim(target_notes),
      status=case when status='PLANNED' then 'REQUESTED' else status end where id=service_id;
  end if;
  update public.bookings set treatment_id=target_treatment_id where id=b.id;
  insert into public.journey_events(booking_id,event_type,related_entity_type,related_entity_id,status_label,created_by)
  values(b.id,'treatment.recommended','journey_services',service_id,'SUBMITTED',auth.uid());
  if b.case_id is null then
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
    values(b.patient_id,'treatment.recommended','part6.notifications.treatmentrecommendedTitle','part6.notifications.treatmentrecommendedMessage','booking',b.id);
  end if;
  return service_id;
end; $$;

create function public.doctor_save_journey_procedure(
  target_booking_id uuid,target_hospital_id uuid,target_treatment_id uuid,target_scheduled_at timestamptz,
  target_timezone text,target_duration_minutes integer,target_location_name text,target_instructions text default null,
  target_confirm boolean default false,target_appointment_id uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; d public.doctors; a public.appointments; service public.journey_services; saved_appointment_id uuid; service_status public.journey_service_status;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into d from public.doctors where user_id=auth.uid() and status='ACTIVE' and verification_state='VERIFIED';
  select * into b from public.bookings where id=target_booking_id for update;
  if d.id is null or b.id is null or not public.is_booking_doctor(b.id) then raise exception 'doctor journey access denied'; end if;
  if not exists(select 1 from public.hospitals h where h.id=target_hospital_id and h.status='ACTIVE' and h.is_verified) then raise exception 'hospital unavailable'; end if;
  if not exists(select 1 from public.treatments t where t.id=target_treatment_id and t.status='ACTIVE') then raise exception 'treatment unavailable'; end if;
  if target_scheduled_at<=timezone('utc',now()) or target_duration_minutes not between 5 and 720 or char_length(trim(target_timezone)) not between 1 and 80 or char_length(trim(target_location_name)) not between 2 and 300 then raise exception 'invalid procedure schedule'; end if;
  if target_appointment_id is not null then
    select * into a from public.appointments where id=target_appointment_id for update;
    if a.id is null or a.booking_id<>b.id or a.doctor_id is distinct from d.id or a.appointment_type<>'TREATMENT_PROCEDURE' or a.status in('COMPLETED','CANCELLED','NO_SHOW') then raise exception 'procedure update denied'; end if;
    update public.appointments set hospital_id=target_hospital_id,provider_type='HOSPITAL',scheduled_at=target_scheduled_at,
      timezone=trim(target_timezone),duration_minutes=target_duration_minutes,location_name=trim(target_location_name),instructions=nullif(trim(target_instructions),''),
      status=case when target_confirm then 'CONFIRMED'::public.appointment_status else 'RESCHEDULED'::public.appointment_status end where id=a.id;
    saved_appointment_id:=a.id;
  else
    if exists(select 1 from public.appointments where booking_id=b.id and appointment_type='TREATMENT_PROCEDURE' and status in('REQUESTED','CONFIRMED','RESCHEDULED')) then raise exception 'an active procedure is already scheduled'; end if;
    insert into public.appointments(booking_id,patient_id,provider_type,hospital_id,doctor_id,appointment_type,scheduled_at,timezone,duration_minutes,location_name,status,instructions,created_by)
    values(b.id,b.patient_id,'HOSPITAL',target_hospital_id,d.id,'TREATMENT_PROCEDURE',target_scheduled_at,trim(target_timezone),target_duration_minutes,trim(target_location_name),
      case when target_confirm then 'CONFIRMED'::public.appointment_status else 'REQUESTED'::public.appointment_status end,nullif(trim(target_instructions),''),auth.uid()) returning id into saved_appointment_id;
  end if;
  service_status:=case when target_confirm then 'CONFIRMED'::public.journey_service_status else 'REQUESTED'::public.journey_service_status end;
  select * into service from public.journey_services where booking_id=b.id and service_type='HOSPITAL_PROCEDURE' and status not in('CANCELLED','ARCHIVED') order by (status in('CONFIRMED','IN_PROGRESS','COMPLETED')) desc,created_at limit 1 for update;
  if service.id is not null and service.status in('CONFIRMED','IN_PROGRESS','COMPLETED') and (service.hospital_id is distinct from target_hospital_id or service.treatment_id is distinct from target_treatment_id) then raise exception 'confirmed procedure relationships are immutable'; end if;
  if service.id is null then
    insert into public.journey_services(booking_id,service_type,selection_state,status,title,doctor_id,hospital_id,treatment_id,appointment_id,planned_date,notes,created_by)
    select b.id,'HOSPITAL_PROCEDURE','ADMIN_SELECTED',service_status,coalesce(t.name_i18n->>'en','Planned procedure'),d.id,target_hospital_id,target_treatment_id,saved_appointment_id,target_scheduled_at::date,nullif(trim(target_instructions),''),auth.uid()
    from public.treatments t where t.id=target_treatment_id returning * into service;
  else
    update public.journey_services set appointment_id=saved_appointment_id,planned_date=target_scheduled_at::date,notes=nullif(trim(target_instructions),''),
      status=case when status in('PLANNED','REQUESTED') then service_status else status end where id=service.id;
  end if;
  insert into public.journey_events(booking_id,event_type,related_entity_type,related_entity_id,status_label,created_by)
  values(b.id,'procedure.scheduled','appointment',saved_appointment_id,case when target_confirm then 'CONFIRMED' else 'REQUESTED' end,auth.uid());
  insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
  values(b.patient_id,'procedure.scheduled','part6.notifications.procedurescheduledTitle','part6.notifications.procedurescheduledMessage','booking',b.id);
  return saved_appointment_id;
end; $$;

revoke all on function public.doctor_recommend_journey_treatment(uuid,uuid,text,text),public.doctor_save_journey_procedure(uuid,uuid,uuid,timestamptz,text,integer,text,text,boolean,uuid) from public,anon;
grant execute on function public.doctor_recommend_journey_treatment(uuid,uuid,text,text),public.doctor_save_journey_procedure(uuid,uuid,uuid,timestamptz,text,integer,text,text,boolean,uuid) to authenticated;

commit;
