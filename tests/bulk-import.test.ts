import {describe,expect,it} from 'vitest';
import {bulkImportColumns,bulkImportEntities,slugifyImport} from '@/src/features/admin/bulk-import';

describe('Admin bulk import business schema',()=>{
  it('supports each safe provider entity without exposing UUID columns',()=>{expect(bulkImportEntities).toEqual(['hospitals','doctors','pharmacies','medical_laboratories','radiology_centers']);for(const entity of bulkImportEntities)expect(bulkImportColumns[entity].some(column=>column.key.endsWith('_id'))).toBe(false);});
  it('uses business references for doctor relationships',()=>{expect(bulkImportColumns.doctors.map(column=>column.key)).toEqual(expect.arrayContaining(['specialty','hospital','country_code']));});
  it('creates stable portable slugs',()=>{expect(slugifyImport('CareBridge Demo Hospital')).toBe('carebridge-demo-hospital');expect(slugifyImport('  Medical Center 2026 ')).toBe('medical-center-2026');});
});
