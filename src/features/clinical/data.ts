import type {SupabaseClient} from '@supabase/supabase-js';

export interface Encounter{id:string;appointment_id:string|null;encountered_at:string;clinical_notes:string|null;assessment:string|null;diagnosis_summary:string|null;treatment_progress:string|null;next_steps:string|null;follow_up_recommendation:string|null;status:string}
export interface Prescription{id:string;status:string;issue_date:string|null;instructions:string|null;notes:string|null;items:Array<{id:string;medication_name:string;strength:string|null;dosage:string;frequency:string;route:string|null;duration:string|null;instructions:string|null;start_date:string|null;end_date:string|null;dose_times:string[]|null;schedule_timezone:string|null}>}
export interface ClinicalDocument{id:string;object_path:string;original_filename:string;mime_type:string;file_size_bytes:number}
export interface ClinicalAttachment extends ClinicalDocument{id:string;title:string;patient_visible:boolean;encounter_id:string|null;appointment_id:string|null;created_at:string}
export interface LabOrder{id:string;booking_id:string;patient_id:string;medical_laboratory_id:string;priority:string;status:string;clinical_instructions:string|null;ordered_at:string;tests:Array<{id:string;test_name:string;instructions:string|null}>;laboratory?:{name_i18n:Record<string,string>}|null;result?:{id:string;summary:string|null;result_notes:string|null;released_at:string|null;reviewed_at:string|null;documents:ClinicalDocument[]}|null;booking?:{booking_reference:string}|null}
export interface RadiologyOrder{id:string;booking_id:string;patient_id:string;radiology_center_id:string;study_name:string;modality:string|null;body_area:string|null;priority:string;status:string;clinical_instructions:string|null;ordered_at:string;center?:{name_i18n:Record<string,string>}|null;result?:{id:string;summary:string|null;report_notes:string|null;released_at:string|null;reviewed_at:string|null;documents:ClinicalDocument[]}|null;booking?:{booking_reference:string}|null}
export interface FollowUp{id:string;recommended_date:string|null;window_end_date:string|null;recommendation:string;completion_notes:string|null;status:string;appointment_id:string|null}
export interface ClinicalJourney{encounters:Encounter[];prescriptions:Prescription[];labOrders:LabOrder[];radiologyOrders:RadiologyOrder[];followUps:FollowUp[];attachments:ClinicalAttachment[]}

export async function loadClinicalJourney(s:SupabaseClient,bookingId:string,includeEncounters=false):Promise<ClinicalJourney>{
 const queries=[
  s.from('prescriptions').select('*,items:prescription_items(*)').eq('booking_id',bookingId).order('created_at',{ascending:false}),
  s.from('lab_orders').select('*,tests:lab_order_tests(*),laboratory:medical_laboratories(name_i18n),result:lab_results(*,documents:clinical_result_documents(*))').eq('booking_id',bookingId).order('ordered_at',{ascending:false}),
  s.from('radiology_orders').select('*,center:radiology_centers(name_i18n),result:radiology_results(*,documents:clinical_result_documents(*))').eq('booking_id',bookingId).order('ordered_at',{ascending:false}),
 s.from('clinical_follow_ups').select('*').eq('booking_id',bookingId).order('created_at',{ascending:false}),
  s.from('clinical_attachments').select('*').eq('booking_id',bookingId).order('created_at',{ascending:false}),
 ] as const;
 const [prescriptions,labs,radiology,followUps,attachments]=await Promise.all(queries);
 const encounters=includeEncounters?await s.from('clinical_encounters').select('*').eq('booking_id',bookingId).order('encountered_at',{ascending:false}):{data:[]};
 return{encounters:(encounters.data??[]) as unknown as Encounter[],prescriptions:(prescriptions.data??[]) as unknown as Prescription[],labOrders:(labs.data??[]) as unknown as LabOrder[],radiologyOrders:(radiology.data??[]) as unknown as RadiologyOrder[],followUps:(followUps.data??[]) as FollowUp[],attachments:(attachments.data??[]) as ClinicalAttachment[]};
}

export async function loadDiagnosticOrders(s:SupabaseClient){const[labs,radiology]=await Promise.all([s.from('lab_orders').select('*,tests:lab_order_tests(*),booking:bookings(booking_reference),result:lab_results(id,released_at)').order('ordered_at',{ascending:false}).limit(100),s.from('radiology_orders').select('*,booking:bookings(booking_reference),result:radiology_results(id,released_at)').order('ordered_at',{ascending:false}).limit(100)]);return{labs:(labs.data??[]) as unknown as LabOrder[],radiology:(radiology.data??[]) as unknown as RadiologyOrder[]};}
export async function loadDiagnosticOrder(s:SupabaseClient,kind:'lab'|'radiology',id:string){const table=kind==='lab'?'lab_orders':'radiology_orders';const select=kind==='lab'?'*,tests:lab_order_tests(*),booking:bookings(booking_reference),result:lab_results(*,documents:clinical_result_documents(*))':'*,booking:bookings(booking_reference),result:radiology_results(*,documents:clinical_result_documents(*))';const{data}=await s.from(table).select(select).eq('id',id).maybeSingle();return data as unknown as LabOrder|RadiologyOrder|null;}
