begin;

create or replace function public.record_part5_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare new_data jsonb:=to_jsonb(new); old_data jsonb; booking uuid; event_name text; status_value text;
begin
  if tg_op='UPDATE' then old_data:=to_jsonb(old); else old_data:='{}'::jsonb; end if;
  booking:=(new_data->>'booking_id')::uuid;status_value:=new_data->>'status';
  if tg_table_name='appointments' and (tg_op='INSERT' or status_value is distinct from old_data->>'status') then event_name:='appointment.'||lower(status_value);
  elsif tg_table_name='invoices' and (tg_op='INSERT' or status_value is distinct from old_data->>'status') then event_name:='invoice.'||lower(status_value);
  elsif tg_table_name='payment_records' then event_name:='payment.recorded';status_value:='RECORDED';
  elsif tg_table_name='travel_plans' then event_name:='travel.updated';status_value:=new_data->>'accommodation_mode';
  elsif tg_table_name='transport_arrangements' and (tg_op='INSERT' or status_value is distinct from old_data->>'status') then event_name:='transport.'||lower(status_value);
  else return new; end if;
  insert into public.journey_events(booking_id,event_type,related_entity_type,related_entity_id,status_label,created_by)
  values(booking,event_name,tg_table_name,(new_data->>'id')::uuid,status_value,auth.uid());
  return new;
end; $$;

create or replace function public.notify_part5_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare new_data jsonb:=to_jsonb(new); old_data jsonb; patient uuid; booking uuid; event_key text; entity_name text; entity_id uuid; status_value text;
begin
  if tg_op='UPDATE' then old_data:=to_jsonb(old); else old_data:='{}'::jsonb; end if;
  patient:=(new_data->>'patient_id')::uuid;booking:=(new_data->>'booking_id')::uuid;status_value:=new_data->>'status';
  entity_name:=case when tg_table_name='appointments' then 'appointment' else 'booking' end;
  entity_id:=case when tg_table_name='appointments' then (new_data->>'id')::uuid else booking end;
  if tg_table_name='appointments' and (tg_op='INSERT' or status_value is distinct from old_data->>'status') then event_key:='appointment.'||lower(status_value);
  elsif tg_table_name='invoices' and status_value='ISSUED' and status_value is distinct from old_data->>'status' then event_key:='invoice.issued';
  elsif tg_table_name='payment_records' then event_key:='payment.recorded';
  elsif tg_table_name='travel_plans' then event_key:='travel.updated';
  elsif tg_table_name='transport_arrangements' and (tg_op='INSERT' or status_value is distinct from old_data->>'status') then event_key:='transport.'||lower(status_value);
  else return new; end if;
  insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
  values(patient,event_key,'part5.notifications.'||replace(event_key,'.','')||'Title','part5.notifications.'||replace(event_key,'.','')||'Message',entity_name,entity_id);
  return new;
end; $$;

commit;
