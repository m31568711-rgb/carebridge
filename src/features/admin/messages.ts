import type { Locale } from '@/src/i18n/config';

const en = {
  title: 'Platform administration',
  subtitle: 'Master data, provider governance, verification, and audit oversight.',
  navigation: {
    overview: 'Overview', geography: 'Geography', countries: 'Countries', cities: 'Cities', clinical: 'Clinical catalog',
    specialties: 'Specialties', treatments: 'Treatments', providers: 'Providers', hospitals: 'Hospitals', branches: 'Hospital branches',
    hospitalSpecialties: 'Hospital specialties', hospitalTreatments: 'Hospital treatments', doctors: 'Doctors', doctorSpecialties: 'Doctor specialties',
    doctorLanguages: 'Doctor languages', doctorHospitals: 'Doctor hospitals', pharmacies: 'Pharmacies', radiologyCenters: 'Radiology centers', medicalLaboratories: 'Medical laboratories', governance: 'Governance',
    documents: 'Provider documents', accreditations: 'Accreditations', audit: 'Audit logs',
  },
  common: {
    add: 'Add record', edit: 'Edit', delete: 'Delete', deleteConfirm: 'Delete this record? This action cannot be undone.', save: 'Save record', saving: 'Saving…', cancel: 'Cancel', search: 'Search', filter: 'Filter',
    all: 'All', active: 'Active', inactive: 'Inactive', activate: 'Activate', deactivate: 'Deactivate', actions: 'Actions',
    status: 'Status', verification: 'Verification', previous: 'Previous', next: 'Next', page: 'Page', of: 'of', records: 'records',
    noResults: 'No matching records', noResultsDescription: 'Adjust the filters or add the first record.', configured: 'Supabase connected',
    saved: 'Record saved successfully.', updated: 'Status updated successfully.', failed: 'We could not save this record. Review the fields and your permissions.',
    required: 'Required', optional: 'Optional', clear: 'Clear filters', createTitle: 'Create record', editTitle: 'Edit record',
    formDescription: 'Required fields are marked. Changes are protected by database authorization and recorded where applicable.',
    openMenu: 'Open administration navigation', closeMenu: 'Close navigation', profile: 'Administrator account', backHome: 'Public website',
    configurationTitle: 'Connect Supabase to use administration',
    configurationDescription: 'The public site remains available, but protected Admin data operations need the Supabase URL and publishable key.',
    configurationAction: 'Review setup guide', informationalPrice: 'Informational starting price only — not a treatment quote.',
    chooseFile: 'Choose file', uploading: 'Uploading…', uploadInvalid: 'File type or size is not allowed.', uploadUnavailable: 'Supabase is not configured.',
    uploadProviderFirst: 'Save or select the provider before uploading.', uploadFailed: 'Upload failed. Check your Storage permissions and try again.',
  },
  dashboard: {
    eyebrow: 'Master data overview', title: 'A clear view of the provider network',
    description: 'Live counts and distributions are calculated from records visible through your database permissions.',
    hospitals: 'Total hospitals', doctors: 'Total doctors', pharmacies: 'Total pharmacies', radiologyCenters: 'Radiology centers', medicalLaboratories: 'Medical laboratories', specialties: 'Specialties',
    verified: 'Verified providers', awaiting: 'Awaiting verification', countries: 'Active countries', providersByType: 'Providers by type',
    verificationDistribution: 'Verification distribution', databaseUnavailable: 'Dashboard data is temporarily unavailable.',
  },
  modules: {
    countries: ['Countries', 'Manage localized country names, codes, currencies, and availability.'],
    cities: ['Cities', 'Manage cities and their country relationships.'],
    specialties: ['Specialties', 'Maintain the translated medical specialty catalog and display order.'],
    treatments: ['Treatments', 'Maintain translated procedures and their specialty relationships.'],
    hospitals: ['Hospitals', 'Manage hospital profiles, contact details, locations, media, and verification.'],
    hospital_branches: ['Hospital branches', 'Manage branch locations, addresses, and contact information.'],
    hospital_specialties: ['Hospital specialties', 'Assign or remove specialties supported by each hospital.'],
    hospital_treatments: ['Hospital treatments', 'Manage available treatments and informational starting prices.'],
    doctors: ['Doctors', 'Manage professional profiles, licenses, biographies, media, and verification.'],
    doctor_specialties: ['Doctor specialties', 'Assign one or more specialties to clinicians.'],
    doctor_languages: ['Doctor languages', 'Maintain normalized clinician language proficiency.'],
    doctor_hospitals: ['Doctor hospitals', 'Assign clinicians to one or more hospitals.'],
    pharmacies: ['Pharmacies', 'Manage pharmacy profiles, location data, working hours, and verification.'],
    radiology_centers: ['Radiology centers', 'Manage diagnostic imaging centers, locations, and verification.'],
    medical_laboratories: ['Medical laboratories', 'Manage laboratory profiles, locations, and verification.'],
    provider_documents: ['Provider documents', 'Manage sensitive provider evidence stored in private Storage.'],
    provider_accreditations: ['Accreditations', 'Record provider credentials without fabricating public claims.'],
  },
  fields: {
    nameEn: 'Name (English)', nameFr: 'Name (French)', nameAr: 'Name (Arabic)', descriptionEn: 'Description (English)',
    descriptionFr: 'Description (French)', descriptionAr: 'Description (Arabic)', addressEn: 'Address (English)', addressFr: 'Address (French)', addressAr: 'Address (Arabic)',
    iso2: 'ISO2 code', iso3: 'ISO3 code', phoneCode: 'Phone code', currency: 'Currency code', country: 'Country', city: 'City',
    code: 'Code', slug: 'Slug', icon: 'Icon identifier', displayOrder: 'Display order', specialty: 'Specialty', legalName: 'Legal name',
    shortDescriptionEn: 'Short description (English)', shortDescriptionFr: 'Short description (French)', shortDescriptionAr: 'Short description (Arabic)',
    website: 'Website', email: 'Email', phone: 'Phone', internationalPhone: 'International patient phone', internationalServices: 'International patient services',
    googlePlaceId: 'Google Place ID', latitude: 'Latitude', longitude: 'Longitude', logoPath: 'Logo object path', coverPath: 'Cover image object path',
    hospital: 'Hospital', branch: 'Branch', mainBranch: 'Main branch', treatment: 'Treatment', startingPrice: 'Starting price', stayDays: 'Estimated stay (days)',
    notesEn: 'Notes (English)', notesFr: 'Notes (French)', notesAr: 'Notes (Arabic)', firstName: 'First name', lastName: 'Last name',
    displayName: 'Display name', professionalTitle: 'Professional title', biographyEn: 'Biography (English)', biographyFr: 'Biography (French)', biographyAr: 'Biography (Arabic)',
    experience: 'Years of experience', licenseNumber: 'License number', licenseCountry: 'License country', licenseExpiry: 'License expiry', profileImage: 'Profile image object path',
    primary: 'Primary relationship', language: 'Language', proficiency: 'Proficiency', titleAtHospital: 'Title at hospital', consultationAvailable: 'Consultation availability',
    ownerUser: 'Linked user ID', workingHours: 'Working hours (JSON)', providerType: 'Provider type', provider: 'Provider ID', documentType: 'Document type',
    objectPath: 'Private Storage object path', originalFilename: 'Original filename', mimeType: 'MIME type', issueDate: 'Issue date', expiryDate: 'Expiry date',
    reviewNotes: 'Admin review notes', accreditationName: 'Accreditation name', issuingBody: 'Issuing body', certificateNumber: 'Certificate number', active: 'Active',
    status: 'Status', verification: 'Verification',
  },
} as const;

