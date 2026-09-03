begin;

create or replace function public.reserve_accommodation(
  target_booking_id uuid,
  target_room_option_id uuid,
  target_arrangement public.accommodation_arrangement,
  target_check_in date,
  target_check_out date,
  target_rooms integer,
  target_guests integer,
  target_final_price numeric default null,
  target_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  target_booking public.bookings;
  room_option public.accommodation_room_options;
  reserved_rooms integer;
  reservation_id uuid;
  is_admin boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into target_booking from public.bookings where id=target_booking_id;
  is_admin := public.is_platform_admin();
  if target_booking.id is null or target_booking.journey_type <> 'INTERNATIONAL_MEDICAL_TRAVEL' then raise exception 'international booking required'; end if;
  if not is_admin and target_booking.patient_id <> auth.uid() then raise exception 'accommodation access denied'; end if;
  if target_arrangement not in ('PATIENT_SELECTED','CAREBRIDGE_ARRANGED') then raise exception 'invalid accommodation arrangement'; end if;
  if not is_admin and target_arrangement <> 'PATIENT_SELECTED' then raise exception 'patient arrangement denied'; end if;
  if target_check_out <= target_check_in or target_rooms not between 1 and 100 or target_guests not between 1 and 500 then raise exception 'invalid stay'; end if;
  if exists(select 1 from public.accommodation_bookings where booking_id=target_booking_id and status in ('HELD','CONFIRMED','CHECKED_IN')) then raise exception 'accommodation already arranged'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_room_option_id::text, 0));
  select aro.* into room_option from public.accommodation_room_options aro join public.accommodation_properties ap on ap.id=aro.property_id where aro.id=target_room_option_id and aro.is_active and ap.is_active;
  if room_option.id is null then raise exception 'accommodation option unavailable'; end if;
  select coalesce(sum(number_of_rooms),0)::integer into reserved_rooms from public.accommodation_bookings
    where room_option_id=target_room_option_id and status in ('HELD','CONFIRMED','CHECKED_IN')
      and check_in_date < target_check_out and check_out_date > target_check_in;
  if reserved_rooms + target_rooms > room_option.available_rooms then raise exception 'insufficient room availability'; end if;
  insert into public.accommodation_bookings(booking_id,patient_id,room_option_id,arrangement,check_in_date,check_out_date,number_of_rooms,guests,price_per_night,currency,final_price,status,notes,created_by)
  values(target_booking_id,target_booking.patient_id,target_room_option_id,target_arrangement,target_check_in,target_check_out,target_rooms,target_guests,room_option.price_per_night,room_option.currency,case when is_admin then target_final_price else null end,case when is_admin then 'CONFIRMED'::public.accommodation_booking_status else 'HELD'::public.accommodation_booking_status end,target_notes,auth.uid()) returning id into reservation_id;
  insert into public.journey_accommodation_preferences(booking_id,patient_id,arrangement,notes,updated_by)
    values(target_booking_id,target_booking.patient_id,target_arrangement,target_notes,auth.uid())
    on conflict(booking_id) do update set arrangement=excluded.arrangement,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=timezone('utc',now());
  return reservation_id;
end; $$;

create or replace function public.protect_accommodation_reservation() returns trigger language plpgsql set search_path='' as $$
declare target_booking public.bookings; room_capacity integer; reserved_rooms integer;
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' then return new; end if;
  select * into target_booking from public.bookings where id=new.booking_id;
  if target_booking.id is null or target_booking.journey_type<>'INTERNATIONAL_MEDICAL_TRAVEL' or new.patient_id<>target_booking.patient_id then raise exception 'invalid accommodation journey'; end if;
  if tg_op='UPDATE' then
    if new.booking_id is distinct from old.booking_id or new.patient_id is distinct from old.patient_id or new.room_option_id is distinct from old.room_option_id or new.created_by is distinct from old.created_by then raise exception 'accommodation relationships are immutable'; end if;
    if not public.is_platform_admin() then
      if old.patient_id<>auth.uid() or new.status<>'CANCELLED' or old.status not in ('HELD','CONFIRMED') or (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'accommodation update denied'; end if;
    end if;
  elsif not public.is_platform_admin() then raise exception 'use secure accommodation reservation'; end if;
  if new.status in ('HELD','CONFIRMED','CHECKED_IN') then
    perform pg_advisory_xact_lock(hashtextextended(new.room_option_id::text,0));
    select available_rooms into room_capacity from public.accommodation_room_options where id=new.room_option_id and is_active;
    select coalesce(sum(number_of_rooms),0)::integer into reserved_rooms from public.accommodation_bookings where room_option_id=new.room_option_id and id<>new.id and status in ('HELD','CONFIRMED','CHECKED_IN') and check_in_date<new.check_out_date and check_out_date>new.check_in_date;
    if room_capacity is null or reserved_rooms+new.number_of_rooms>room_capacity then raise exception 'insufficient room availability'; end if;
  end if;
  return new;
end; $$;

commit;
