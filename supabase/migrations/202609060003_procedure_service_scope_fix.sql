begin;
alter table public.journey_services drop constraint journey_services_check;
alter table public.journey_services drop constraint journey_services_check1;
alter table public.journey_services add constraint journey_services_provider_match_check check(
  selection_state in('PATIENT_TO_CHOOSE','NOT_REQUIRED') or
  (service_type='DOCTOR_CONSULTATION' and doctor_id is not null) or
  (service_type='HOSPITAL_PROCEDURE' and hospital_id is not null) or
  (service_type='LABORATORY' and medical_laboratory_id is not null) or
  (service_type='RADIOLOGY' and radiology_center_id is not null)
);
alter table public.journey_services add constraint journey_services_facility_scope_check check(
  num_nonnulls(hospital_id,medical_laboratory_id,radiology_center_id)<=1
);
commit;
