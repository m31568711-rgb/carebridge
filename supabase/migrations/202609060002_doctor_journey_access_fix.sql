begin;
create or replace function public.can_manage_booking(target_booking public.bookings)
returns boolean language sql stable security definer set search_path='' as $$
  select public.has_admin_privilege('bookings.manage')
    or public.is_booking_doctor(target_booking.id)
    or (target_booking.case_id is not null and target_booking.provider_type is not null and public.is_case_provider(
      target_booking.case_id,target_booking.provider_type,target_booking.hospital_id,target_booking.pharmacy_id,
      target_booking.radiology_center_id,target_booking.medical_laboratory_id
    ));
$$;
commit;
