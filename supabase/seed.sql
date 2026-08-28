-- CareBridge demonstration data. Every provider and clinician below is fictional.
-- Deterministic UUIDs make this seed safe to rerun on temporary or final Supabase projects.

insert into public.countries (id,iso2,iso3,name_i18n,phone_code,currency_code,is_active) values
('10000000-0000-0000-0000-000000000001','EG','EGY','{"en":"Egypt","fr":"Égypte","ar":"مصر"}','+20','EGP',true),
('10000000-0000-0000-0000-000000000002','CM','CMR','{"en":"Cameroon","fr":"Cameroun","ar":"الكاميرون"}','+237','XAF',true),
('10000000-0000-0000-0000-000000000003','SN','SEN','{"en":"Senegal","fr":"Sénégal","ar":"السنغال"}','+221','XOF',true),
('10000000-0000-0000-0000-000000000004','CI','CIV','{"en":"Côte d’Ivoire","fr":"Côte d’Ivoire","ar":"ساحل العاج"}','+225','XOF',true),
('10000000-0000-0000-0000-000000000005','NG','NGA','{"en":"Nigeria","fr":"Nigéria","ar":"نيجيريا"}','+234','NGN',true),
('10000000-0000-0000-0000-000000000006','GH','GHA','{"en":"Ghana","fr":"Ghana","ar":"غانا"}','+233','GHS',true),
('10000000-0000-0000-0000-000000000007','MA','MAR','{"en":"Morocco","fr":"Maroc","ar":"المغرب"}','+212','MAD',true),
('10000000-0000-0000-0000-000000000008','FR','FRA','{"en":"France","fr":"France","ar":"فرنسا"}','+33','EUR',true),
('10000000-0000-0000-0000-000000000009','KE','KEN','{"en":"Kenya","fr":"Kenya","ar":"كينيا"}','+254','KES',true),
('10000000-0000-0000-0000-000000000010','RW','RWA','{"en":"Rwanda","fr":"Rwanda","ar":"رواندا"}','+250','RWF',true)
on conflict (id) do update set name_i18n=excluded.name_i18n,phone_code=excluded.phone_code,currency_code=excluded.currency_code,is_active=excluded.is_active;

insert into public.cities (id,country_id,name_i18n,is_active) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','{"en":"Cairo","fr":"Le Caire","ar":"القاهرة"}',true),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','{"en":"Alexandria","fr":"Alexandrie","ar":"الإسكندرية"}',true),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','{"en":"Giza","fr":"Gizeh","ar":"الجيزة"}',true),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','{"en":"Douala","fr":"Douala","ar":"دوالا"}',true),
('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','{"en":"Yaoundé","fr":"Yaoundé","ar":"ياوندي"}',true),
('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000003','{"en":"Dakar","fr":"Dakar","ar":"داكار"}',true),
('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000003','{"en":"Thiès","fr":"Thiès","ar":"تييس"}',true),
('20000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000004','{"en":"Abidjan","fr":"Abidjan","ar":"أبيدجان"}',true),
('20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000004','{"en":"Yamoussoukro","fr":"Yamoussoukro","ar":"ياموسوكرو"}',true),
('20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000005','{"en":"Lagos","fr":"Lagos","ar":"لاغوس"}',true),
('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000005','{"en":"Abuja","fr":"Abuja","ar":"أبوجا"}',true),
('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000005','{"en":"Port Harcourt","fr":"Port Harcourt","ar":"بورت هاركورت"}',true),
('20000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000006','{"en":"Accra","fr":"Accra","ar":"أكرا"}',true),
('20000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000006','{"en":"Kumasi","fr":"Kumasi","ar":"كوماسي"}',true),
('20000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000007','{"en":"Casablanca","fr":"Casablanca","ar":"الدار البيضاء"}',true),
('20000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-000000000007','{"en":"Rabat","fr":"Rabat","ar":"الرباط"}',true),
('20000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000007','{"en":"Marrakesh","fr":"Marrakech","ar":"مراكش"}',true),
('20000000-0000-0000-0000-000000000018','10000000-0000-0000-0000-000000000008','{"en":"Paris","fr":"Paris","ar":"باريس"}',true),
('20000000-0000-0000-0000-000000000019','10000000-0000-0000-0000-000000000008','{"en":"Lyon","fr":"Lyon","ar":"ليون"}',true),
('20000000-0000-0000-0000-000000000020','10000000-0000-0000-0000-000000000008','{"en":"Marseille","fr":"Marseille","ar":"مرسيليا"}',true),
('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000009','{"en":"Nairobi","fr":"Nairobi","ar":"نيروبي"}',true),
('20000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000009','{"en":"Mombasa","fr":"Mombasa","ar":"مومباسا"}',true),
('20000000-0000-0000-0000-000000000023','10000000-0000-0000-0000-000000000010','{"en":"Kigali","fr":"Kigali","ar":"كيغالي"}',true),
('20000000-0000-0000-0000-000000000024','10000000-0000-0000-0000-000000000010','{"en":"Musanze","fr":"Musanze","ar":"موسانزي"}',true),
('20000000-0000-0000-0000-000000000025','10000000-0000-0000-0000-000000000001','{"en":"New Cairo","fr":"Nouveau Caire","ar":"القاهرة الجديدة"}',true)
on conflict (id) do update set country_id=excluded.country_id,name_i18n=excluded.name_i18n,is_active=excluded.is_active;

