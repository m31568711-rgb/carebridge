import type { SupabaseClient } from '@supabase/supabase-js';

export interface AssignedJourneyService {
  service_id:string; booking_id:string; booking_reference:string; patient_name:string; journey_status:string;
  service_type:'DOCTOR_CONSULTATION'|'HOSPITAL_PROCEDURE'|'LABORATORY'|'RADIOLOGY'; service_title:string; service_status:string;
  planned_date:string|null; appointment_id:string|null; appointment_type:string|null; appointment_at:string|null;
  appointment_timezone:string|null; appointment_status:string|null; agreed_amount:number|null; currency:string|null;
  settled_amount:number|null; settlement_status:'PENDING'|'PARTIALLY_SETTLED'|'SETTLED'|'CANCELLED'|null;
}

export async function loadAssignedJourneyServices(supabase:SupabaseClient){
  const {data,error}=await supabase.rpc('my_assigned_journey_services');
  if(error)throw error;
  return (data??[]) as AssignedJourneyService[];
}
