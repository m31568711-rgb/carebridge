import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const seed = readFileSync(fileURLToPath(new URL('../supabase/seed.sql', import.meta.url)), 'utf8');

describe('fictional Part 2 seed', () => {
  it('uses reserved invalid contacts and labels provider records as demonstrations', () => {
    expect(seed).toContain('example.invalid');
    expect(seed).toContain('Fictional clinician profile');
    expect(seed).toContain('Fictional international-care provider');
  });

  it('creates the requested deterministic provider volumes', () => {
    expect(seed).toContain('from generate_series(1,24) gs');
    expect(seed).toContain("(10,'Paris Passage Pharmacy'");
    expect(seed).toContain("(7,'Nairobi Acacia Medical Demo'");
  });

  it('models languages and multiple hospital assignments relationally', () => {
    expect(seed).toContain('insert into public.doctor_languages');
    expect(seed).toContain("'Visiting consultant',false");
  });
});

describe('fictional Part 3 provider seed', () => {
  it('adds deterministic radiology and laboratory providers with coordinates', () => {
    expect(seed).toContain('insert into public.radiology_centers');
    expect(seed).toContain('insert into public.medical_laboratories');
    expect(seed).toContain('33.575000, -7.595000');
    expect(seed).toContain('14.710000, -17.460000');
  });

  it('normalizes diagnostic specialties and keeps non-verified demos out of discovery', () => {
    expect(seed).toContain('insert into public.radiology_center_specialties');
    expect(seed).toContain('insert into public.medical_laboratory_specialties');
    expect(seed).toContain("'ACTIVE', 'PENDING_REVIEW'");
  });
});

describe('fictional Part 5 templates',()=>{it('documents local and optional international coordination without auth-dependent seed users',()=>{expect(seed).toContain("'part5.demo_templates'");expect(seed).toContain('"journeyType":"LOCAL_CARE"');expect(seed).toContain('"accommodationMode":"NOT_REQUIRED"');expect(seed).toContain('"accommodationMode":"COORDINATED"');});});
describe('fictional Part 6 templates',()=>{it('keeps operational medical examples fictional and auth-independent',()=>{expect(seed).toContain("'part6.demo_templates'");expect(seed).toContain('CareBridge Demo Medicine');expect(seed).toContain('CareBridge Demo Blood Panel');expect(seed).toContain('CareBridge Demo Ultrasound');});});
