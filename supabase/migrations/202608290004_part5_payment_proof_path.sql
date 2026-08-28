begin;

create or replace function public.can_access_payment_proof(object_name text, write_access boolean default false)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]; path_patient uuid; path_booking uuid; path_payment uuid;
begin
  parts:=storage.foldername(object_name); if array_length(parts,1)<3 then return false; end if;
  begin path_patient:=parts[1]::uuid;path_booking:=parts[2]::uuid;path_payment:=parts[3]::uuid;exception when invalid_text_representation then return false;end;
  if not exists(select 1 from public.payment_records where id=path_payment and booking_id=path_booking and patient_id=path_patient) then return false; end if;
  if write_access then return public.can_manage_booking_finance(path_booking); end if;
  return path_patient=auth.uid() or public.can_manage_booking_finance(path_booking);
end; $$;

commit;
