import type { AdminDictionary } from './messages';

export const adminModuleKeys = [
  'countries', 'cities', 'specialties', 'treatments', 'hospitals', 'hospital_branches',
  'hospital_specialties', 'hospital_treatments', 'doctors', 'doctor_specialties',
  'doctor_languages', 'doctor_hospitals', 'pharmacies', 'radiology_centers', 'medical_laboratories',
  'provider_documents', 'provider_accreditations',
] as const;

export type AdminModuleKey = (typeof adminModuleKeys)[number];
export type AdminFieldType = 'text' | 'textarea' | 'email' | 'url' | 'number' | 'date' | 'select' | 'boolean' | 'json' | 'storage';
export type LookupKey = 'countries' | 'cities' | 'specialties' | 'treatments' | 'hospitals' | 'hospital_branches' | 'doctors' | 'pharmacies' | 'languages' | 'providers';

export interface AdminFieldDefinition {
  name: string;
  label: keyof AdminDictionary['fields'];
  type: AdminFieldType;
  required?: boolean;
  lookup?: LookupKey;
  options?: readonly string[];
  group?: string;
  min?: number;
  max?: number;
  step?: string;
  accept?: string;
  bucket?: 'provider-public' | 'provider-private';
}

export interface AdminModuleDefinition {
  key: AdminModuleKey;
  table: string;
  permission: string;
  titleKey: AdminModuleKey;
  fields: readonly AdminFieldDefinition[];
  listColumns: readonly string[];
  searchColumns: readonly string[];
  filterField?: string;
  filterLookup?: LookupKey;
  statusField?: 'is_active' | 'status';
  idFields: readonly string[];
  onConflict?: string;
  defaultSort: string;
  /** Hard deletion is reserved for removable link records. Business/master
   * records are retained for auditability and deactivated through statusField. */
  allowHardDelete?: boolean;
}

const localizedName = (required = true): AdminFieldDefinition[] => [
  { name: 'name_en', label: 'nameEn', type: 'text', required, group: 'name_i18n' },
  { name: 'name_fr', label: 'nameFr', type: 'text', group: 'name_i18n' },
  { name: 'name_ar', label: 'nameAr', type: 'text', group: 'name_i18n' },
];

const localizedDescription = (group = 'description_i18n'): AdminFieldDefinition[] => [
  { name: 'description_en', label: 'descriptionEn', type: 'textarea', group },
  { name: 'description_fr', label: 'descriptionFr', type: 'textarea', group },
  { name: 'description_ar', label: 'descriptionAr', type: 'textarea', group },
];

const localizedAddress = (): AdminFieldDefinition[] => [
  { name: 'address_en', label: 'addressEn', type: 'textarea', group: 'address_i18n' },
  { name: 'address_fr', label: 'addressFr', type: 'textarea', group: 'address_i18n' },
  { name: 'address_ar', label: 'addressAr', type: 'textarea', group: 'address_i18n' },
];

const recordStatuses = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
const verificationStates = ['DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED'] as const;

