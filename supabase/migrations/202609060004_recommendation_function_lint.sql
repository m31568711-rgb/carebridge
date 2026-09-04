create or replace function public.doctor_recommend_journey_treatment(
  target_booking_id uuid,target_treatment_id uuid,target_notes text,target_next_steps text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; d public.doctors; service_id uuid; case_specialty uuid; treatment_specialty uuid;
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
      next_steps=excluded.next_steps,status='SUBMITTED',submitted_at=timezone('utc',now());
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

revoke all on function public.doctor_recommend_journey_treatment(uuid,uuid,text,text) from public,anon;
grant execute on function public.doctor_recommend_journey_treatment(uuid,uuid,text,text) to authenticated;
