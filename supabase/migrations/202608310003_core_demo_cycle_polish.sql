begin;

alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text check (gender in ('FEMALE','MALE','OTHER','PREFER_NOT_TO_SAY'));
alter table public.profiles add column if not exists city_id uuid references public.cities(id) on delete set null;
alter table public.profiles add column if not exists address_text text check (address_text is null or char_length(address_text) <= 500);
alter table public.profiles add column if not exists location_details text check (location_details is null or char_length(location_details) <= 500);
alter table public.profiles add column if not exists google_place_id text check (google_place_id is null or char_length(google_place_id) <= 255);
alter table public.profiles add column if not exists latitude numeric(9,6) check (latitude between -90 and 90);
alter table public.profiles add column if not exists longitude numeric(9,6) check (longitude between -180 and 180);
alter table public.profiles drop constraint if exists profiles_location_pair_check;
alter table public.profiles add constraint profiles_location_pair_check check ((latitude is null) = (longitude is null));

alter table public.medical_cases add column if not exists chronic_conditions text check (chronic_conditions is null or char_length(chronic_conditions) <= 4000);
alter table public.medical_cases add column if not exists current_medications text check (current_medications is null or char_length(current_medications) <= 4000);
alter table public.medical_cases add column if not exists allergies text check (allergies is null or char_length(allergies) <= 4000);

revoke update on public.profiles from authenticated;
grant update (first_name,last_name,display_name,phone,country_id,city_id,date_of_birth,gender,address_text,location_details,google_place_id,latitude,longitude,preferred_language,avatar_path) on public.profiles to authenticated;

create or replace function public.validate_country_city_pair()
returns trigger language plpgsql set search_path='' as $$
declare selected_country uuid; selected_city uuid; row_data jsonb;
begin
  row_data:=to_jsonb(new);
  selected_country := case when tg_table_name='medical_cases' then nullif(row_data->>'preferred_country_id','')::uuid else nullif(row_data->>'country_id','')::uuid end;
  selected_city := case when tg_table_name='medical_cases' then nullif(row_data->>'preferred_city_id','')::uuid else nullif(row_data->>'city_id','')::uuid end;
  if selected_city is not null and (selected_country is null or not exists(select 1 from public.cities c where c.id=selected_city and c.country_id=selected_country and c.is_active)) then
    raise exception 'selected city does not belong to selected country';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_validate_city on public.profiles;
create trigger profiles_validate_city before insert or update of country_id,city_id on public.profiles for each row execute function public.validate_country_city_pair();
drop trigger if exists medical_cases_validate_city on public.medical_cases;
create trigger medical_cases_validate_city before insert or update of preferred_country_id,preferred_city_id on public.medical_cases for each row execute function public.validate_country_city_pair();

create or replace function public.protect_medical_case_fields()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('postgres','supabase_admin','service_role') or coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' or public.has_admin_privilege('cases.manage') then return new; end if;
  if tg_op='INSERT' then
    if new.patient_id<>auth.uid() or new.status<>'DRAFT' then raise exception 'patients may create only their own draft medical cases'; end if;
    return new;
  end if;
  if new.patient_id is distinct from old.patient_id then raise exception 'medical case ownership cannot be changed'; end if;
  if old.status<>'DRAFT' and (new.specialty_id is distinct from old.specialty_id or new.title is distinct from old.title or new.description is distinct from old.description or new.symptoms_notes is distinct from old.symptoms_notes or new.chronic_conditions is distinct from old.chronic_conditions or new.current_medications is distinct from old.current_medications or new.allergies is distinct from old.allergies) then raise exception 'submitted medical details cannot be changed by the patient'; end if;
  if not ((old.status='DRAFT' and new.status in ('DRAFT','SUBMITTED','CANCELLED')) or (old.status in ('SUBMITTED','UNDER_REVIEW') and new.status in (old.status,'CANCELLED')) or (old.status='RECOMMENDATION_AVAILABLE' and new.status in ('RECOMMENDATION_AVAILABLE','CLOSED','CANCELLED')) or (old.status in ('CLOSED','CANCELLED') and new.status=old.status)) then raise exception 'medical case status transition is not permitted'; end if;
  return new;
end; $$;

create or replace function public.notify_core_case_cycle()
returns trigger language plpgsql security definer set search_path='' as $$
declare patient uuid; recipient uuid; new_data jsonb:=to_jsonb(new); old_data jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end; target_case_id uuid;
begin
  target_case_id:=(new_data->>'case_id')::uuid;
  if tg_table_name='case_doctor_assignments' and (tg_op='INSERT' or new_data->>'status'='ACTIVE' and old_data->>'status' is distinct from new_data->>'status') then
    select d.user_id into recipient from public.doctors d where d.id=(new_data->>'doctor_id')::uuid;
    if recipient is not null then insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(recipient,'case.assigned','core.notifications.caseAssignedTitle','core.notifications.caseAssignedMessage','medical_case',target_case_id); end if;
  elsif tg_table_name='case_provider_assignments' and new_data->>'provider_type'='HOSPITAL' and (tg_op='INSERT' or new_data->>'status'='ACTIVE' and old_data->>'status' is distinct from new_data->>'status') then
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
      select hm.user_id,'case.provider_assigned','core.notifications.providerAssignedTitle','core.notifications.providerAssignedMessage','provider_case',target_case_id from public.hospital_memberships hm where hm.hospital_id=(new_data->>'hospital_id')::uuid and hm.is_active;
  elsif tg_table_name='treatment_recommendations' and new_data->>'status'='SUBMITTED' and (tg_op='INSERT' or old_data->>'status' is distinct from new_data->>'status' or old_data->>'updated_at' is distinct from new_data->>'updated_at') then
    select c.patient_id into patient from public.medical_cases c where c.id=target_case_id;
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(patient,'recommendation.available','core.notifications.recommendationTitle','core.notifications.recommendationMessage','medical_case',target_case_id);
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
      select hm.user_id,'case.ready_for_offer','core.notifications.offerReadyTitle','core.notifications.offerReadyMessage','provider_case',target_case_id from public.case_provider_assignments cpa join public.hospital_memberships hm on hm.hospital_id=cpa.hospital_id and hm.is_active where cpa.case_id=target_case_id and cpa.status='ACTIVE' and cpa.provider_type='HOSPITAL';
  end if;
  return new;
end; $$;

drop trigger if exists core_doctor_assignment_notify on public.case_doctor_assignments;
create trigger core_doctor_assignment_notify after insert or update on public.case_doctor_assignments for each row execute function public.notify_core_case_cycle();
drop trigger if exists core_provider_assignment_notify on public.case_provider_assignments;
create trigger core_provider_assignment_notify after insert or update on public.case_provider_assignments for each row execute function public.notify_core_case_cycle();
drop trigger if exists core_recommendation_notify on public.treatment_recommendations;
create trigger core_recommendation_notify after insert or update on public.treatment_recommendations for each row execute function public.notify_core_case_cycle();

drop policy if exists treatment_recommendations_assigned_provider_read on public.treatment_recommendations;
create policy treatment_recommendations_assigned_provider_read on public.treatment_recommendations for select to authenticated using (
  status='SUBMITTED' and exists (
    select 1 from public.case_provider_assignments a where a.case_id=treatment_recommendations.case_id and a.status='ACTIVE'
      and public.is_case_provider(a.case_id,a.provider_type,a.hospital_id,a.pharmacy_id,a.radiology_center_id,a.medical_laboratory_id)
  )
);

commit;
