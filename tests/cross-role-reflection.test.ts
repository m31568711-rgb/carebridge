import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe,expect,it } from 'vitest';

const read=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');
const data=read('../src/features/role-services/data.ts');
const ui=read('../src/features/role-services/role-services-ui.tsx');
const doctorServices=read('../app/[locale]/(portals)/doctor/services/page.tsx');
const doctorAccount=read('../app/[locale]/(portals)/doctor/account/page.tsx');
const providerServices=read('../app/[locale]/(portals)/provider/services/page.tsx');
const providerAccount=read('../app/[locale]/(portals)/provider/account/page.tsx');

describe('cross-role Journey workspaces',()=>{
  it('loads one RLS-scoped source of assigned Journey services',()=>{expect(data).toContain("rpc('my_assigned_journey_services')");});
  it('provides service and account routes for doctors and providers',()=>{for(const route of [doctorServices,doctorAccount,providerServices,providerAccount])expect(route).toContain('loadAssignedJourneyServices');});
  it('shows only provider-side agreed and settlement amounts',()=>{expect(ui).toContain('agreed_amount');expect(ui).toContain('settled_amount');expect(ui).toContain('Math.max(0,agreed-settled)');expect(ui).not.toContain('carebridge_fee');expect(ui).not.toContain('customer_total');});
  it('links assigned records to authorized booking and appointment details',()=>{expect(ui).toContain('booking_id');expect(ui).toContain('appointment_id');expect(ui).toContain('/appointments/');expect(ui).toContain('/bookings/');});
});
