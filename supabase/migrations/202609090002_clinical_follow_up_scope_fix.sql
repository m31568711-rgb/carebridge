begin;

-- The clinical scope trigger must be able to load its booking after related
-- clinical events have changed visibility. It still validates auth.uid()
-- through can_manage_clinical_booking and enforces every immutable link.
alter function public.protect_doctor_clinical_row() security definer;
alter function public.protect_doctor_clinical_row() set search_path = '';
revoke all on function public.protect_doctor_clinical_row() from public, anon, authenticated;

commit;
