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
