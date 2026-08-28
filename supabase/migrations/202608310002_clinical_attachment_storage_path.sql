begin;

create or replace function public.can_access_clinical_attachment_object(object_name text,write_access boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare p text[]; patient uuid; booking uuid;
begin
  p:=storage.foldername(object_name); if array_length(p,1)<>2 then return false; end if;
  begin patient:=p[1]::uuid;booking:=p[2]::uuid;exception when invalid_text_representation then return false;end;
  if write_access then return exists(select 1 from public.bookings b where b.id=booking and b.patient_id=patient and public.can_manage_clinical_booking(b.id));end if;
  return exists(select 1 from public.clinical_attachments a where a.object_path=object_name and a.booking_id=booking and a.patient_id=patient and (public.can_manage_clinical_booking(a.booking_id) or (a.patient_id=auth.uid() and a.patient_visible)));
end$$;

revoke all on function public.can_access_clinical_attachment_object(text,boolean) from public;
grant execute on function public.can_access_clinical_attachment_object(text,boolean) to authenticated;

commit;
