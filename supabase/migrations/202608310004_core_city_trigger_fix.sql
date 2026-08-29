begin;
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
commit;
