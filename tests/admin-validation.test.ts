import { describe, expect, it } from 'vitest';
import { validateAdminForm } from '@/src/features/admin/validation';

describe('admin form validation', () => {
  it('normalizes country codes and localized names', () => {
    const form = new FormData();
    form.set('name_en', ' Egypt ');
    form.set('iso2', 'eg');
    form.set('iso3', 'egy');
    form.set('currency_code', 'egp');
    const result = validateAdminForm('countries', form);
    expect(result.success).toBe(true);
    expect(result.payload).toMatchObject({ iso2: 'EG', iso3: 'EGY', currency_code: 'EGP', name_i18n: { en: 'Egypt' } });
  });

  it('rejects malformed relationship identifiers', () => {
    const form = new FormData();
    form.set('country_id', 'not-a-uuid');
    form.set('name_en', 'Cairo');
    const result = validateAdminForm('cities', form);
    expect(result.success).toBe(false);
    expect(result.errors.country_id).toBe('invalidId');
  });

  it('maps one provider selector to the correct document foreign key', () => {
    const providerId = '50000000-0000-0000-0000-000000000001';
    const form = new FormData();
    form.set('provider_type', 'HOSPITAL');
    form.set('provider_id', providerId);
    form.set('document_type', 'MEDICAL_LICENSE');
    form.set('object_path', `hospital/${providerId}/license.pdf`);
    form.set('original_filename', 'license.pdf');
    form.set('mime_type', 'application/pdf');
    const result = validateAdminForm('provider_documents', form);
    expect(result.success).toBe(true);
    expect(result.payload.hospital_id).toBe(providerId);
    expect(result.payload.doctor_id).toBeNull();
    expect(result.payload.pharmacy_id).toBeNull();
  });

  it('maps diagnostic providers to their normalized evidence foreign keys', () => {
    const providerId = '80000000-0000-0000-0000-000000000001';
    const form = new FormData();
    form.set('provider_type', 'RADIOLOGY_CENTER');
    form.set('provider_id', providerId);
    form.set('document_type', 'MEDICAL_LICENSE');
    form.set('object_path', `radiology_center/${providerId}/license.pdf`);
    const result = validateAdminForm('provider_documents', form);
    expect(result.success).toBe(true);
    expect(result.payload.radiology_center_id).toBe(providerId);
    expect(result.payload.medical_laboratory_id).toBeNull();
  });
});
