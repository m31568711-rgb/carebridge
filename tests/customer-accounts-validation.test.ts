import {describe,expect,it} from 'vitest';
import {financeItemSchema} from '@/src/features/customer-accounts/validation';

const booking_id='3b241101-e2bb-4255-8caf-4136c566a962';
describe('customer accounts finance validation',()=>{
 it('normalizes a 30% billable service input without hardcoding a currency',()=>{const parsed=financeItemSchema.safeParse({booking_id,currency:'eur',due_date:'2026-10-10',service_category:'ACCOMMODATION',description:'Fictional recovery accommodation',quantity:'2',base_unit_amount:'1000',notes:''});expect(parsed.success).toBe(true);if(parsed.success){expect(parsed.data.currency).toBe('EUR');expect(parsed.data.base_unit_amount*parsed.data.quantity*1.3).toBe(2600);}});
 it('rejects invalid financial input',()=>{const base={booking_id,currency:'USD',service_category:'DOCTOR',description:'Clinical consultation',quantity:'1',base_unit_amount:'200',notes:''};expect(financeItemSchema.safeParse({...base,base_unit_amount:'-1'}).success).toBe(false);expect(financeItemSchema.safeParse({...base,currency:'US'}).success).toBe(false);expect(financeItemSchema.safeParse({...base,service_category:'INTERNAL'}).success).toBe(false);});
});
