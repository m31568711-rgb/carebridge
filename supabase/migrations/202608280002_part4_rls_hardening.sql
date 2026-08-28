begin;

-- Patients receive an offer only after it is sent. Drafts and withdrawn offers remain private to the authoring scope.
create or replace function public.is_offer_patient(target_offer public.offers)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_offer.status not in ('DRAFT', 'WITHDRAWN') and exists (
    select 1 from public.medical_cases c where c.id = target_offer.case_id and c.patient_id = auth.uid()
  );
$$;

revoke all on function public.is_offer_patient(public.offers) from public;
grant execute on function public.is_offer_patient(public.offers) to authenticated;

commit;
