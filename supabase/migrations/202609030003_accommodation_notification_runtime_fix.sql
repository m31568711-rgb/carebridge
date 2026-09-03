begin;

create or replace function public.notify_accommodation_change() returns trigger language plpgsql security definer set search_path='' as $$
declare target_booking uuid; target_patient uuid; event_key text; row_data jsonb;
begin
  row_data:=to_jsonb(new);
  target_booking:=(row_data->>'booking_id')::uuid;
  target_patient:=(row_data->>'patient_id')::uuid;
  event_key:=case when tg_table_name='accommodation_bookings' then 'accommodation.'||lower(row_data->>'status') else 'accommodation.preference' end;
  if auth.uid()=target_patient then
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
      select ur.user_id,event_key,'travel.notifications.adminRequestTitle','travel.notifications.adminRequestMessage','booking',target_booking from public.user_roles ur where ur.role in ('ADMIN','SUPER_ADMIN');
  else
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
      values(target_patient,event_key,'travel.notifications.accommodationTitle','travel.notifications.accommodationMessage','booking',target_booking);
  end if;
  return new;
end; $$;

commit;
