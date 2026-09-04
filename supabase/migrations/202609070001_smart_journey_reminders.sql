begin;

create type public.reminder_type as enum (
  'PROCEDURE','DOCTOR_APPOINTMENT','LAB_APPOINTMENT','RADIOLOGY_APPOINTMENT','MEDICATION_DOSE'
);
create type public.reminder_status as enum ('PENDING','DELIVERED','CANCELLED');
create type public.reminder_channel as enum ('IN_APP','EMAIL','WHATSAPP','SMS','PUSH');
create type public.reminder_delivery_status as enum ('PENDING','DELIVERED','CANCELLED','FAILED');

alter table public.prescription_items
  add column start_date date,
  add column end_date date,
  add column dose_times time[] null,
  add column schedule_timezone text,
  add constraint prescription_item_schedule_check check (
    (start_date is null and end_date is null and dose_times is null and schedule_timezone is null) or
    (start_date is not null and end_date is not null and end_date >= start_date
      and end_date <= start_date + 366
      and cardinality(dose_times) between 1 and 6
      and schedule_timezone is not null and char_length(schedule_timezone) between 1 and 80)
  );

create table public.journey_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  reminder_type public.reminder_type not null,
  source_type text not null check (source_type in ('appointment','prescription_item')),
  source_id uuid not null,
  occurrence_at timestamptz not null,
  remind_at timestamptz not null,
  timezone text not null check (char_length(timezone) between 1 and 80),
  status public.reminder_status not null default 'PENDING',
  idempotency_key text not null unique check (char_length(idempotency_key) between 20 and 220),
  notification_id uuid unique references public.notifications(id) on delete set null,
  cancelled_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  check (remind_at < occurrence_at),
  check ((status='CANCELLED') = (cancelled_at is not null)),
  check ((status='DELIVERED') = (delivered_at is not null))
);
create index journey_reminders_due_idx on public.journey_reminders(remind_at,id) where status='PENDING';
create index journey_reminders_patient_idx on public.journey_reminders(patient_id,occurrence_at) where status='PENDING';
create index journey_reminders_source_idx on public.journey_reminders(source_type,source_id,status);

create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.journey_reminders(id) on delete cascade,
  channel public.reminder_channel not null,
  status public.reminder_delivery_status not null default 'PENDING',
  delivered_at timestamptz,
  failure_code text check (failure_code is null or char_length(failure_code)<=120),
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  unique(reminder_id,channel)
);

alter table public.journey_reminders enable row level security;
alter table public.reminder_deliveries enable row level security;
create policy journey_reminders_patient_read on public.journey_reminders for select to authenticated using(patient_id=auth.uid());
create policy reminder_deliveries_patient_read on public.reminder_deliveries for select to authenticated using(
  exists(select 1 from public.journey_reminders r where r.id=reminder_id and r.patient_id=auth.uid())
);
grant select on public.journey_reminders,public.reminder_deliveries to authenticated;

create function public.cancel_pending_reminders(target_source_type text,target_source_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  update public.journey_reminders set status='CANCELLED',cancelled_at=timezone('utc',now()),updated_at=timezone('utc',now())
  where source_type=target_source_type and source_id=target_source_id and status='PENDING';
  get diagnostics affected=row_count;
  update public.reminder_deliveries d set status='CANCELLED',updated_at=timezone('utc',now())
  where d.status='PENDING' and exists(
    select 1 from public.journey_reminders r where r.id=d.reminder_id
      and r.source_type=target_source_type and r.source_id=target_source_id and r.status='CANCELLED'
  );
  return affected;
end; $$;

create function public.sync_appointment_reminder()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind public.reminder_type; lead_time interval; reminder_time timestamptz; key text;
begin
  perform public.cancel_pending_reminders('appointment',new.id);
  if new.status not in ('CONFIRMED','RESCHEDULED') then return new; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=new.timezone) then
    raise exception 'invalid appointment timezone';
  end if;
  if new.appointment_type='TREATMENT_PROCEDURE' then kind:='PROCEDURE';lead_time:=interval '48 hours';
  elsif new.provider_type='MEDICAL_LABORATORY' then kind:='LAB_APPOINTMENT';lead_time:=interval '5 hours';
  elsif new.provider_type='RADIOLOGY_CENTER' then kind:='RADIOLOGY_APPOINTMENT';lead_time:=interval '5 hours';
  else kind:='DOCTOR_APPOINTMENT';lead_time:=interval '5 hours'; end if;
  reminder_time:=new.scheduled_at-lead_time;
  if new.scheduled_at<=timezone('utc',now()) or reminder_time<=timezone('utc',now()) then return new; end if;
  key:='appointment:'||new.id::text||':'||extract(epoch from new.scheduled_at)::bigint::text||':'||kind::text;
  insert into public.journey_reminders(booking_id,patient_id,reminder_type,source_type,source_id,occurrence_at,remind_at,timezone,idempotency_key)
  values(new.booking_id,new.patient_id,kind,'appointment',new.id,new.scheduled_at,reminder_time,new.timezone,key)
  on conflict(idempotency_key) do nothing;
  return new;