type DeepString<T> = T extends string ? string : T extends readonly unknown[] ? readonly string[] : { [K in keyof T]: DeepString<T[K]> };
export type AdminDictionary = DeepString<typeof en>;

const fr = {
  ...en,
  title: 'Administration de la plateforme', subtitle: 'Données de référence, gouvernance des prestataires, vérification et audit.',
  navigation: { overview:'Vue d’ensemble',geography:'Géographie',countries:'Pays',cities:'Villes',clinical:'Catalogue clinique',specialties:'Spécialités',treatments:'Traitements',providers:'Prestataires',hospitals:'Hôpitaux',branches:'Sites hospitaliers',hospitalSpecialties:'Spécialités des hôpitaux',hospitalTreatments:'Traitements des hôpitaux',doctors:'Médecins',doctorSpecialties:'Spécialités des médecins',doctorLanguages:'Langues des médecins',doctorHospitals:'Médecins et hôpitaux',pharmacies:'Pharmacies',governance:'Gouvernance',documents:'Documents prestataires',accreditations:'Accréditations',audit:'Journaux d’audit' },
  common: { ...en.common, add:'Ajouter',edit:'Modifier',delete:'Supprimer',deleteConfirm:'Supprimer cet enregistrement ? Cette action est irréversible.',save:'Enregistrer',saving:'Enregistrement…',cancel:'Annuler',search:'Rechercher',filter:'Filtrer',all:'Tous',active:'Actif',inactive:'Inactif',activate:'Activer',deactivate:'Désactiver',actions:'Actions',status:'Statut',verification:'Vérification',previous:'Précédent',next:'Suivant',page:'Page',of:'sur',records:'enregistrements',noResults:'Aucun résultat',noResultsDescription:'Modifiez les filtres ou ajoutez le premier enregistrement.',configured:'Supabase connecté',saved:'Enregistrement sauvegardé.',updated:'Statut mis à jour.',failed:'Impossible d’enregistrer. Vérifiez les champs et vos autorisations.',required:'Obligatoire',optional:'Facultatif',clear:'Effacer les filtres',createTitle:'Créer un enregistrement',editTitle:'Modifier l’enregistrement',formDescription:'Les champs obligatoires sont signalés. Les changements sont protégés et audités.',openMenu:'Ouvrir la navigation',closeMenu:'Fermer la navigation',profile:'Compte administrateur',backHome:'Site public',configurationTitle:'Connectez Supabase pour utiliser l’administration',configurationDescription:'Le site public reste disponible, mais les opérations Admin nécessitent l’URL Supabase et la clé publique.',configurationAction:'Consulter le guide',informationalPrice:'Prix de départ indicatif uniquement — il ne constitue pas un devis.',chooseFile:'Choisir un fichier',uploading:'Téléversement…',uploadInvalid:'Le type ou la taille du fichier n’est pas autorisé.',uploadUnavailable:'Supabase n’est pas configuré.',uploadProviderFirst:'Enregistrez ou sélectionnez le prestataire avant le téléversement.',uploadFailed:'Échec du téléversement. Vérifiez les autorisations Storage et réessayez.' },
  dashboard: { ...en.dashboard, eyebrow:'Vue des données de référence',title:'Une vision claire du réseau de soins',description:'Les données sont calculées à partir des enregistrements autorisés par la base.',hospitals:'Hôpitaux',doctors:'Médecins',pharmacies:'Pharmacies',specialties:'Spécialités',verified:'Prestataires vérifiés',awaiting:'En attente de vérification',countries:'Pays actifs',providersByType:'Prestataires par type',verificationDistribution:'Répartition des vérifications',databaseUnavailable:'Les données sont temporairement indisponibles.' },
  modules: {
    countries:['Pays','Gérez les noms traduits, codes, devises et disponibilités.'],cities:['Villes','Gérez les villes et leur relation avec les pays.'],specialties:['Spécialités','Gérez le catalogue médical traduit et son ordre.'],treatments:['Traitements','Gérez les actes traduits et leurs spécialités.'],hospitals:['Hôpitaux','Gérez les profils, contacts, lieux, médias et vérification.'],hospital_branches:['Sites hospitaliers','Gérez les sites, adresses et coordonnées.'],hospital_specialties:['Spécialités des hôpitaux','Associez les spécialités proposées par chaque hôpital.'],hospital_treatments:['Traitements des hôpitaux','Gérez les soins proposés et leurs prix de départ indicatifs.'],doctors:['Médecins','Gérez les profils, licences, biographies, médias et vérification.'],doctor_specialties:['Spécialités des médecins','Associez une ou plusieurs spécialités aux médecins.'],doctor_languages:['Langues des médecins','Gérez les langues et niveaux normalisés.'],doctor_hospitals:['Médecins et hôpitaux','Associez les médecins à un ou plusieurs hôpitaux.'],pharmacies:['Pharmacies','Gérez les profils, lieux, horaires et vérification.'],provider_documents:['Documents prestataires','Gérez les preuves sensibles conservées dans un stockage privé.'],provider_accreditations:['Accréditations','Enregistrez les titres sans créer de déclarations publiques fictives.'],
  },
  fields: { ...en.fields,
    nameEn:'Nom (anglais)',nameFr:'Nom (français)',nameAr:'Nom (arabe)',descriptionEn:'Description (anglais)',descriptionFr:'Description (français)',descriptionAr:'Description (arabe)',addressEn:'Adresse (anglais)',addressFr:'Adresse (français)',addressAr:'Adresse (arabe)',iso2:'Code ISO2',iso3:'Code ISO3',phoneCode:'Indicatif téléphonique',currency:'Devise',country:'Pays',city:'Ville',code:'Code',slug:'Slug',icon:'Identifiant d’icône',displayOrder:'Ordre d’affichage',specialty:'Spécialité',legalName:'Raison sociale',shortDescriptionEn:'Description courte (anglais)',shortDescriptionFr:'Description courte (français)',shortDescriptionAr:'Description courte (arabe)',website:'Site web',email:'E-mail',phone:'Téléphone',internationalPhone:'Téléphone patients internationaux',internationalServices:'Services aux patients internationaux',googlePlaceId:'Identifiant Google Place',latitude:'Latitude',longitude:'Longitude',logoPath:'Chemin du logo',coverPath:'Chemin de l’image de couverture',hospital:'Hôpital',branch:'Site',mainBranch:'Site principal',treatment:'Traitement',startingPrice:'Prix de départ',stayDays:'Séjour estimé (jours)',notesEn:'Notes (anglais)',notesFr:'Notes (français)',notesAr:'Notes (arabe)',firstName:'Prénom',lastName:'Nom',displayName:'Nom affiché',professionalTitle:'Titre professionnel',biographyEn:'Biographie (anglais)',biographyFr:'Biographie (français)',biographyAr:'Biographie (arabe)',experience:'Années d’expérience',licenseNumber:'Numéro de licence',licenseCountry:'Pays de licence',licenseExpiry:'Expiration de licence',profileImage:'Chemin de la photo',primary:'Relation principale',language:'Langue',proficiency:'Niveau',titleAtHospital:'Titre à l’hôpital',consultationAvailable:'Consultations disponibles',ownerUser:'Identifiant utilisateur lié',workingHours:'Horaires (JSON)',providerType:'Type de prestataire',provider:'Identifiant du prestataire',documentType:'Type de document',objectPath:'Chemin de stockage privé',originalFilename:'Nom du fichier original',mimeType:'Type MIME',issueDate:'Date d’émission',expiryDate:'Date d’expiration',reviewNotes:'Notes de vérification',accreditationName:'Nom de l’accréditation',issuingBody:'Organisme émetteur',certificateNumber:'Numéro de certificat',active:'Actif',status:'Statut',verification:'Vérification',
  },
};

