begin;

alter table public.journey_services
  add column treatment_id uuid references public.treatments(id) on delete restrict,
  add column selected_price numeric(14,2) check(selected_price is null or selected_price>=0),
  add column currency text check(currency is null or currency~'^[A-Z]{3}$');

create or replace function public.protect_journey_service_change()
returns trigger language plpgsql set search_path='' as $$
declare patient_owner boolean;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return coalesce(new,old); end if;
  patient_owner:=exists(select 1 from public.bookings b where b.id=coalesce(new.booking_id,old.booking_id) and b.patient_id=auth.uid());
  if tg_op='INSERT' then
    if not public.has_admin_privilege('bookings.manage') then raise exception 'journey service creation denied'; end if;
  elsif tg_op='DELETE' then
    if not public.has_admin_privilege('bookings.manage') then raise exception 'journey service delete denied'; end if;
    if old.status not in ('PLANNED','CANCELLED','ARCHIVED') then raise exception 'confirmed service history cannot be deleted'; end if;
  elsif patient_owner then
    raise exception 'patient selections must use the secure journey selection workflow';
  elsif not public.has_admin_privilege('bookings.manage') then raise exception 'journey service update denied'; end if;
  if tg_op='UPDATE' and new.status is distinct from old.status and not(
    (old.status='PLANNED' and new.status in ('REQUESTED','CONFIRMED','CANCELLED')) or
    (old.status='REQUESTED' and new.status in ('PLANNED','CONFIRMED','CANCELLED')) or
    (old.status='CONFIRMED' and new.status in ('IN_PROGRESS','CANCELLED')) or
    (old.status='IN_PROGRESS' and new.status in ('COMPLETED','CANCELLED')) or
    (old.status in ('COMPLETED','CANCELLED') and new.status='ARCHIVED')
  ) then raise exception 'invalid journey service transition'; end if;
  if tg_op='UPDATE' and old.status in ('CONFIRMED','IN_PROGRESS','COMPLETED','ARCHIVED') and (
    new.booking_id<>old.booking_id or new.service_type<>old.service_type or new.selection_state<>old.selection_state
    or new.doctor_id is distinct from old.doctor_id or new.hospital_id is distinct from old.hospital_id
    or new.medical_laboratory_id is distinct from old.medical_laboratory_id or new.radiology_center_id is distinct from old.radiology_center_id
    or new.treatment_id is distinct from old.treatment_id or new.selected_price is distinct from old.selected_price or new.currency is distinct from old.currency
  ) then raise exception 'confirmed clinical service relationships are immutable'; end if;
  return coalesce(new,old);
end; $$;

