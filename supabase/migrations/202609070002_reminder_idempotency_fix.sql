begin;

create or replace function public.sync_appointment_reminder()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind public.reminder_type; lead_time interval; reminder_time timestamptz; key text;
begin
  perform public.cancel_pending_reminders('appointment',new.id);
  if new.status not in ('CONFIRMED','RESCHEDULED') then return new; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=new.timezone) then raise exception 'invalid appointment timezone'; end if;
  if new.appointment_type='TREATMENT_PROCEDURE' then kind:='PROCEDURE';lead_time:=interval '48 hours';
  elsif new.provider_type='MEDICAL_LABORATORY' then kind:='LAB_APPOINTMENT';lead_time:=interval '5 hours';
  elsif new.provider_type='RADIOLOGY_CENTER' then kind:='RADIOLOGY_APPOINTMENT';lead_time:=interval '5 hours';
  else kind:='DOCTOR_APPOINTMENT';lead_time:=interval '5 hours'; end if;
  reminder_time:=new.scheduled_at-lead_time;
  if new.scheduled_at<=timezone('utc',now()) or reminder_time<=timezone('utc',now()) then return new; end if;
  key:='appointment:'||new.id::text||':'||extract(epoch from new.scheduled_at)::bigint::text||':'||kind::text;
  insert into public.journey_reminders(booking_id,patient_id,reminder_type,source_type,source_id,occurrence_at,remind_at,timezone,idempotency_key)
  values(new.booking_id,new.patient_id,kind,'appointment',new.id,new.scheduled_at,reminder_time,new.timezone,key)
  on conflict(idempotency_key) do update set status='PENDING',cancelled_at=null,occurrence_at=excluded.occurrence_at,
    remind_at=excluded.remind_at,timezone=excluded.timezone,updated_at=timezone('utc',now())
  where public.journey_reminders.status='CANCELLED';
  return new;
end; $$;

create or replace function public.sync_prescription_medication_reminders(target_prescription uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare rx public.prescriptions; item public.prescription_items; dose_date date; dose_time time; occurrence timestamptz; due timestamptz; key text; added integer:=0;
begin
  select * into rx from public.prescriptions where id=target_prescription;
  for item in select i.* from public.prescription_items i where i.prescription_id=target_prescription loop
    perform public.cancel_pending_reminders('prescription_item',item.id);
  end loop;
  if rx.id is null or rx.status<>'ISSUED' then return 0; end if;
  for item in select i.* from public.prescription_items i where i.prescription_id=rx.id and i.start_date is not null loop
    if not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=item.schedule_timezone) then raise exception 'invalid medication timezone'; end if;
    for dose_date in select d::date from generate_series(item.start_date::timestamp,item.end_date::timestamp,interval '1 day') d loop
      foreach dose_time in array item.dose_times loop
        occurrence:=(dose_date+dose_time) at time zone item.schedule_timezone;
        due:=occurrence-interval '15 minutes';
        if occurrence>timezone('utc',now()) and due>timezone('utc',now()) then
          key:='medication:'||item.id::text||':'||extract(epoch from occurrence)::bigint::text;
          insert into public.journey_reminders(booking_id,patient_id,reminder_type,source_type,source_id,occurrence_at,remind_at,timezone,idempotency_key)
          values(rx.booking_id,rx.patient_id,'MEDICATION_DOSE','prescription_item',item.id,occurrence,due,item.schedule_timezone,key)
          on conflict(idempotency_key) do update set status='PENDING',cancelled_at=null,occurrence_at=excluded.occurrence_at,
            remind_at=excluded.remind_at,timezone=excluded.timezone,updated_at=timezone('utc',now())
          where public.journey_reminders.status='CANCELLED';
          if found then added:=added+1; end if;
        end if;
      end loop;
    end loop;
  end loop;
  return added;
end; $$;

create or replace function public.deliver_due_reminders(target_now timestamptz default timezone('utc',now()))
returns integer language plpgsql security definer set search_path='' as $$
declare r public.journey_reminders; notification uuid; valid_source boolean; delivered integer:=0;
begin
  update public.journey_reminders set status='CANCELLED',cancelled_at=target_now,updated_at=target_now
  where status='PENDING' and occurrence_at<=target_now;
  for r in select * from public.journey_reminders where status='PENDING' and remind_at<=target_now and occurrence_at>target_now order by remind_at for update skip locked limit 500 loop
    if r.source_type='appointment' then
      select exists(select 1 from public.appointments a where a.id=r.source_id and a.status in('CONFIRMED','RESCHEDULED') and a.scheduled_at=r.occurrence_at) into valid_source;
    else
      select exists(select 1 from public.prescription_items i join public.prescriptions p on p.id=i.prescription_id where i.id=r.source_id and p.status='ISSUED') into valid_source;
    end if;
    if not valid_source then
      update public.journey_reminders set status='CANCELLED',cancelled_at=target_now,updated_at=target_now where id=r.id;
      continue;
    end if;
    insert into public.notifications(recipient_id,type,title_key,message_key,data,related_entity_type,related_entity_id)
    values(r.patient_id,'reminder.'||lower(r.reminder_type::text),'reminders.notifications.'||lower(r.reminder_type::text)||'Title',
      'reminders.notifications.'||lower(r.reminder_type::text)||'Message',
      jsonb_build_object('reminder_id',r.id,'reminder_type',r.reminder_type,'scheduled_for',r.occurrence_at,'timezone',r.timezone,'booking_id',r.booking_id,'source_type',r.source_type,'source_id',r.source_id),
      case when r.source_type='appointment' then 'appointment' else 'booking' end,
      case when r.source_type='appointment' then r.source_id else r.booking_id end) returning id into notification;
    update public.journey_reminders set status='DELIVERED',delivered_at=target_now,notification_id=notification,updated_at=target_now where id=r.id;
    insert into public.reminder_deliveries(reminder_id,channel,status,delivered_at) values(r.id,'IN_APP','DELIVERED',target_now);
    delivered:=delivered+1;
  end loop;
  return delivered;
end; $$;

revoke all on function public.sync_prescription_medication_reminders(uuid),public.deliver_due_reminders(timestamptz) from public,anon,authenticated;
grant execute on function public.deliver_due_reminders(timestamptz) to service_role;

commit;
