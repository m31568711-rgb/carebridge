export const bulkImportEntities = [
  "hospitals",
  "doctors",
  "pharmacies",
  "medical_laboratories",
  "radiology_centers",
] as const;
export type BulkImportEntity = (typeof bulkImportEntities)[number];

export const bulkImportColumns: Record<
  BulkImportEntity,
  Array<{ key: string; en: string; fr: string; ar: string; required?: boolean }>
> = {
  hospitals: [
    {
      key: "name",
      en: "Hospital Name",
      fr: "Nom de l’hôpital",
      ar: "اسم المستشفى",
      required: true,
    },
    {
      key: "name_ar",
      en: "Arabic Name",
      fr: "Nom arabe",
      ar: "الاسم بالعربية",
    },
    {
      key: "name_fr",
      en: "French Name",
      fr: "Nom français",
      ar: "الاسم بالفرنسية",
    },
    {
      key: "country_code",
      en: "Country Code",
      fr: "Code pays",
      ar: "رمز الدولة",
      required: true,
    },
    { key: "city", en: "City", fr: "Ville", ar: "المدينة" },
    { key: "address", en: "Address", fr: "Adresse", ar: "العنوان" },
    { key: "phone", en: "Phone", fr: "Téléphone", ar: "الهاتف" },
    { key: "email", en: "Email", fr: "E-mail", ar: "البريد الإلكتروني" },
    { key: "website", en: "Website", fr: "Site web", ar: "الموقع الإلكتروني" },
  ],
  doctors: [
    {
      key: "first_name",
      en: "First Name",
      fr: "Prénom",
      ar: "الاسم الأول",
      required: true,
    },
    {
      key: "last_name",
      en: "Last Name",
      fr: "Nom",
      ar: "اسم العائلة",
      required: true,
    },
    {
      key: "professional_title",
      en: "Professional Title",
      fr: "Titre professionnel",
      ar: "المسمى المهني",
    },
    {
      key: "license_number",
      en: "License Number",
      fr: "Numéro de licence",
      ar: "رقم الترخيص",
    },
    {
      key: "country_code",
      en: "License Country Code",
      fr: "Code pays de licence",
      ar: "رمز دولة الترخيص",
    },
    {
      key: "specialty",
      en: "Specialty Code",
      fr: "Code spécialité",
      ar: "رمز التخصص",
    },
    {
      key: "hospital",
      en: "Hospital Name",
      fr: "Nom de l’hôpital",
      ar: "اسم المستشفى",
    },
  ],
  pharmacies: [
    {
      key: "name",
      en: "Pharmacy Name",
      fr: "Nom de la pharmacie",
      ar: "اسم الصيدلية",
      required: true,
    },
    {
      key: "name_ar",
      en: "Arabic Name",
      fr: "Nom arabe",
      ar: "الاسم بالعربية",
    },
    {
      key: "name_fr",
      en: "French Name",
      fr: "Nom français",
      ar: "الاسم بالفرنسية",
    },
    {
      key: "country_code",
      en: "Country Code",
      fr: "Code pays",
      ar: "رمز الدولة",
      required: true,
    },
    { key: "city", en: "City", fr: "Ville", ar: "المدينة" },
    { key: "address", en: "Address", fr: "Adresse", ar: "العنوان" },
    { key: "phone", en: "Phone", fr: "Téléphone", ar: "الهاتف" },
    { key: "email", en: "Email", fr: "E-mail", ar: "البريد الإلكتروني" },
    { key: "website", en: "Website", fr: "Site web", ar: "الموقع الإلكتروني" },
  ],
  medical_laboratories: [
    {
      key: "name",
      en: "Laboratory Name",
      fr: "Nom du laboratoire",
      ar: "اسم المختبر",
      required: true,
    },
    {
      key: "name_ar",
      en: "Arabic Name",
      fr: "Nom arabe",
      ar: "الاسم بالعربية",
    },
    {
      key: "name_fr",
      en: "French Name",
      fr: "Nom français",
      ar: "الاسم بالفرنسية",
    },
    {
      key: "country_code",
      en: "Country Code",
      fr: "Code pays",
      ar: "رمز الدولة",
      required: true,
    },
    { key: "city", en: "City", fr: "Ville", ar: "المدينة" },
    { key: "address", en: "Address", fr: "Adresse", ar: "العنوان" },
    { key: "phone", en: "Phone", fr: "Téléphone", ar: "الهاتف" },
    { key: "email", en: "Email", fr: "E-mail", ar: "البريد الإلكتروني" },
    { key: "website", en: "Website", fr: "Site web", ar: "الموقع الإلكتروني" },
  ],
  radiology_centers: [
    {
      key: "name",
      en: "Radiology Center Name",
      fr: "Nom du centre de radiologie",
      ar: "اسم مركز الأشعة",
      required: true,
    },
    {
      key: "name_ar",
      en: "Arabic Name",
      fr: "Nom arabe",
      ar: "الاسم بالعربية",
    },
    {
      key: "name_fr",
      en: "French Name",
      fr: "Nom français",
      ar: "الاسم بالفرنسية",
    },
    {
      key: "country_code",
      en: "Country Code",
      fr: "Code pays",
      ar: "رمز الدولة",
      required: true,
    },
    { key: "city", en: "City", fr: "Ville", ar: "المدينة" },
    { key: "address", en: "Address", fr: "Adresse", ar: "العنوان" },
    { key: "phone", en: "Phone", fr: "Téléphone", ar: "الهاتف" },
    { key: "email", en: "Email", fr: "E-mail", ar: "البريد الإلكتروني" },
    { key: "website", en: "Website", fr: "Site web", ar: "الموقع الإلكتروني" },
  ],
};

export function importHeader(
  column: { en: string; fr: string; ar: string },
  locale: "en" | "fr" | "ar",
) {
  return column[locale];
}
export function slugifyImport(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
