import {z} from 'zod';

const uuid=z.string().uuid();
const optionalText=(max:number)=>z.string().trim().max(max).optional().transform(v=>v||null);

export const encounterSchema=z.object({booking_id:uuid,appointment_id:z.union([uuid,z.literal('')]).optional(),encountered_at:z.string().min(1),clinical_notes:optionalText(12000),assessment:optionalText(8000),diagnosis_summary:optionalText(4000),treatment_progress:optionalText(4000),next_steps:optionalText(4000),follow_up_recommendation:optionalText(2000),status:z.enum(['OPEN','COMPLETED'])});
export const prescriptionSchema=z.object({booking_id:uuid,appointment_id:z.union([uuid,z.literal('')]).optional(),instructions:optionalText(4000),notes:optionalText(4000),medication_name:z.string().trim().min(2).max(240),strength:optionalText(120),dosage:z.string().trim().min(1).max(180),frequency:z.string().trim().min(1).max(180),route:optionalText(120),duration:optionalText(180),item_instructions:optionalText(1000)});
export const orderSchema=z.object({booking_id:uuid,provider_id:uuid,appointment_id:z.union([uuid,z.literal('')]).optional(),encounter_id:z.union([uuid,z.literal('')]).optional(),priority:z.enum(['ROUTINE','URGENT']),requested_name:z.string().trim().min(2).max(240),modality:optionalText(80),body_area:optionalText(180),clinical_instructions:optionalText(4000)});
export const followUpSchema=z.object({booking_id:uuid,encounter_id:z.union([uuid,z.literal('')]).optional(),appointment_id:z.union([uuid,z.literal('')]).optional(),recommended_date:z.union([z.iso.date(),z.literal('')]).optional(),window_end_date:z.union([z.iso.date(),z.literal('')]).optional(),recommendation:z.string().trim().min(2).max(2000)}).refine(v=>!v.recommended_date||!v.window_end_date||v.window_end_date>=v.recommended_date,{path:['window_end_date']});
export const resultSchema=z.object({order_id:uuid,kind:z.enum(['lab','radiology']),summary:optionalText(8000),notes:optionalText(8000),release:z.enum(['yes','no'])});
export const orderStatusSchema=z.object({order_id:uuid,kind:z.enum(['lab','radiology']),status:z.string().min(2).max(40)});
export const journeyStatusSchema=z.object({booking_id:uuid,status:z.enum(['CLINICAL_WORK_COMPLETED','FOLLOW_UP_PENDING','COMPLETED','CANCELLED'])});

export const clinicalFileSchema=z.custom<File>(v=>v instanceof File&&v.size>0).refine(v=>v.size<=25*1024*1024,'size').refine(v=>['application/pdf','image/jpeg','image/png','image/webp','application/dicom'].includes(v.type),'type');