export const adminModules: Record<AdminModuleKey, AdminModuleDefinition> = {
  countries: {
    key: 'countries', table: 'countries', permission: 'master_data.countries', titleKey: 'countries',
    fields: [...localizedName(), { name: 'iso2', label: 'iso2', type: 'text', required: true }, { name: 'iso3', label: 'iso3', type: 'text', required: true }, { name: 'phone_code', label: 'phoneCode', type: 'text' }, { name: 'currency_code', label: 'currency', type: 'text' }, { name: 'is_active', label: 'active', type: 'boolean' }],
    listColumns: ['name_i18n', 'iso2', 'iso3', 'phone_code', 'currency_code', 'is_active'], searchColumns: ['iso2', 'iso3'], statusField: 'is_active', idFields: ['id'], defaultSort: 'iso2',
  },
  cities: {
    key: 'cities', table: 'cities', permission: 'master_data.cities', titleKey: 'cities',
    fields: [{ name: 'country_id', label: 'country', type: 'select', required: true, lookup: 'countries' }, ...localizedName(), { name: 'is_active', label: 'active', type: 'boolean' }],
    listColumns: ['name_i18n', 'country_id', 'is_active'], searchColumns: ['name_i18n->>en', 'name_i18n->>fr', 'name_i18n->>ar'], filterField: 'country_id', filterLookup: 'countries', statusField: 'is_active', idFields: ['id'], defaultSort: 'created_at',
  },
  specialties: {
    key: 'specialties', table: 'specialties', permission: 'master_data.specialties', titleKey: 'specialties',
    fields: [{ name: 'code', label: 'code', type: 'text', required: true }, ...localizedName(), ...localizedDescription(), { name: 'icon_identifier', label: 'icon', type: 'text' }, { name: 'display_order', label: 'displayOrder', type: 'number', min: 0 }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }],
    listColumns: ['name_i18n', 'code', 'icon_identifier', 'display_order', 'status'], searchColumns: ['code', 'name_i18n->>en'], statusField: 'status', idFields: ['id'], defaultSort: 'display_order',
  },
  treatments: {
    key: 'treatments', table: 'treatments', permission: 'master_data.treatments', titleKey: 'treatments',
    fields: [{ name: 'specialty_id', label: 'specialty', type: 'select', required: true, lookup: 'specialties' }, { name: 'code', label: 'code', type: 'text', required: true }, { name: 'slug', label: 'slug', type: 'text', required: true }, ...localizedName(), ...localizedDescription(), { name: 'status', label: 'status', type: 'select', options: recordStatuses }],
    listColumns: ['name_i18n', 'code', 'specialty_id', 'slug', 'status'], searchColumns: ['code', 'slug', 'name_i18n->>en'], filterField: 'specialty_id', filterLookup: 'specialties', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  hospitals: {
    key: 'hospitals', table: 'hospitals', permission: 'providers.hospitals', titleKey: 'hospitals',
    fields: [{ name: 'legal_name', label: 'legalName', type: 'text', required: true }, ...localizedName(), { name: 'slug', label: 'slug', type: 'text', required: true }, { name: 'short_description_en', label: 'shortDescriptionEn', type: 'textarea', group: 'short_description_i18n' }, { name: 'short_description_fr', label: 'shortDescriptionFr', type: 'textarea', group: 'short_description_i18n' }, { name: 'short_description_ar', label: 'shortDescriptionAr', type: 'textarea', group: 'short_description_i18n' }, ...localizedDescription(), { name: 'country_id', label: 'country', type: 'select', required: true, lookup: 'countries' }, { name: 'city_id', label: 'city', type: 'select', lookup: 'cities' }, ...localizedAddress(), { name: 'website_url', label: 'website', type: 'url' }, { name: 'public_email', label: 'email', type: 'email' }, { name: 'public_phone', label: 'phone', type: 'text' }, { name: 'international_patient_phone', label: 'internationalPhone', type: 'text' }, { name: 'international_patient_services', label: 'internationalServices', type: 'boolean' }, { name: 'google_place_id', label: 'googlePlaceId', type: 'text' }, { name: 'latitude', label: 'latitude', type: 'number', min: -90, max: 90, step: 'any' }, { name: 'longitude', label: 'longitude', type: 'number', min: -180, max: 180, step: 'any' }, { name: 'logo_path', label: 'logoPath', type: 'storage', bucket: 'provider-public', accept: 'image/jpeg,image/png,image/webp' }, { name: 'cover_image_path', label: 'coverPath', type: 'storage', bucket: 'provider-public', accept: 'image/jpeg,image/png,image/webp' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }, { name: 'verification_state', label: 'verification', type: 'select', options: verificationStates }],
    listColumns: ['display_name_i18n', 'country_id', 'city_id', 'international_patient_services', 'verification_state', 'status'], searchColumns: ['legal_name', 'slug', 'display_name_i18n->>en'], filterField: 'verification_state', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  hospital_branches: {
    key: 'hospital_branches', table: 'hospital_branches', permission: 'providers.hospitals', titleKey: 'hospital_branches',
    fields: [{ name: 'hospital_id', label: 'hospital', type: 'select', required: true, lookup: 'hospitals' }, ...localizedName(), { name: 'country_id', label: 'country', type: 'select', required: true, lookup: 'countries' }, { name: 'city_id', label: 'city', type: 'select', lookup: 'cities' }, ...localizedAddress(), { name: 'google_place_id', label: 'googlePlaceId', type: 'text' }, { name: 'latitude', label: 'latitude', type: 'number', min: -90, max: 90, step: 'any' }, { name: 'longitude', label: 'longitude', type: 'number', min: -180, max: 180, step: 'any' }, { name: 'public_phone', label: 'phone', type: 'text' }, { name: 'public_email', label: 'email', type: 'email' }, { name: 'is_main', label: 'mainBranch', type: 'boolean' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }],
    listColumns: ['name_i18n', 'hospital_id', 'country_id', 'city_id', 'is_main', 'status'], searchColumns: ['name_i18n->>en'], filterField: 'hospital_id', filterLookup: 'hospitals', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  hospital_specialties: {
    key: 'hospital_specialties', table: 'hospital_specialties', permission: 'providers.hospitals', titleKey: 'hospital_specialties',
    fields: [{ name: 'hospital_id', label: 'hospital', type: 'select', required: true, lookup: 'hospitals' }, { name: 'specialty_id', label: 'specialty', type: 'select', required: true, lookup: 'specialties' }],
    listColumns: ['hospital_id', 'specialty_id', 'created_at'], searchColumns: [], filterField: 'hospital_id', filterLookup: 'hospitals', idFields: ['hospital_id', 'specialty_id'], onConflict: 'hospital_id,specialty_id', defaultSort: 'created_at', allowHardDelete: true,
  },
  hospital_treatments: {
    key: 'hospital_treatments', table: 'hospital_treatments', permission: 'providers.hospitals', titleKey: 'hospital_treatments',
    fields: [{ name: 'hospital_id', label: 'hospital', type: 'select', required: true, lookup: 'hospitals' }, { name: 'branch_id', label: 'branch', type: 'select', lookup: 'hospital_branches' }, { name: 'treatment_id', label: 'treatment', type: 'select', required: true, lookup: 'treatments' }, { name: 'starting_price', label: 'startingPrice', type: 'number', min: 0, step: '0.01' }, { name: 'currency', label: 'currency', type: 'text' }, { name: 'estimated_stay_days', label: 'stayDays', type: 'number', min: 0, max: 365 }, { name: 'notes_en', label: 'notesEn', type: 'textarea', group: 'notes_i18n' }, { name: 'notes_fr', label: 'notesFr', type: 'textarea', group: 'notes_i18n' }, { name: 'notes_ar', label: 'notesAr', type: 'textarea', group: 'notes_i18n' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }],
    listColumns: ['hospital_id', 'treatment_id', 'starting_price', 'currency', 'estimated_stay_days', 'status'], searchColumns: [], filterField: 'hospital_id', filterLookup: 'hospitals', statusField: 'status', idFields: ['hospital_id', 'branch_id', 'treatment_id'], onConflict: 'hospital_id,branch_id,treatment_id', defaultSort: 'created_at',
  },
  doctors: {
    key: 'doctors', table: 'doctors', permission: 'providers.doctors', titleKey: 'doctors',
    fields: [{ name: 'user_id', label: 'ownerUser', type: 'text' }, { name: 'first_name', label: 'firstName', type: 'text', required: true }, { name: 'last_name', label: 'lastName', type: 'text', required: true }, { name: 'display_name', label: 'displayName', type: 'text' }, { name: 'professional_title', label: 'professionalTitle', type: 'text' }, { name: 'biography_en', label: 'biographyEn', type: 'textarea', group: 'biography_i18n' }, { name: 'biography_fr', label: 'biographyFr', type: 'textarea', group: 'biography_i18n' }, { name: 'biography_ar', label: 'biographyAr', type: 'textarea', group: 'biography_i18n' }, { name: 'years_experience', label: 'experience', type: 'number', min: 0, max: 80 }, { name: 'profile_image_path', label: 'profileImage', type: 'storage', bucket: 'provider-public', accept: 'image/jpeg,image/png,image/webp' }, { name: 'license_number', label: 'licenseNumber', type: 'text' }, { name: 'license_country_id', label: 'licenseCountry', type: 'select', lookup: 'countries' }, { name: 'license_expiration_date', label: 'licenseExpiry', type: 'date' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }, { name: 'verification_state', label: 'verification', type: 'select', options: verificationStates }],
    listColumns: ['display_name', 'professional_title', 'years_experience', 'license_number', 'verification_state', 'status'], searchColumns: ['display_name', 'first_name', 'last_name', 'license_number'], filterField: 'verification_state', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  doctor_specialties: {
    key: 'doctor_specialties', table: 'doctor_specialties', permission: 'providers.doctors', titleKey: 'doctor_specialties', fields: [{ name: 'doctor_id', label: 'displayName', type: 'select', required: true, lookup: 'doctors' }, { name: 'specialty_id', label: 'specialty', type: 'select', required: true, lookup: 'specialties' }, { name: 'is_primary', label: 'primary', type: 'boolean' }],
    listColumns: ['doctor_id', 'specialty_id', 'is_primary'], searchColumns: [], filterField: 'doctor_id', filterLookup: 'doctors', idFields: ['doctor_id', 'specialty_id'], onConflict: 'doctor_id,specialty_id', defaultSort: 'created_at', allowHardDelete: true,
  },
  doctor_languages: {
    key: 'doctor_languages', table: 'doctor_languages', permission: 'providers.doctors', titleKey: 'doctor_languages', fields: [{ name: 'doctor_id', label: 'displayName', type: 'select', required: true, lookup: 'doctors' }, { name: 'language_code', label: 'language', type: 'select', required: true, lookup: 'languages' }, { name: 'proficiency', label: 'proficiency', type: 'select', options: ['BASIC', 'CONVERSATIONAL', 'PROFESSIONAL', 'NATIVE'] }],
    listColumns: ['doctor_id', 'language_code', 'proficiency'], searchColumns: [], filterField: 'doctor_id', filterLookup: 'doctors', idFields: ['doctor_id', 'language_code'], onConflict: 'doctor_id,language_code', defaultSort: 'created_at', allowHardDelete: true,
  },
  doctor_hospitals: {
    key: 'doctor_hospitals', table: 'doctor_hospitals', permission: 'providers.doctors', titleKey: 'doctor_hospitals', fields: [{ name: 'doctor_id', label: 'displayName', type: 'select', required: true, lookup: 'doctors' }, { name: 'hospital_id', label: 'hospital', type: 'select', required: true, lookup: 'hospitals' }, { name: 'branch_id', label: 'branch', type: 'select', lookup: 'hospital_branches' }, { name: 'title', label: 'titleAtHospital', type: 'text' }, { name: 'is_primary', label: 'primary', type: 'boolean' }, { name: 'consultation_available', label: 'consultationAvailable', type: 'boolean' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }],
    listColumns: ['doctor_id', 'hospital_id', 'title', 'is_primary', 'consultation_available', 'status'], searchColumns: ['title'], filterField: 'hospital_id', filterLookup: 'hospitals', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  pharmacies: {
    key: 'pharmacies', table: 'pharmacies', permission: 'providers.pharmacies', titleKey: 'pharmacies', fields: [{ name: 'owner_user_id', label: 'ownerUser', type: 'text' }, { name: 'legal_name', label: 'legalName', type: 'text', required: true }, ...localizedName(), { name: 'slug', label: 'slug', type: 'text', required: true }, { name: 'country_id', label: 'country', type: 'select', required: true, lookup: 'countries' }, { name: 'city_id', label: 'city', type: 'select', lookup: 'cities' }, ...localizedAddress(), { name: 'public_phone', label: 'phone', type: 'text' }, { name: 'public_email', label: 'email', type: 'email' }, { name: 'website_url', label: 'website', type: 'url' }, { name: 'latitude', label: 'latitude', type: 'number', min: -90, max: 90, step: 'any' }, { name: 'longitude', label: 'longitude', type: 'number', min: -180, max: 180, step: 'any' }, { name: 'google_place_id', label: 'googlePlaceId', type: 'text' }, { name: 'working_hours', label: 'workingHours', type: 'json' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }, { name: 'verification_state', label: 'verification', type: 'select', options: verificationStates }],
    listColumns: ['display_name_i18n', 'country_id', 'city_id', 'verification_state', 'status'], searchColumns: ['legal_name', 'slug', 'display_name_i18n->>en'], filterField: 'verification_state', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  radiology_centers: {
    key: 'radiology_centers', table: 'radiology_centers', permission: 'providers.diagnostics', titleKey: 'radiology_centers',
    fields: [{ name: 'owner_user_id', label: 'ownerUser', type: 'text' }, { name: 'legal_name', label: 'legalName', type: 'text', required: true }, ...localizedName(), { name: 'slug', label: 'slug', type: 'text', required: true }, ...localizedDescription(), { name: 'country_id', label: 'country', type: 'select', required: true, lookup: 'countries' }, { name: 'city_id', label: 'city', type: 'select', lookup: 'cities' }, ...localizedAddress(), { name: 'public_phone', label: 'phone', type: 'text' }, { name: 'public_email', label: 'email', type: 'email' }, { name: 'website_url', label: 'website', type: 'url' }, { name: 'latitude', label: 'latitude', type: 'number', min: -90, max: 90, step: 'any' }, { name: 'longitude', label: 'longitude', type: 'number', min: -180, max: 180, step: 'any' }, { name: 'google_place_id', label: 'googlePlaceId', type: 'text' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }, { name: 'verification_state', label: 'verification', type: 'select', options: verificationStates }],
    listColumns: ['display_name_i18n', 'country_id', 'city_id', 'verification_state', 'status'], searchColumns: ['legal_name', 'slug', 'display_name_i18n->>en'], filterField: 'verification_state', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  medical_laboratories: {
    key: 'medical_laboratories', table: 'medical_laboratories', permission: 'providers.diagnostics', titleKey: 'medical_laboratories',
    fields: [{ name: 'owner_user_id', label: 'ownerUser', type: 'text' }, { name: 'legal_name', label: 'legalName', type: 'text', required: true }, ...localizedName(), { name: 'slug', label: 'slug', type: 'text', required: true }, ...localizedDescription(), { name: 'country_id', label: 'country', type: 'select', required: true, lookup: 'countries' }, { name: 'city_id', label: 'city', type: 'select', lookup: 'cities' }, ...localizedAddress(), { name: 'public_phone', label: 'phone', type: 'text' }, { name: 'public_email', label: 'email', type: 'email' }, { name: 'website_url', label: 'website', type: 'url' }, { name: 'latitude', label: 'latitude', type: 'number', min: -90, max: 90, step: 'any' }, { name: 'longitude', label: 'longitude', type: 'number', min: -180, max: 180, step: 'any' }, { name: 'google_place_id', label: 'googlePlaceId', type: 'text' }, { name: 'status', label: 'status', type: 'select', options: recordStatuses }, { name: 'verification_state', label: 'verification', type: 'select', options: verificationStates }],
    listColumns: ['display_name_i18n', 'country_id', 'city_id', 'verification_state', 'status'], searchColumns: ['legal_name', 'slug', 'display_name_i18n->>en'], filterField: 'verification_state', statusField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  provider_documents: {
    key: 'provider_documents', table: 'provider_documents', permission: 'providers.documents', titleKey: 'provider_documents', fields: [{ name: 'provider_type', label: 'providerType', type: 'select', required: true, options: ['HOSPITAL', 'DOCTOR', 'PHARMACY', 'RADIOLOGY_CENTER', 'MEDICAL_LABORATORY'] }, { name: 'provider_id', label: 'provider', type: 'text', required: true }, { name: 'document_type', label: 'documentType', type: 'select', required: true, options: ['MEDICAL_LICENSE', 'COMMERCIAL_REGISTRATION', 'ACCREDITATION_CERTIFICATE', 'IDENTITY_SUPPORTING', 'OTHER'] }, { name: 'object_path', label: 'objectPath', type: 'storage', required: true, bucket: 'provider-private', accept: 'application/pdf,image/jpeg,image/png' }, { name: 'original_filename', label: 'originalFilename', type: 'text' }, { name: 'mime_type', label: 'mimeType', type: 'text' }, { name: 'issued_at', label: 'issueDate', type: 'date' }, { name: 'expires_at', label: 'expiryDate', type: 'date' }, { name: 'status', label: 'verification', type: 'select', options: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'] }, { name: 'review_notes', label: 'reviewNotes', type: 'textarea' }],
    listColumns: ['provider_type', 'document_type', 'original_filename', 'status', 'expires_at'], searchColumns: ['document_type', 'original_filename'], filterField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
  provider_accreditations: {
    key: 'provider_accreditations', table: 'provider_accreditations', permission: 'providers.verify', titleKey: 'provider_accreditations', fields: [{ name: 'provider_type', label: 'providerType', type: 'select', required: true, options: ['HOSPITAL', 'DOCTOR', 'PHARMACY', 'RADIOLOGY_CENTER', 'MEDICAL_LABORATORY'] }, { name: 'provider_id', label: 'provider', type: 'text', required: true }, { name: 'accreditation_name', label: 'accreditationName', type: 'text', required: true }, { name: 'issuing_organization', label: 'issuingBody', type: 'text', required: true }, { name: 'credential_number', label: 'certificateNumber', type: 'text' }, { name: 'issued_at', label: 'issueDate', type: 'date' }, { name: 'expires_at', label: 'expiryDate', type: 'date' }, { name: 'status', label: 'verification', type: 'select', options: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'] }, { name: 'admin_notes', label: 'reviewNotes', type: 'textarea' }],
    listColumns: ['provider_type', 'accreditation_name', 'issuing_organization', 'credential_number', 'status', 'expires_at'], searchColumns: ['accreditation_name', 'issuing_organization', 'credential_number'], filterField: 'status', idFields: ['id'], defaultSort: 'created_at',
  },
};

export function isAdminModuleKey(value: string): value is AdminModuleKey { return adminModuleKeys.includes(value as AdminModuleKey); }
