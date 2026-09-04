import{describe,expect,it}from'vitest';import{zonedLocalDateTimeToIso}from'@/src/lib/datetime/timezone';
describe('reminder timezone conversion',()=>{
 it('keeps UTC wall time unchanged',()=>expect(zonedLocalDateTimeToIso('2026-01-15T10:30','UTC')).toBe('2026-01-15T10:30:00.000Z'));
 it('converts a selected IANA timezone rather than the browser timezone',()=>expect(zonedLocalDateTimeToIso('2026-01-15T10:30','America/New_York')).toBe('2026-01-15T15:30:00.000Z'));
 it('rejects missing daylight-saving wall times',()=>expect(()=>zonedLocalDateTimeToIso('2026-03-08T02:30','America/New_York')).toThrow());
});
