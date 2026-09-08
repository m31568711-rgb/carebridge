import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('provider-facing schema contracts', () => {
  it('uses the real display-name column for provider relationships', () => {
    const sources = [read('../src/features/journey/data.ts'), read('../src/features/doctor-program/data.ts')].join('\n');
    for (const table of ['hospitals', 'pharmacies', 'radiology_centers', 'medical_laboratories']) {
      expect(sources).not.toContain(`${table}(name_i18n`);
    }
    expect(sources).toContain('hospitals(display_name_i18n');
  });

  it('keeps internal account identifiers out of normal Admin forms', () => {
    const form = read('../src/features/admin/admin-record-form.tsx');
    expect(form).toContain("field.name === 'user_id' || field.name === 'owner_user_id'");
    expect(form).toContain("field.name === 'provider_id'");
    expect(form).toContain('lookups.providers');
  });
});
