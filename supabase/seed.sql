insert into public.countries (id, iso2, iso3, name_i18n, phone_code)
values
  ('10000000-0000-0000-0000-000000000001', 'EG', 'EGY', '{"en":"Egypt","fr":"Égypte","ar":"مصر"}', '+20'),
  ('10000000-0000-0000-0000-000000000002', 'FR', 'FRA', '{"en":"France","fr":"France","ar":"فرنسا"}', '+33'),
  ('10000000-0000-0000-0000-000000000003', 'TR', 'TUR', '{"en":"Türkiye","fr":"Turquie","ar":"تركيا"}', '+90')
on conflict (iso2) do update set name_i18n = excluded.name_i18n, phone_code = excluded.phone_code;

insert into public.cities (id, country_id, name_i18n)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"en":"Cairo","fr":"Le Caire","ar":"القاهرة"}'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '{"en":"Paris","fr":"Paris","ar":"باريس"}'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '{"en":"Istanbul","fr":"Istanbul","ar":"إسطنبول"}')
on conflict (id) do update set name_i18n = excluded.name_i18n;

insert into public.specialties (id, code, name_i18n)
values
  ('30000000-0000-0000-0000-000000000001', 'cardiology', '{"en":"Cardiology","fr":"Cardiologie","ar":"أمراض القلب"}'),
  ('30000000-0000-0000-0000-000000000002', 'orthopedics', '{"en":"Orthopedics","fr":"Orthopédie","ar":"جراحة العظام"}'),
  ('30000000-0000-0000-0000-000000000003', 'oncology', '{"en":"Oncology","fr":"Oncologie","ar":"الأورام"}'),
  ('30000000-0000-0000-0000-000000000004', 'dentistry', '{"en":"Dental care","fr":"Soins dentaires","ar":"طب الأسنان"}'),
  ('30000000-0000-0000-0000-000000000005', 'fertility', '{"en":"Fertility care","fr":"Fertilité","ar":"علاج الخصوبة"}'),
  ('30000000-0000-0000-0000-000000000006', 'ophthalmology', '{"en":"Ophthalmology","fr":"Ophtalmologie","ar":"طب العيون"}')
on conflict (code) do update set name_i18n = excluded.name_i18n;

insert into public.treatments (id, specialty_id, code, name_i18n)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'cardiology_consultation', '{"en":"Cardiology consultation","fr":"Consultation de cardiologie","ar":"استشارة أمراض القلب"}'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'orthopedic_assessment', '{"en":"Orthopedic assessment","fr":"Évaluation orthopédique","ar":"تقييم العظام"}'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', 'dental_assessment', '{"en":"Dental assessment","fr":"Évaluation dentaire","ar":"تقييم الأسنان"}')
on conflict (code) do update set name_i18n = excluded.name_i18n;

insert into public.app_settings (key, value, description_key, is_public)
values ('platform.supported_languages', '["en","fr","ar"]', 'settings.supportedLanguages', true)
on conflict (key) do update set value = excluded.value, is_public = excluded.is_public;
