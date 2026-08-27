import { describe, expect, it } from 'vitest';
import { caseDocumentSchema, medicalCaseSchema, recommendationSchema, safeObjectFilename } from '@/src/features/cases/validation';

describe('medical case validation', () => {
  it('accepts a specialty-led case without any patient treatment field', () => {
    const result = medicalCaseSchema.safeParse({ specialty_id: '3b241101-e2bb-4255-8caf-4136c566a962', title: 'Persistent knee pain', description: 'Pain has continued for several months.', symptoms_notes: '', preferred_country_id: '', preferred_city_id: '', location_preference: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('treatment_id');
  });

  it('requires a doctor recommendation to select a treatment with clinical notes', () => {
    expect(recommendationSchema.safeParse({ treatment_id: '', recommendation_notes: 'short', next_steps: '' }).success).toBe(false);
  });

  it('constrains document metadata and sanitizes object names', () => {
    expect(caseDocumentSchema.safeParse({ document_type: 'EXECUTABLE', notes: '' }).success).toBe(false);
    expect(safeObjectFilename('../../My Scan (final).PDF')).toBe('my-scan-final.pdf');
  });
});
