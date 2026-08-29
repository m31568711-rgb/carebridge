begin;
create or replace function public.notify_core_case_cycle()
returns trigger language plpgsql security definer set search_path='' as $$
declare patient uuid; recipient uuid; new_data jsonb:=to_jsonb(new); old_data jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end; target_case_id uuid;
begin
  target_case_id:=(new_data->>'case_id')::uuid;
  if tg_table_name='case_doctor_assignments' and (tg_op='INSERT' or new_data->>'status'='ACTIVE' and old_data->>'status' is distinct from new_data->>'status') then
    select d.user_id into recipient from public.doctors d where d.id=(new_data->>'doctor_id')::uuid;
    if recipient is not null then insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(recipient,'case.assigned','core.notifications.caseAssignedTitle','core.notifications.caseAssignedMessage','medical_case',target_case_id); end if;
  elsif tg_table_name='case_provider_assignments' and new_data->>'provider_type'='HOSPITAL' and (tg_op='INSERT' or new_data->>'status'='ACTIVE' and old_data->>'status' is distinct from new_data->>'status') then
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) select hm.user_id,'case.provider_assigned','core.notifications.providerAssignedTitle','core.notifications.providerAssignedMessage','provider_case',target_case_id from public.hospital_memberships hm where hm.hospital_id=(new_data->>'hospital_id')::uuid and hm.is_active;
  elsif tg_table_name='treatment_recommendations' and new_data->>'status'='SUBMITTED' and (tg_op='INSERT' or old_data->>'status' is distinct from new_data->>'status' or old_data->>'updated_at' is distinct from new_data->>'updated_at') then
    select c.patient_id into patient from public.medical_cases c where c.id=target_case_id;
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) values(patient,'recommendation.available','core.notifications.recommendationTitle','core.notifications.recommendationMessage','medical_case',target_case_id);
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id) select hm.user_id,'case.ready_for_offer','core.notifications.offerReadyTitle','core.notifications.offerReadyMessage','provider_case',target_case_id from public.case_provider_assignments cpa join public.hospital_memberships hm on hm.hospital_id=cpa.hospital_id and hm.is_active where cpa.case_id=target_case_id and cpa.status='ACTIVE' and cpa.provider_type='HOSPITAL';
  end if;
  return new;
end; $$;
commit;