const ar = {
  ...en,
  title: 'إدارة المنصة', subtitle: 'البيانات المرجعية وحوكمة مقدمي الخدمة والتحقق وسجل التدقيق.',
  navigation: { overview:'نظرة عامة',geography:'الجغرافيا',countries:'الدول',cities:'المدن',clinical:'الدليل الطبي',specialties:'التخصصات',treatments:'العلاجات',providers:'مقدمو الخدمة',hospitals:'المستشفيات',branches:'فروع المستشفيات',hospitalSpecialties:'تخصصات المستشفيات',hospitalTreatments:'علاجات المستشفيات',doctors:'الأطباء',doctorSpecialties:'تخصصات الأطباء',doctorLanguages:'لغات الأطباء',doctorHospitals:'الأطباء والمستشفيات',pharmacies:'الصيدليات',governance:'الحوكمة',documents:'وثائق مقدمي الخدمة',accreditations:'الاعتمادات',audit:'سجل التدقيق' },
  common: { ...en.common, add:'إضافة سجل',edit:'تعديل',delete:'حذف',deleteConfirm:'هل تريد حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.',save:'حفظ السجل',saving:'جارٍ الحفظ…',cancel:'إلغاء',search:'بحث',filter:'تصفية',all:'الكل',active:'نشط',inactive:'غير نشط',activate:'تفعيل',deactivate:'إيقاف',actions:'الإجراءات',status:'الحالة',verification:'التحقق',previous:'السابق',next:'التالي',page:'صفحة',of:'من',records:'سجل',noResults:'لا توجد نتائج مطابقة',noResultsDescription:'غيّر عوامل التصفية أو أضف السجل الأول.',configured:'تم ربط Supabase',saved:'تم حفظ السجل بنجاح.',updated:'تم تحديث الحالة بنجاح.',failed:'تعذر حفظ السجل. راجع الحقول والصلاحيات.',required:'مطلوب',optional:'اختياري',clear:'مسح التصفية',createTitle:'إنشاء سجل',editTitle:'تعديل السجل',formDescription:'الحقول المطلوبة موضحة. التغييرات محمية بصلاحيات قاعدة البيانات ويتم تدقيقها.',openMenu:'فتح قائمة الإدارة',closeMenu:'إغلاق القائمة',profile:'حساب المسؤول',backHome:'الموقع العام',configurationTitle:'اربط Supabase لاستخدام الإدارة',configurationDescription:'يبقى الموقع العام متاحًا، لكن عمليات الإدارة المحمية تحتاج إلى رابط Supabase والمفتاح العام.',configurationAction:'مراجعة دليل الإعداد',informationalPrice:'سعر ابتدائي استرشادي فقط — وليس عرض سعر علاجي.',chooseFile:'اختيار ملف',uploading:'جارٍ الرفع…',uploadInvalid:'نوع الملف أو حجمه غير مسموح.',uploadUnavailable:'لم يتم إعداد Supabase.',uploadProviderFirst:'احفظ مقدم الخدمة أو حدده قبل رفع الملف.',uploadFailed:'فشل الرفع. تحقق من صلاحيات التخزين ثم حاول مجددًا.' },
  dashboard: { ...en.dashboard, eyebrow:'نظرة على البيانات المرجعية',title:'رؤية واضحة لشبكة مقدمي الرعاية',description:'تُحسب البيانات من السجلات التي تسمح بها صلاحيات قاعدة البيانات.',hospitals:'إجمالي المستشفيات',doctors:'إجمالي الأطباء',pharmacies:'إجمالي الصيدليات',specialties:'التخصصات',verified:'مقدمو الخدمة المعتمدون',awaiting:'بانتظار التحقق',countries:'الدول النشطة',providersByType:'مقدمو الخدمة حسب النوع',verificationDistribution:'توزيع حالات التحقق',databaseUnavailable:'بيانات لوحة التحكم غير متاحة مؤقتًا.' },
  modules: {
    countries:['الدول','إدارة الأسماء المترجمة والرموز والعملات والإتاحة.'],cities:['المدن','إدارة المدن وربطها بالدول.'],specialties:['التخصصات','إدارة دليل التخصصات المترجم وترتيب العرض.'],treatments:['العلاجات','إدارة الإجراءات المترجمة وربطها بالتخصصات.'],hospitals:['المستشفيات','إدارة الملفات وبيانات الاتصال والمواقع والوسائط والتحقق.'],hospital_branches:['فروع المستشفيات','إدارة مواقع الفروع وعناوينها وبيانات اتصالها.'],hospital_specialties:['تخصصات المستشفيات','ربط التخصصات التي يدعمها كل مستشفى.'],hospital_treatments:['علاجات المستشفيات','إدارة العلاجات والأسعار الابتدائية الاسترشادية.'],doctors:['الأطباء','إدارة الملفات المهنية والتراخيص والسير الذاتية والتحقق.'],doctor_specialties:['تخصصات الأطباء','ربط الطبيب بتخصص واحد أو أكثر.'],doctor_languages:['لغات الأطباء','إدارة اللغات ومستويات الإتقان بصورة معيارية.'],doctor_hospitals:['الأطباء والمستشفيات','ربط الأطباء بمستشفى واحد أو أكثر.'],pharmacies:['الصيدليات','إدارة الملفات والمواقع وساعات العمل والتحقق.'],provider_documents:['وثائق مقدمي الخدمة','إدارة الإثباتات الحساسة المحفوظة في التخزين الخاص.'],provider_accreditations:['الاعتمادات','تسجيل بيانات الاعتماد دون اختلاق ادعاءات عامة.'],
  },
  fields: { ...en.fields,
    nameEn:'الاسم (الإنجليزية)',nameFr:'الاسم (الفرنسية)',nameAr:'الاسم (العربية)',descriptionEn:'الوصف (الإنجليزية)',descriptionFr:'الوصف (الفرنسية)',descriptionAr:'الوصف (العربية)',addressEn:'العنوان (الإنجليزية)',addressFr:'العنوان (الفرنسية)',addressAr:'العنوان (العربية)',iso2:'رمز ISO2',iso3:'رمز ISO3',phoneCode:'رمز الهاتف',currency:'رمز العملة',country:'الدولة',city:'المدينة',code:'الرمز',slug:'المعرّف النصي',icon:'معرّف الأيقونة',displayOrder:'ترتيب العرض',specialty:'التخصص',legalName:'الاسم القانوني',shortDescriptionEn:'وصف مختصر (الإنجليزية)',shortDescriptionFr:'وصف مختصر (الفرنسية)',shortDescriptionAr:'وصف مختصر (العربية)',website:'الموقع الإلكتروني',email:'البريد الإلكتروني',phone:'الهاتف',internationalPhone:'هاتف المرضى الدوليين',internationalServices:'خدمات المرضى الدوليين',googlePlaceId:'معرّف Google Place',latitude:'خط العرض',longitude:'خط الطول',logoPath:'مسار الشعار',coverPath:'مسار صورة الغلاف',hospital:'المستشفى',branch:'الفرع',mainBranch:'الفرع الرئيسي',treatment:'العلاج',startingPrice:'السعر الابتدائي',stayDays:'مدة الإقامة المتوقعة (أيام)',notesEn:'ملاحظات (الإنجليزية)',notesFr:'ملاحظات (الفرنسية)',notesAr:'ملاحظات (العربية)',firstName:'الاسم الأول',lastName:'اسم العائلة',displayName:'اسم العرض',professionalTitle:'المسمى المهني',biographyEn:'السيرة (الإنجليزية)',biographyFr:'السيرة (الفرنسية)',biographyAr:'السيرة (العربية)',experience:'سنوات الخبرة',licenseNumber:'رقم الترخيص',licenseCountry:'دولة الترخيص',licenseExpiry:'انتهاء الترخيص',profileImage:'مسار الصورة الشخصية',primary:'العلاقة الرئيسية',language:'اللغة',proficiency:'مستوى الإتقان',titleAtHospital:'المسمى في المستشفى',consultationAvailable:'إتاحة الاستشارات',ownerUser:'معرّف المستخدم المرتبط',workingHours:'ساعات العمل (JSON)',providerType:'نوع مقدم الخدمة',provider:'معرّف مقدم الخدمة',documentType:'نوع الوثيقة',objectPath:'مسار التخزين الخاص',originalFilename:'اسم الملف الأصلي',mimeType:'نوع MIME',issueDate:'تاريخ الإصدار',expiryDate:'تاريخ الانتهاء',reviewNotes:'ملاحظات المراجعة',accreditationName:'اسم الاعتماد',issuingBody:'الجهة المانحة',certificateNumber:'رقم الشهادة',active:'نشط',status:'الحالة',verification:'التحقق',
  },
};

const messages: Record<Locale, AdminDictionary> = {
  en,
  fr: {
    ...fr,
    navigation: { ...en.navigation, ...fr.navigation, radiologyCenters: 'Centres de radiologie', medicalLaboratories: 'Laboratoires médicaux' },
    modules: {
      ...en.modules,
      ...fr.modules,
      radiology_centers: ['Centres de radiologie', 'Gérez les centres d’imagerie, leurs lieux et leur vérification.'],
      medical_laboratories: ['Laboratoires médicaux', 'Gérez les profils des laboratoires, leurs lieux et leur vérification.'],
    },
  },
  ar: {
    ...ar,
    navigation: { ...en.navigation, ...ar.navigation, radiologyCenters: 'مراكز الأشعة', medicalLaboratories: 'المختبرات الطبية' },
    modules: {
      ...en.modules,
      ...ar.modules,
      radiology_centers: ['مراكز الأشعة', 'إدارة مراكز التصوير التشخيصي ومواقعها والتحقق منها.'],
      medical_laboratories: ['المختبرات الطبية', 'إدارة ملفات المختبرات ومواقعها والتحقق منها.'],
    },
  },
};
export function getAdminDictionary(locale: Locale) { return messages[locale]; }
