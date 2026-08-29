begin;
drop policy if exists treatment_recommendations_assigned_provider_read on public.treatment_recommendations;
create policy treatment_recommendations_assigned_provider_read on public.treatment_recommendations for select to authenticated using (
  status='SUBMITTED' and exists (
    select 1 from public.case_provider_assignments a where a.case_id=treatment_recommendations.case_id and a.status='ACTIVE'
      and public.is_case_provider(a.case_id,a.provider_type,a.hospital_id,a.pharmacy_id,a.radiology_center_id,a.medical_laboratory_id)
  )
);
commit;
