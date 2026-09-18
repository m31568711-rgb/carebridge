begin;
create or replace function public.can_manage_assigned_appointment(target public.appointments)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    public.has_admin_privilege('appointments.manage') or
    (target.doctor_id is not null and target.provider_type='DOCTOR' and public.is_doctor_owner(target.doctor_id)) or
    (target.hospital_id is not null and target.provider_type='HOSPITAL' and public.is_hospital_member(target.hospital_id)) or
    (target.medical_laboratory_id is not null and target.provider_type='MEDICAL_LABORATORY' and public.is_diagnostic_member('MEDICAL_LABORATORY',target.medical_laboratory_id)) or
    (target.radiology_center_id is not null and target.provider_type='RADIOLOGY_CENTER' and public.is_diagnostic_member('RADIOLOGY_CENTER',target.radiology_center_id))
  );
$$;

create or replace function public.protect_appointment_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare booking public.bookings;patient_user boolean;manager boolean;service_match boolean;doctor_match boolean;
begin
  if current_user in('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new;end if;
  select * into booking from public.bookings where id=new.booking_id;
  select exists(select 1 from public.journey_services s where s.booking_id=new.booking_id and s.status not in('CANCELLED','ARCHIVED') and ((new.provider_type='DOCTOR' and s.doctor_id=new.doctor_id) or (new.provider_type='HOSPITAL' and s.hospital_id=new.hospital_id) or (new.provider_type='MEDICAL_LABORATORY' and s.medical_laboratory_id=new.medical_laboratory_id) or (new.provider_type='RADIOLOGY_CENTER' and s.radiology_center_id=new.radiology_center_id))) into service_match;
  doctor_match:=new.doctor_id is null or (booking.case_id is not null and public.is_doctor_assigned_to_case(booking.case_id,new.doctor_id)) or exists(select 1 from public.journey_services s where s.booking_id=new.booking_id and s.doctor_id=new.doctor_id and s.status not in('CANCELLED','ARCHIVED'));
  if booking.id is null or new.patient_id<>booking.patient_id or not service_match or not doctor_match then raise exception 'appointment relationship does not match an assigned Journey service';end if;
  patient_user:=booking.patient_id=auth.uid();manager:=public.can_manage_assigned_appointment(new);
  if tg_op='INSERT' then
    if not manager or new.created_by<>auth.uid() or new.status<>'REQUESTED' then raise exception 'appointment creation is not permitted';end if;
  else
    if new.booking_id is distinct from old.booking_id or new.patient_id is distinct from old.patient_id or new.provider_type is distinct from old.provider_type or new.created_by is distinct from old.created_by or new.doctor_id is distinct from old.doctor_id or new.hospital_id is distinct from old.hospital_id or new.medical_laboratory_id is distinct from old.medical_laboratory_id or new.radiology_center_id is distinct from old.radiology_center_id then raise exception 'appointment relationship fields are immutable';end if;
    if patient_user then
      if new.status is distinct from old.status and not(old.status in('REQUESTED','CONFIRMED','RESCHEDULED') and new.status='CANCELLED') then raise exception 'patient appointment transition is not permitted';end if;
      if new.scheduled_at is distinct from old.scheduled_at or new.timezone is distinct from old.timezone or new.duration_minutes is distinct from old.duration_minutes or new.location_name is distinct from old.location_name or new.location_details is distinct from old.location_details or new.appointment_type is distinct from old.appointment_type or new.provider_notes is distinct from old.provider_notes or new.instructions is distinct from old.instructions then raise exception 'patient cannot edit provider appointment fields';end if;
    elsif manager then
      if new.patient_notes is distinct from old.patient_notes then raise exception 'provider cannot edit patient appointment notes';end if;
      if new.status is distinct from old.status and not((old.status='REQUESTED' and new.status in('CONFIRMED','RESCHEDULED','CANCELLED')) or (old.status in('CONFIRMED','RESCHEDULED') and new.status in('RESCHEDULED','COMPLETED','CANCELLED','NO_SHOW'))) then raise exception 'appointment transition is not permitted';end if;
    else raise exception 'appointment update is not permitted';end if;
  end if;
  return new;
end;$$;

drop policy if exists appointments_manager_insert on public.appointments;
create policy appointments_manager_insert on public.appointments for insert to authenticated with check(public.can_manage_assigned_appointment(appointments));
drop policy if exists appointments_scoped_update on public.appointments;
create policy appointments_scoped_update on public.appointments for update to authenticated using(patient_id=auth.uid() or public.can_manage_assigned_appointment(appointments)) with check(patient_id=auth.uid() or public.can_manage_assigned_appointment(appointments));
revoke all on function public.can_manage_assigned_appointment(public.appointments),public.protect_appointment_change() from public,anon,authenticated;
grant execute on function public.can_manage_assigned_appointment(public.appointments) to authenticated;
commit;
