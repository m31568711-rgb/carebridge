import {z} from 'zod';

const optional=(max:number)=>z.string().trim().max(max).optional().default('');
export const financeItemSchema=z.object({booking_id:z.uuid(),currency:z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),due_date:z.iso.date().optional().or(z.literal('')),service_category:z.enum(['DOCTOR','HOSPITAL','PROCEDURE','LABORATORY','RADIOLOGY','ACCOMMODATION','TRAVEL','TRANSPORT','OTHER']),description:z.string().trim().min(2).max(500),quantity:z.coerce.number().positive().max(100000),base_unit_amount:z.coerce.number().min(0).max(999999999),notes:optional(4000)});
export const financeItemUpdateSchema=financeItemSchema.extend({invoice_id:z.uuid(),item_id:z.uuid()});
export const invoiceActionSchema=z.object({invoice_id:z.uuid(),booking_id:z.uuid()});
export const customerPaymentSchema=invoiceActionSchema.extend({amount:z.coerce.number().positive().max(999999999),paid_at:z.iso.datetime({local:true}),method:z.enum(['BANK_TRANSFER','CASH','CARD_AT_PROVIDER','OTHER']),reference_number:optional(180)});