insert into public.specialties (id,code,name_i18n,icon_identifier,display_order,status) values
('30000000-0000-0000-0000-000000000001','cardiology','{"en":"Cardiology","fr":"Cardiologie","ar":"أمراض القلب"}','heart-pulse',10,'ACTIVE'),
('30000000-0000-0000-0000-000000000002','orthopedics','{"en":"Orthopedics","fr":"Orthopédie","ar":"جراحة العظام"}','bone',20,'ACTIVE'),
('30000000-0000-0000-0000-000000000003','oncology','{"en":"Oncology","fr":"Oncologie","ar":"الأورام"}','shield-plus',30,'ACTIVE'),
('30000000-0000-0000-0000-000000000004','ophthalmology','{"en":"Ophthalmology","fr":"Ophtalmologie","ar":"طب العيون"}','eye',40,'ACTIVE'),
('30000000-0000-0000-0000-000000000005','dentistry','{"en":"Dentistry","fr":"Dentisterie","ar":"طب الأسنان"}','sparkles',50,'ACTIVE'),
('30000000-0000-0000-0000-000000000006','fertility','{"en":"Fertility","fr":"Fertilité","ar":"علاج الخصوبة"}','baby',60,'ACTIVE'),
('30000000-0000-0000-0000-000000000007','bariatric_surgery','{"en":"Bariatric Surgery","fr":"Chirurgie bariatrique","ar":"جراحة السمنة"}','activity',70,'ACTIVE'),
('30000000-0000-0000-0000-000000000008','cosmetic_surgery','{"en":"Cosmetic Surgery","fr":"Chirurgie esthétique","ar":"جراحة التجميل"}','wand-sparkles',80,'ACTIVE'),
('30000000-0000-0000-0000-000000000009','neurology','{"en":"Neurology","fr":"Neurologie","ar":"طب الأعصاب"}','brain',90,'ACTIVE'),
('30000000-0000-0000-0000-000000000010','urology','{"en":"Urology","fr":"Urologie","ar":"المسالك البولية"}','stethoscope',100,'ACTIVE'),
('30000000-0000-0000-0000-000000000011','dermatology','{"en":"Dermatology","fr":"Dermatologie","ar":"الأمراض الجلدية"}','scan-face',110,'ACTIVE'),
('30000000-0000-0000-0000-000000000012','gastroenterology','{"en":"Gastroenterology","fr":"Gastro-entérologie","ar":"الجهاز الهضمي"}','scan',120,'ACTIVE'),
('30000000-0000-0000-0000-000000000013','ent','{"en":"Ear, Nose and Throat","fr":"ORL","ar":"الأنف والأذن والحنجرة"}','ear',130,'ACTIVE'),
('30000000-0000-0000-0000-000000000014','rehabilitation','{"en":"Rehabilitation","fr":"Réadaptation","ar":"إعادة التأهيل"}','accessibility',140,'ACTIVE'),
('30000000-0000-0000-0000-000000000015','general_surgery','{"en":"General Surgery","fr":"Chirurgie générale","ar":"الجراحة العامة"}','cross',150,'ACTIVE')
on conflict (id) do update set name_i18n=excluded.name_i18n,icon_identifier=excluded.icon_identifier,display_order=excluded.display_order,status=excluded.status;

