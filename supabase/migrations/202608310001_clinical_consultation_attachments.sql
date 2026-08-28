begin;

create table public.clinical_attachments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  case_id uuid not null references public.medical_cases(id) on delete cascade,
  encounter_id uuid references public.clinical_encounters(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 180),
  patient_visible boolean not null default false,
  object_path text not null unique check (object_path !~ '(^|/)\.\.(/|$)'),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 15728640),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc',now())
);

create index clinical_attachments_booking_idx on public.clinical_attachments(booking_id,created_at desc);
create index clinical_attachments_patient_idx on public.clinical_attachments(patient_id,created_at desc) where patient_visible;
alter table public.clinical_attachments enable row level security;

create policy clinical_attachments_read on public.clinical_attachments for select to authenticated
using (public.can_manage_clinical_booking(booking_id) or (patient_id=auth.uid() and patient_visible));
create policy clinical_attachments_doctor_insert on public.clinical_attachments for insert to authenticated
with check (public.can_manage_clinical_booking(booking_id) and uploaded_by=auth.uid());
create policy clinical_attachments_doctor_delete on public.clinical_attachments for delete to authenticated
using (public.can_manage_clinical_booking(booking_id));

create function public.protect_clinical_attachment() returns trigger language plpgsql set search_path='' as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id=new.booking_id;
  if b.id is null or new.patient_id<>b.patient_id or new.case_id<>b.case_id or new.doctor_id is distinct from b.doctor_id or not public.can_manage_clinical_booking(b.id) then raise exception 'clinical attachment scope mismatch'; end if;
  if new.encounter_id is not null and not exists(select 1 from public.clinical_encounters e where e.id=new.encounter_id and e.booking_id=b.id) then raise exception 'encounter scope mismatch'; end if;
  if new.appointment_id is not null and not exists(select 1 from public.appointments a where a.id=new.appointment_id and a.booking_id=b.id) then raise exception 'appointment scope mismatch'; end if;
  return new;
end$$;

create function public.can_access_clinical_attachment_object(object_name text,write_access boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare p text[]; patient uuid; booking uuid;
begin
  p:=storage.foldername(object_name); if array_length(p,1)<3 then return false; end if;
  begin patient:=p[1]::uuid;booking:=p[2]::uuid;exception when invalid_text_representation then return false;end;
  if write_access then return exists(select 1 from public.bookings b where b.id=booking and b.patient_id=patient and public.can_manage_clinical_booking(b.id));end if;
  return exists(select 1 from public.clinical_attachments a where a.object_path=object_name and a.booking_id=booking and a.patient_id=patient and (public.can_manage_clinical_booking(a.booking_id) or (a.patient_id=auth.uid() and a.patient_visible)));
end$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clinical-attachments','clinical-attachments',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy clinical_attachments_storage_read on storage.objects for select to authenticated using(bucket_id='clinical-attachments' and public.can_access_clinical_attachment_object(name,false));
create policy clinical_attachments_storage_insert on storage.objects for insert to authenticated with check(bucket_id='clinical-attachments' and public.can_access_clinical_attachment_object(name,true));
create policy clinical_attachments_storage_delete on storage.objects for delete to authenticated using(bucket_id='clinical-attachments' and public.can_access_clinical_attachment_object(name,true));

create trigger clinical_attachments_protect before insert on public.clinical_attachments for each row execute function public.protect_clinical_attachment();
create trigger clinical_attachments_audit after insert or delete on public.clinical_attachments for each row execute function public.audit_admin_change();

revoke all on function public.can_access_clinical_attachment_object(text,boolean) from public;
grant execute on function public.can_access_clinical_attachment_object(text,boolean) to authenticated;
grant select,insert,delete on public.clinical_attachments to authenticated;

commit;