end; $$;
create trigger appointments_sync_reminder after insert or update of scheduled_at,timezone,status,appointment_type,provider_type
on public.appointments for each row execute function public.sync_appointment_reminder();

create function public.sync_prescription_medication_reminders(target_prescription uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare rx public.prescriptions; item public.prescription_items; dose_date date; dose_time time; occurrence timestamptz; due timestamptz; key text; added integer:=0;
begin
  select * into rx from public.prescriptions where id=target_prescription;
  for item in select i.* from public.prescription_items i where i.prescription_id=target_prescription loop
    perform public.cancel_pending_reminders('prescription_item',item.id);
  end loop;
  if rx.id is null or rx.status<>'ISSUED' then return 0; end if;
  for item in select i.* from public.prescription_items i where i.prescription_id=rx.id and i.start_date is not null loop
    if not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=item.schedule_timezone) then
      raise exception 'invalid medication timezone';
    end if;
    for dose_date in select d::date from generate_series(item.start_date::timestamp,item.end_date::timestamp,interval '1 day') d loop
      foreach dose_time in array item.dose_times loop
        occurrence:=(dose_date+dose_time) at time zone item.schedule_timezone;
        due:=occurrence-interval '15 minutes';
        if occurrence>timezone('utc',now()) and due>timezone('utc',now()) then
          key:='medication:'||item.id::text||':'||extract(epoch from occurrence)::bigint::text;
          insert into public.journey_reminders(booking_id,patient_id,reminder_type,source_type,source_id,occurrence_at,remind_at,timezone,idempotency_key)
          values(rx.booking_id,rx.patient_id,'MEDICATION_DOSE','prescription_item',item.id,occurrence,due,item.schedule_timezone,key)
          on conflict(idempotency_key) do nothing;
          if found then added:=added+1; end if;
        end if;
      end loop;
    end loop;
  end loop;
  return added;
end; $$;

create function public.prescription_sync_reminders()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.sync_prescription_medication_reminders(new.id);return new;end; $$;
create trigger prescriptions_sync_reminders after update of status on public.prescriptions
for each row execute function public.prescription_sync_reminders();

create function public.prescription_item_sync_reminders()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.sync_prescription_medication_reminders(case when tg_op='DELETE' then old.prescription_id else new.prescription_id end);
  return case when tg_op='DELETE' then old else new end;
end; $$;
create trigger prescription_items_sync_reminders after insert or update of start_date,end_date,dose_times,schedule_timezone or delete
on public.prescription_items for each row execute function public.prescription_item_sync_reminders();

create function public.deliver_due_reminders(target_now timestamptz default timezone('utc',now()))
returns integer language plpgsql security definer set search_path='' as $$
declare r public.journey_reminders; notification uuid; valid_source boolean; delivered integer:=0;
begin
  for r in
    select * from public.journey_reminders
    where status='PENDING' and remind_at<=target_now and occurrence_at>target_now
    order by remind_at for update skip locked limit 500
  loop
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
      case when r.source_type='appointment' then r.source_id else r.booking_id end)
    returning id into notification;
    update public.journey_reminders set status='DELIVERED',delivered_at=target_now,notification_id=notification,updated_at=target_now where id=r.id;
    insert into public.reminder_deliveries(reminder_id,channel,status,delivered_at) values(r.id,'IN_APP','DELIVERED',target_now);
    delivered:=delivered+1;
  end loop;
  return delivered;
end; $$;

revoke all on function public.cancel_pending_reminders(text,uuid),public.sync_prescription_medication_reminders(uuid),public.deliver_due_reminders(timestamptz) from public,anon,authenticated;
grant execute on function public.deliver_due_reminders(timestamptz) to service_role;

create extension if not exists pg_cron;
do $$ declare existing_job bigint; begin
  select jobid into existing_job from cron.job where jobname='carebridge-smart-reminders';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('carebridge-smart-reminders','* * * * *','select public.deliver_due_reminders();');
end $$;

commit;