with treatment_data(n,specialty,code,en,fr,ar) as (values
(1,1,'cardiology_consultation','Cardiology consultation','Consultation de cardiologie','استشارة أمراض القلب'),
(2,1,'coronary_angiography','Coronary angiography','Coronarographie','تصوير الشرايين التاجية'),
(3,1,'cardiac_bypass','Cardiac bypass surgery','Pontage coronarien','جراحة مجازة القلب'),
(4,2,'joint_replacement','Joint replacement','Remplacement articulaire','استبدال المفاصل'),
(5,2,'spine_assessment','Spine assessment','Évaluation de la colonne','تقييم العمود الفقري'),
(6,2,'sports_injury_repair','Sports injury repair','Réparation des blessures sportives','علاج إصابات الملاعب'),
(7,3,'oncology_consultation','Oncology consultation','Consultation en oncologie','استشارة الأورام'),
(8,3,'radiotherapy_planning','Radiotherapy planning','Planification de radiothérapie','تخطيط العلاج الإشعاعي'),
(9,3,'chemotherapy_review','Chemotherapy review','Évaluation de chimiothérapie','مراجعة العلاج الكيميائي'),
(10,4,'cataract_surgery','Cataract surgery','Chirurgie de la cataracte','جراحة المياه البيضاء'),
(11,4,'laser_vision_correction','Laser vision correction','Correction de la vue au laser','تصحيح النظر بالليزر'),
(12,4,'retina_evaluation','Retina evaluation','Évaluation rétinienne','تقييم الشبكية'),
(13,5,'dental_implants','Dental implants','Implants dentaires','زراعة الأسنان'),
(14,5,'full_mouth_restoration','Full mouth restoration','Restauration dentaire complète','ترميم كامل للفم'),
(15,5,'orthodontic_assessment','Orthodontic assessment','Évaluation orthodontique','تقييم تقويم الأسنان'),
(16,6,'ivf_cycle','IVF cycle','Cycle FIV','دورة أطفال الأنابيب'),
(17,6,'fertility_assessment','Fertility assessment','Bilan de fertilité','تقييم الخصوبة'),
(18,7,'gastric_sleeve','Gastric sleeve','Sleeve gastrectomie','تكميم المعدة'),
(19,7,'gastric_bypass','Gastric bypass','Bypass gastrique','تحويل مسار المعدة'),
(20,7,'weight_management_review','Weight management review','Bilan de gestion du poids','مراجعة إدارة الوزن'),
(21,8,'rhinoplasty','Rhinoplasty','Rhinoplastie','تجميل الأنف'),
(22,8,'body_contouring','Body contouring','Remodelage corporel','نحت الجسم'),
(23,8,'reconstructive_consultation','Reconstructive consultation','Consultation reconstructive','استشارة جراحة ترميمية'),
(24,9,'neurology_consultation','Neurology consultation','Consultation neurologique','استشارة الأعصاب'),
(25,9,'epilepsy_assessment','Epilepsy assessment','Évaluation de l’épilepsie','تقييم الصرع'),
(26,9,'movement_disorder_review','Movement disorder review','Bilan des troubles du mouvement','مراجعة اضطرابات الحركة'),
(27,10,'urology_consultation','Urology consultation','Consultation urologique','استشارة المسالك البولية'),
(28,10,'prostate_assessment','Prostate assessment','Évaluation de la prostate','تقييم البروستاتا'),
(29,10,'kidney_stone_treatment','Kidney stone treatment','Traitement des calculs rénaux','علاج حصوات الكلى'),
(30,11,'dermatology_consultation','Dermatology consultation','Consultation dermatologique','استشارة الجلدية'),
(31,11,'laser_skin_therapy','Laser skin therapy','Thérapie cutanée au laser','علاج البشرة بالليزر'),
(32,12,'endoscopy','Diagnostic endoscopy','Endoscopie diagnostique','منظار تشخيصي'),
(33,12,'liver_assessment','Liver assessment','Évaluation hépatique','تقييم الكبد'),
(34,13,'ent_consultation','ENT consultation','Consultation ORL','استشارة الأنف والأذن'),
(35,13,'sinus_surgery','Sinus surgery','Chirurgie des sinus','جراحة الجيوب الأنفية'),
(36,14,'physiotherapy_program','Physiotherapy program','Programme de physiothérapie','برنامج العلاج الطبيعي'),
(37,14,'neuro_rehabilitation','Neurological rehabilitation','Réadaptation neurologique','إعادة التأهيل العصبي'),
(38,15,'general_surgery_consultation','General surgery consultation','Consultation de chirurgie générale','استشارة الجراحة العامة'),
(39,15,'hernia_repair','Hernia repair','Cure de hernie','إصلاح الفتق'),
(40,15,'gallbladder_surgery','Gallbladder surgery','Chirurgie de la vésicule','جراحة المرارة'))
insert into public.treatments(id,specialty_id,code,slug,name_i18n,status)
select ('40000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,('30000000-0000-0000-0000-'||lpad(specialty::text,12,'0'))::uuid,code,replace(code,'_','-'),jsonb_build_object('en',en,'fr',fr,'ar',ar),'ACTIVE'
from treatment_data
on conflict (id) do update set specialty_id=excluded.specialty_id,slug=excluded.slug,name_i18n=excluded.name_i18n,status=excluded.status;

with hospital_data(n,legal_name,display_name,slug,country_n,city_n,verification) as (values
(1,'Nile Meridian Medical Group Demo','Nile Meridian International Hospital','nile-meridian-international',1,1,'VERIFIED'),
(2,'Alexandria Blue Harbor Care Demo','Blue Harbor Medical Center','blue-harbor-medical-center',1,2,'PENDING_REVIEW'),
(3,'Atlas Horizon Health Demo','Atlas Horizon International Clinic','atlas-horizon-clinic',7,15,'VERIFIED'),
(4,'Teranga Medical Partners Demo','Teranga Specialist Hospital','teranga-specialist-hospital',3,6,'VERIFIED'),
(5,'Kigali Summit Care Demo','Kigali Summit Medical Institute','kigali-summit-medical',10,23,'VERIFIED'),
(6,'Accra Cedar Health Demo','Cedar Coast Hospital','cedar-coast-hospital',6,13,'PENDING_REVIEW'),
(7,'Nairobi Acacia Medical Demo','Acacia Gate Medical Centre','acacia-gate-medical',9,21,'DRAFT'))
insert into public.hospitals(id,legal_name,display_name_i18n,slug,short_description_i18n,description_i18n,country_id,city_id,public_email,public_phone,international_patient_services,address_i18n,status,verification_state)
select ('50000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,legal_name,
jsonb_build_object('en',display_name,'fr',display_name,'ar',display_name),slug,
jsonb_build_object('en','Fictional international-care provider for CareBridge demonstrations.','fr','Prestataire fictif pour les démonstrations CareBridge.','ar','مقدم رعاية خيالي لعروض كيربريدج.'),'{}'::jsonb,
('10000000-0000-0000-0000-'||lpad(country_n::text,12,'0'))::uuid,('20000000-0000-0000-0000-'||lpad(city_n::text,12,'0'))::uuid,
'care@example.invalid','+000 000 000 '||lpad(n::text,2,'0'),true,jsonb_build_object('en','CareBridge demo address','fr','Adresse de démonstration CareBridge','ar','عنوان تجريبي لكيربريدج'),
case when verification='DRAFT' then 'DRAFT'::public.record_status else 'ACTIVE'::public.record_status end,verification::public.provider_verification_state
from hospital_data
on conflict (id) do update set display_name_i18n=excluded.display_name_i18n,short_description_i18n=excluded.short_description_i18n,status=excluded.status,verification_state=excluded.verification_state;

with branch_data(n,hospital_n,city_n,name,is_main) as (values
(1,1,1,'Cairo Main Campus',true),(2,1,25,'New Cairo Day Center',false),(3,2,2,'Corniche Campus',true),
(4,3,15,'Casablanca Main Clinic',true),(5,3,16,'Rabat Coordination Office',false),(6,4,6,'Dakar Main Hospital',true),
(7,4,7,'Thiès Outpatient Center',false),(8,5,23,'Kigali Summit Campus',true),(9,5,24,'Musanze Recovery Center',false),
(10,6,13,'Accra Main Campus',true),(11,6,14,'Kumasi Clinic',false),(12,7,21,'Nairobi Main Centre',true))
insert into public.hospital_branches(id,hospital_id,name_i18n,country_id,city_id,address_i18n,is_main,status)
select ('51000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
('50000000-0000-0000-0000-'||lpad(hospital_n::text,12,'0'))::uuid,jsonb_build_object('en',name,'fr',name,'ar',name),
c.country_id,('20000000-0000-0000-0000-'||lpad(city_n::text,12,'0'))::uuid,'{}'::jsonb,is_main,
case when hospital_n=7 then 'DRAFT'::public.record_status else 'ACTIVE'::public.record_status end
from branch_data join public.cities c on c.id=('20000000-0000-0000-0000-'||lpad(city_n::text,12,'0'))::uuid
on conflict (id) do update set name_i18n=excluded.name_i18n,status=excluded.status;

insert into public.doctors(id,first_name,last_name,display_name,professional_title,biography_i18n,years_experience,license_number,license_country_id,license_expiration_date,status,verification_state)
select ('60000000-0000-0000-0000-'||lpad(gs::text,12,'0'))::uuid,
(array['Amira','Youssef','Salma','Omar','Nadia','Karim','Mariam','Idris','Awa','Kofi','Leila','Hassan','Chantal','Emmanuel','Rania','Tariq','Zainab','Malik','Sofia','Noah','Imani','Adel','Maya','Samir'])[gs],
(array['Nour','Haddad','Mansour','El-Sayed','Diallo','Benkacem','Farouk','Ndiaye','Konaté','Mensah','Berrada','Kamal','Mbarga','Okafor','Saad','Rahman','Kamau','Owusu','Laurent','Habimana','Achieng','Rashid','Fadel','Aziz'])[gs],
'Dr. '||(array['Amira Nour','Youssef Haddad','Salma Mansour','Omar El-Sayed','Nadia Diallo','Karim Benkacem','Mariam Farouk','Idris Ndiaye','Awa Konaté','Kofi Mensah','Leila Berrada','Hassan Kamal','Chantal Mbarga','Emmanuel Okafor','Rania Saad','Tariq Rahman','Zainab Kamau','Malik Owusu','Sofia Laurent','Noah Habimana','Imani Achieng','Adel Rashid','Maya Fadel','Samir Aziz'])[gs],
(array['Consultant Cardiologist','Orthopedic Surgeon','Medical Oncologist','Consultant Ophthalmologist','Restorative Dentist','Fertility Specialist','Bariatric Surgeon','Plastic Surgeon','Consultant Neurologist','Consultant Urologist','Consultant Dermatologist','Gastroenterologist','ENT Surgeon','Rehabilitation Physician','General Surgeon','Interventional Cardiologist','Spine Surgeon','Retina Specialist','Prosthodontist','Reproductive Medicine Specialist','Neurologist','Urologic Surgeon','General Surgeon','Rehabilitation Consultant'])[gs],
jsonb_build_object('en','Fictional clinician profile created for CareBridge demonstrations.','fr','Profil fictif créé pour les démonstrations CareBridge.','ar','ملف طبيب خيالي لعروض كيربريدج.'),6+(gs%20),'DEMO-LIC-'||lpad(gs::text,4,'0'),
('10000000-0000-0000-0000-'||lpad((((gs-1)%10)+1)::text,12,'0'))::uuid,date '2030-12-31',
case when gs in (7,18,24) then 'DRAFT'::public.record_status else 'ACTIVE'::public.record_status end,
case when gs in (7,18,24) then 'DRAFT'::public.provider_verification_state when gs in (5,12,21) then 'PENDING_REVIEW'::public.provider_verification_state else 'VERIFIED'::public.provider_verification_state end
from generate_series(1,24) gs
on conflict (id) do update set display_name=excluded.display_name,professional_title=excluded.professional_title,status=excluded.status,verification_state=excluded.verification_state;

insert into public.doctor_specialties(doctor_id,specialty_id,is_primary)
select ('60000000-0000-0000-0000-'||lpad(gs::text,12,'0'))::uuid,('30000000-0000-0000-0000-'||lpad((((gs-1)%15)+1)::text,12,'0'))::uuid,true
from generate_series(1,24) gs on conflict (doctor_id,specialty_id) do update set is_primary=excluded.is_primary;

insert into public.doctor_languages(doctor_id,language_code,proficiency)
select ('60000000-0000-0000-0000-'||lpad(gs::text,12,'0'))::uuid,language_code,
case when language_code='en' then 'PROFESSIONAL' else 'CONVERSATIONAL' end
from generate_series(1,24) gs cross join lateral unnest(case when gs%3=0 then array['en','fr','ar'] when gs%2=0 then array['en','ar'] else array['en','fr'] end) language_code
on conflict (doctor_id,language_code) do update set proficiency=excluded.proficiency;

insert into public.doctor_hospitals(id,doctor_id,hospital_id,title,is_primary,consultation_available,status)
select ('61000000-0000-0000-0000-'||lpad(gs::text,12,'0'))::uuid,('60000000-0000-0000-0000-'||lpad(gs::text,12,'0'))::uuid,
('50000000-0000-0000-0000-'||lpad((((gs-1)%7)+1)::text,12,'0'))::uuid,'Consultant',true,true,'ACTIVE'
from generate_series(1,24) gs on conflict (id) do update set hospital_id=excluded.hospital_id,title=excluded.title,consultation_available=excluded.consultation_available;

-- A second assignment for selected clinicians demonstrates the supported many-to-many model.
insert into public.doctor_hospitals(id,doctor_id,hospital_id,title,is_primary,consultation_available,status)
select ('62000000-0000-0000-0000-'||lpad(gs::text,12,'0'))::uuid,
('60000000-0000-0000-0000-'||lpad(gs::text,12,'0'))::uuid,
('50000000-0000-0000-0000-'||lpad(((gs%7)+1)::text,12,'0'))::uuid,
'Visiting consultant',false,gs%2=0,'ACTIVE'
from generate_series(1,8) gs
on conflict (id) do update set hospital_id=excluded.hospital_id,title=excluded.title,consultation_available=excluded.consultation_available;

with pharmacy_data(n,name,slug,country_n,city_n,verification) as (values
(1,'Harbor Light Pharmacy','harbor-light-pharmacy',1,1,'VERIFIED'),(2,'Blue Coast Pharmacy','blue-coast-pharmacy',1,2,'PENDING_REVIEW'),
(3,'Atlas Well Pharmacy','atlas-well-pharmacy',7,15,'VERIFIED'),(4,'Teranga Care Pharmacy','teranga-care-pharmacy',3,6,'VERIFIED'),
(5,'Kigali Summit Pharmacy','kigali-summit-pharmacy',10,23,'VERIFIED'),(6,'Cedar Coast Pharmacy','cedar-coast-pharmacy',6,13,'PENDING_REVIEW'),
(7,'Acacia Gate Pharmacy','acacia-gate-pharmacy',9,21,'DRAFT'),(8,'Lagoon Health Pharmacy','lagoon-health-pharmacy',4,8,'VERIFIED'),
(9,'Lagos Bridge Pharmacy','lagos-bridge-pharmacy',5,10,'VERIFIED'),(10,'Paris Passage Pharmacy','paris-passage-pharmacy',8,18,'PENDING_REVIEW'))
insert into public.pharmacies(id,legal_name,display_name_i18n,slug,country_id,city_id,address_i18n,public_phone,public_email,working_hours,status,verification_state)
select ('70000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'CareBridge Demo '||name,jsonb_build_object('en',name,'fr',name,'ar',name),slug,
('10000000-0000-0000-0000-'||lpad(country_n::text,12,'0'))::uuid,('20000000-0000-0000-0000-'||lpad(city_n::text,12,'0'))::uuid,
jsonb_build_object('en','CareBridge demo address','fr','Adresse de démonstration CareBridge','ar','عنوان تجريبي لكيربريدج'),'+000 700 '||lpad(n::text,4,'0'),'pharmacy@example.invalid','{"mon_fri":"08:00-21:00"}'::jsonb,
case when verification='DRAFT' then 'DRAFT'::public.record_status else 'ACTIVE'::public.record_status end,verification::public.provider_verification_state
from pharmacy_data
on conflict (id) do update set display_name_i18n=excluded.display_name_i18n,working_hours=excluded.working_hours,status=excluded.status,verification_state=excluded.verification_state;

insert into public.hospital_specialties(hospital_id,specialty_id)
select h.id,s.id from public.hospitals h cross join public.specialties s
where h.id::text like '50000000-%' and s.id::text like '30000000-%' and ((substring(h.id::text from 36 for 1)::int+s.display_order/10)%3=0)
on conflict do nothing;

insert into public.hospital_treatments(hospital_id,treatment_id,starting_price,currency,status,estimated_stay_days,notes_i18n)
select h.id,t.id,750,c.currency_code,'ACTIVE',3,'{"en":"Informational starting price only.","fr":"Prix indicatif de départ uniquement.","ar":"سعر ابتدائي استرشادي فقط."}'::jsonb
from public.hospitals h join public.countries c on c.id=h.country_id join public.hospital_specialties hs on hs.hospital_id=h.id join public.treatments t on t.specialty_id=hs.specialty_id
where h.id::text like '50000000-%'
on conflict (hospital_id,branch_id,treatment_id) do update set starting_price=excluded.starting_price,currency=excluded.currency,estimated_stay_days=excluded.estimated_stay_days,notes_i18n=excluded.notes_i18n;

insert into public.app_settings(key,value,description_key,is_public) values
('platform.supported_languages','["en","fr","ar"]','settings.supportedLanguages',true),
('platform.demo_data','{"fictional":true,"label":"CareBridge demonstration data"}','settings.demoData',false),
('part5.demo_templates','{"fictional":true,"localCare":{"journeyType":"LOCAL_CARE","appointment":"CONSULTATION","travel":null},"internationalNoAccommodation":{"journeyType":"INTERNATIONAL_MEDICAL_TRAVEL","accommodationMode":"NOT_REQUIRED"},"internationalCoordinated":{"journeyType":"INTERNATIONAL_MEDICAL_TRAVEL","accommodationMode":"COORDINATED","transport":"AIRPORT_PICKUP"},"invoice":{"currency":"USD","status":"ISSUED","manualMethods":["BANK_TRANSFER","CASH","CARD_AT_PROVIDER","OTHER"]}}','settings.part5DemoTemplates',false),
('part6.demo_templates','{"fictional":true,"prescription":{"medication":"CareBridge Demo Medicine","dosage":"One unit","frequency":"Once daily"},"laboratory":{"test":"CareBridge Demo Blood Panel","priority":"ROUTINE"},"radiology":{"study":"CareBridge Demo Ultrasound","modality":"US"},"followUp":{"windowDays":14}}','settings.part6DemoTemplates',false)
on conflict (key) do update set value=excluded.value,is_public=excluded.is_public;

-- Deterministic coordinates support Part 3 list/map discovery without relying on a map vendor.
update public.hospital_branches hb set
  latitude = points.latitude,
  longitude = points.longitude
from (values
  ('51000000-0000-0000-0000-000000000001'::uuid, 30.044420::numeric, 31.235712::numeric),
  ('51000000-0000-0000-0000-000000000002'::uuid, 30.013056::numeric, 31.208853::numeric),
  ('51000000-0000-0000-0000-000000000003'::uuid, 31.200092::numeric, 29.918739::numeric),
  ('51000000-0000-0000-0000-000000000004'::uuid, 33.573110::numeric, -7.589843::numeric),
  ('51000000-0000-0000-0000-000000000006'::uuid, 14.716677::numeric, -17.467686::numeric),
  ('51000000-0000-0000-0000-000000000008'::uuid, -1.944072::numeric, 30.061885::numeric),
  ('51000000-0000-0000-0000-000000000010'::uuid, 5.603717::numeric, -0.186964::numeric),
  ('51000000-0000-0000-0000-000000000012'::uuid, -1.292066::numeric, 36.821946::numeric)
) as points(id, latitude, longitude)
where hb.id = points.id;

update public.pharmacies p set
  latitude = points.latitude,
  longitude = points.longitude
from (values
  ('70000000-0000-0000-0000-000000000001'::uuid, 30.050000::numeric, 31.240000::numeric),
  ('70000000-0000-0000-0000-000000000003'::uuid, 33.580000::numeric, -7.600000::numeric),
  ('70000000-0000-0000-0000-000000000004'::uuid, 14.720000::numeric, -17.450000::numeric),
  ('70000000-0000-0000-0000-000000000005'::uuid, -1.950000::numeric, 30.070000::numeric),
  ('70000000-0000-0000-0000-000000000008'::uuid, 5.350000::numeric, -4.020000::numeric),
  ('70000000-0000-0000-0000-000000000009'::uuid, 6.524379::numeric, 3.379206::numeric)
) as points(id, latitude, longitude)
where p.id = points.id;

insert into public.radiology_centers (
  id, legal_name, display_name_i18n, slug, description_i18n, country_id, city_id,
  address_i18n, public_phone, public_email, latitude, longitude, status, verification_state
) values
  ('80000000-0000-0000-0000-000000000001', 'CareBridge Demo Nile Imaging', '{"en":"Nile Precision Imaging","fr":"Imagerie de Précision du Nil","ar":"مركز النيل للتصوير الدقيق"}', 'nile-precision-imaging', '{"en":"Fictional diagnostic imaging center for CareBridge demonstrations.","fr":"Centre fictif d’imagerie diagnostique pour les démonstrations CareBridge.","ar":"مركز تصوير تشخيصي خيالي لعروض كيربريدج."}', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '{"en":"CareBridge demo address","fr":"Adresse de démonstration CareBridge","ar":"عنوان تجريبي لكيربريدج"}', '+000 800 0001', 'imaging@example.invalid', 30.047000, 31.233000, 'ACTIVE', 'VERIFIED'),
  ('80000000-0000-0000-0000-000000000002', 'CareBridge Demo Atlas Imaging', '{"en":"Atlas Advanced Radiology","fr":"Radiologie Avancée Atlas","ar":"أطلس للأشعة المتقدمة"}', 'atlas-advanced-radiology', '{"en":"Fictional diagnostic imaging center for CareBridge demonstrations.","fr":"Centre fictif d’imagerie diagnostique pour les démonstrations CareBridge.","ar":"مركز تصوير تشخيصي خيالي لعروض كيربريدج."}', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000015', '{"en":"CareBridge demo address","fr":"Adresse de démonstration CareBridge","ar":"عنوان تجريبي لكيربريدج"}', '+000 800 0002', 'imaging@example.invalid', 33.575000, -7.595000, 'ACTIVE', 'VERIFIED'),
  ('80000000-0000-0000-0000-000000000003', 'CareBridge Demo Acacia Imaging', '{"en":"Acacia Diagnostic Imaging","fr":"Imagerie Diagnostique Acacia","ar":"أكاسيا للتصوير التشخيصي"}', 'acacia-diagnostic-imaging', '{"en":"Fictional diagnostic imaging center for CareBridge demonstrations.","fr":"Centre fictif d’imagerie diagnostique pour les démonstrations CareBridge.","ar":"مركز تصوير تشخيصي خيالي لعروض كيربريدج."}', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000021', '{"en":"CareBridge demo address","fr":"Adresse de démonstration CareBridge","ar":"عنوان تجريبي لكيربريدج"}', '+000 800 0003', 'imaging@example.invalid', -1.286000, 36.817000, 'DRAFT', 'DRAFT')
on conflict (id) do update set display_name_i18n=excluded.display_name_i18n, description_i18n=excluded.description_i18n,
  latitude=excluded.latitude, longitude=excluded.longitude, status=excluded.status, verification_state=excluded.verification_state;

insert into public.medical_laboratories (
  id, legal_name, display_name_i18n, slug, description_i18n, country_id, city_id,
  address_i18n, public_phone, public_email, latitude, longitude, status, verification_state
) values
  ('90000000-0000-0000-0000-000000000001', 'CareBridge Demo Meridian Labs', '{"en":"Meridian Clinical Laboratories","fr":"Laboratoires Cliniques Meridian","ar":"مختبرات ميريديان السريرية"}', 'meridian-clinical-laboratories', '{"en":"Fictional medical laboratory for CareBridge demonstrations.","fr":"Laboratoire médical fictif pour les démonstrations CareBridge.","ar":"مختبر طبي خيالي لعروض كيربريدج."}', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '{"en":"CareBridge demo address","fr":"Adresse de démonstration CareBridge","ar":"عنوان تجريبي لكيربريدج"}', '+000 900 0001', 'laboratory@example.invalid', 30.040000, 31.230000, 'ACTIVE', 'VERIFIED'),
  ('90000000-0000-0000-0000-000000000002', 'CareBridge Demo Teranga Labs', '{"en":"Teranga Reference Laboratory","fr":"Laboratoire de Référence Teranga","ar":"مختبر تيرانغا المرجعي"}', 'teranga-reference-laboratory', '{"en":"Fictional medical laboratory for CareBridge demonstrations.","fr":"Laboratoire médical fictif pour les démonstrations CareBridge.","ar":"مختبر طبي خيالي لعروض كيربريدج."}', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', '{"en":"CareBridge demo address","fr":"Adresse de démonstration CareBridge","ar":"عنوان تجريبي لكيربريدج"}', '+000 900 0002', 'laboratory@example.invalid', 14.710000, -17.460000, 'ACTIVE', 'VERIFIED'),
  ('90000000-0000-0000-0000-000000000003', 'CareBridge Demo Summit Labs', '{"en":"Summit Molecular Laboratory","fr":"Laboratoire Moléculaire Summit","ar":"مختبر ساميت الجزيئي"}', 'summit-molecular-laboratory', '{"en":"Fictional medical laboratory for CareBridge demonstrations.","fr":"Laboratoire médical fictif pour les démonstrations CareBridge.","ar":"مختبر طبي خيالي لعروض كيربريدج."}', '10000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000023', '{"en":"CareBridge demo address","fr":"Adresse de démonstration CareBridge","ar":"عنوان تجريبي لكيربريدج"}', '+000 900 0003', 'laboratory@example.invalid', -1.948000, 30.065000, 'ACTIVE', 'PENDING_REVIEW')
on conflict (id) do update set display_name_i18n=excluded.display_name_i18n, description_i18n=excluded.description_i18n,
  latitude=excluded.latitude, longitude=excluded.longitude, status=excluded.status, verification_state=excluded.verification_state;

insert into public.radiology_center_specialties (radiology_center_id, specialty_id) values
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'),
  ('80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000009'),
  ('80000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000015')
on conflict do nothing;

insert into public.medical_laboratory_specialties (medical_laboratory_id, specialty_id) values
  ('90000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'),
  ('90000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006'),
  ('90000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000012'),
  ('90000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000009')
on conflict do nothing;