create function public.select_patient_journey_hospital(
  target_service_id uuid,
  target_hospital_id uuid,
  target_treatment_id uuid,
  target_branch_id uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare service public.journey_services; journey public.bookings; option_price numeric; option_currency text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into service from public.journey_services where id=target_service_id for update;
  select * into journey from public.bookings where id=service.booking_id;
  if service.id is null or journey.patient_id<>auth.uid() then raise exception 'journey service access denied'; end if;
  if service.service_type<>'HOSPITAL_PROCEDURE' or service.selection_state<>'PATIENT_TO_CHOOSE' or service.status not in('PLANNED','REQUESTED')
  then raise exception 'service is not available for patient selection'; end if;
  if exists(select 1 from public.journey_services x where x.booking_id=service.booking_id and x.id<>service.id and x.service_type=service.service_type and x.status in('CONFIRMED','IN_PROGRESS','COMPLETED'))
  then raise exception 'a clinical provider is already confirmed'; end if;
  select ht.starting_price,ht.currency into option_price,option_currency
  from public.hospital_treatments ht join public.hospitals h on h.id=ht.hospital_id
  where ht.hospital_id=target_hospital_id and ht.treatment_id=target_treatment_id
    and ht.branch_id is not distinct from target_branch_id and ht.status='ACTIVE'
    and ht.starting_price is not null and ht.currency is not null and h.status='ACTIVE' and h.is_verified;
  if option_price is null or option_currency is null then raise exception 'hospital option is unavailable'; end if;
  update public.journey_services set hospital_id=target_hospital_id,treatment_id=target_treatment_id,
    selection_state='PATIENT_SELECTED',status='REQUESTED',selected_price=option_price,currency=option_currency
  where id=service.id;
  insert into public.journey_events(booking_id,event_type,related_entity_type,related_entity_id,status_label,created_by)
  values(service.booking_id,'journey.hospital_selected','journey_services',service.id,'PATIENT_SELECTED',auth.uid());
  insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
    select ur.user_id,'journey.patient_selected','journey.notifications.patientSelectedTitle','journey.notifications.patientSelectedMessage','booking',service.booking_id
    from public.user_roles ur where ur.role in('ADMIN','SUPER_ADMIN');
  return service.id;
end; $$;

create function public.get_patient_journey_encounter_history(target_booking_id uuid)
returns table(id uuid,encountered_at timestamptz,status public.encounter_status,assessment text,diagnosis_summary text,treatment_progress text,next_steps text,follow_up_recommendation text)
language sql stable security definer set search_path='' as $$
  select e.id,e.encountered_at,e.status,e.assessment,e.diagnosis_summary,e.treatment_progress,e.next_steps,e.follow_up_recommendation
  from public.clinical_encounters e join public.bookings b on b.id=e.booking_id
  where e.booking_id=target_booking_id and b.patient_id=auth.uid() and e.status='COMPLETED'
  order by e.encountered_at desc;
$$;

create or replace function public.reserve_accommodation(
  target_booking_id uuid,target_room_option_id uuid,target_arrangement public.accommodation_arrangement,
  target_check_in date,target_check_out date,target_rooms integer,target_guests integer,
  target_final_price numeric default null,target_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare target_booking public.bookings;room_option public.accommodation_room_options;reserved_rooms integer;reservation_id uuid;is_admin boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into target_booking from public.bookings where id=target_booking_id;
  is_admin:=public.is_platform_admin();
  if target_booking.id is null or target_booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' then raise exception 'international booking required'; end if;
  if not is_admin and target_booking.patient_id<>auth.uid() then raise exception 'accommodation access denied'; end if;
  if target_arrangement not in('PATIENT_SELECTED','CAREBRIDGE_ARRANGED') then raise exception 'invalid accommodation arrangement'; end if;
  if not is_admin and target_arrangement<>'PATIENT_SELECTED' then raise exception 'patient arrangement denied'; end if;
  if not is_admin and not exists(select 1 from public.journey_accommodation_preferences p where p.booking_id=target_booking_id and p.patient_id=auth.uid() and p.arrangement='PATIENT_WILL_CHOOSE')
  then raise exception 'accommodation is not assigned for patient selection'; end if;
  if target_check_out<=target_check_in or target_rooms not between 1 and 100 or target_guests not between 1 and 500 then raise exception 'invalid stay'; end if;
  if exists(select 1 from public.accommodation_bookings where booking_id=target_booking_id and status in('HELD','CONFIRMED','CHECKED_IN')) then raise exception 'accommodation already arranged'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_room_option_id::text,0));
  select aro.* into room_option from public.accommodation_room_options aro join public.accommodation_properties ap on ap.id=aro.property_id where aro.id=target_room_option_id and aro.is_active and ap.is_active;
  if room_option.id is null then raise exception 'accommodation option unavailable'; end if;
  select coalesce(sum(number_of_rooms),0)::integer into reserved_rooms from public.accommodation_bookings
    where room_option_id=target_room_option_id and status in('HELD','CONFIRMED','CHECKED_IN') and check_in_date<target_check_out and check_out_date>target_check_in;
  if reserved_rooms+target_rooms>room_option.available_rooms then raise exception 'insufficient room availability'; end if;
  insert into public.accommodation_bookings(booking_id,patient_id,room_option_id,arrangement,check_in_date,check_out_date,number_of_rooms,guests,price_per_night,currency,final_price,status,notes,created_by)
  values(target_booking_id,target_booking.patient_id,target_room_option_id,target_arrangement,target_check_in,target_check_out,target_rooms,target_guests,room_option.price_per_night,room_option.currency,case when is_admin then target_final_price else null end,case when is_admin then 'CONFIRMED'::public.accommodation_booking_status else 'HELD'::public.accommodation_booking_status end,target_notes,auth.uid()) returning id into reservation_id;
  insert into public.journey_accommodation_preferences(booking_id,patient_id,arrangement,notes,updated_by)
  values(target_booking_id,target_booking.patient_id,target_arrangement,target_notes,auth.uid()) on conflict(booking_id) do update set arrangement=excluded.arrangement,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=timezone('utc',now());
  return reservation_id;
end; $$;

revoke all on function public.select_patient_journey_hospital(uuid,uuid,uuid,uuid),public.get_patient_journey_encounter_history(uuid) from public,anon;
grant execute on function public.select_patient_journey_hospital(uuid,uuid,uuid,uuid),public.get_patient_journey_encounter_history(uuid) to authenticated;

commit;
