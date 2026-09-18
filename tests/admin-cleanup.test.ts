import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { adminModules, isAdminModuleKey } from '../src/features/admin/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAdminRecord } from '../src/features/admin/data';
import { formatCell } from '../src/features/admin/format';
describe('Admin cleanup regression', () => {
  it('retires only requested management routes while retaining backend metadata', () => {
    for (const key of ['provider_documents','provider_accreditations','doctor_languages'] as const) {
      expect(isAdminModuleKey(key)).toBe(false);
      expect(adminModules[key].table).toBe(key);
    }
    for (const key of ['hospitals','doctors','medical_laboratories','radiology_centers']) expect(isAdminModuleKey(key)).toBe(true);
  });
  it('never displays a partial internal UUID for an unresolved relationship', () => {
    for (const locale of ['en','fr','ar'] as const) expect(formatCell('hospital_id','d6300000-0000-4000-8000-000000000001',locale,{})).toBe('\u2014');
  });
  it('loads hospital-wide procedures using an IS NULL branch filter', async () => {
    const builder = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({data:{hospital_id:'hospital',branch_id:null,treatment_id:'treatment'},error:null}) };
    builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.is.mockReturnValue(builder);
    const client = {from:vi.fn().mockReturnValue(builder)} as unknown as SupabaseClient;
    const row = await loadAdminRecord(client,adminModules.hospital_treatments,'hospital||treatment');
    expect(builder.is).toHaveBeenCalledWith('branch_id',null);
    expect(builder.eq).toHaveBeenCalledWith('hospital_id','hospital');
    expect(builder.eq).toHaveBeenCalledWith('treatment_id','treatment');
    expect(row?.branch_id).toBeNull();
  });
  it('serves SPA deep links without the canonical index.html redirect', () => {
    const worker = readFileSync('scripts/prepare-spa-worker.mjs','utf8');
    expect(worker).toContain("new URL('/', request.url)");
    expect(worker).not.toContain("new URL('/index.html', request.url)");
  });
  it('repairs diagnostic labels without widening catalog access', () => {
    const sql = readFileSync('supabase/migrations/202609180001_admin_journey_catalog_columns.sql','utf8');
    expect(sql).toContain('l.display_name_i18n');
    expect(sql).toContain('r.display_name_i18n');
    expect(sql).not.toContain('l.name_i18n');
    expect(sql).toContain("has_admin_privilege('bookings.manage')");
    expect(sql).toContain("set search_path=''");
    expect(sql).toContain('from public,anon');
  });
});
