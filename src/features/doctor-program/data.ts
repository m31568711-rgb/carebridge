import type {SupabaseClient} from '@supabase/supabase-js';
import type {Locale} from '@/src/i18n/config';
import {localized} from '@/src/features/cases/data';

export interface ProgramOption{id:string;label:string}
export interface ProgramService{id:string;service_type:string;status:string;title:string;notes:string|null;planned_date:string|null;treatment_id:string|null;hospital_id:string|null;appointment_id:string|null;treatment:{name_i18n:Record<string,string>}|null;hospital:{display_name_i18n:Record<string,string>}|null;appointment:{scheduled_at:string;status:string;location_name:string;instructions:string|null}|null}
export interface DoctorProgramData{treatments:ProgramOption[];hospitals:ProgramOption[];services:ProgramService[]}

export async function loadDoctorProgram(s:SupabaseClient,bookingId:string,locale:Locale):Promise<DoctorProgramData>{
 const booking=await s.from('bookings').select('case_id').eq('id',bookingId).maybeSingle();
 let specialtyId:string|null=null;
 if(booking.data?.case_id){const c=await s.from('medical_cases').select('specialty_id').eq('id',booking.data.case_id).maybeSingle();specialtyId=c.data?.specialty_id??null}
 let treatments=s.from('treatments').select('id,name_i18n').eq('status','ACTIVE').order('created_at').limit(300);
 if(specialtyId)treatments=treatments.eq('specialty_id',specialtyId);
 const[treatmentRows,hospitalRows,services]=await Promise.all([treatments,s.from('hospitals').select('id,display_name_i18n').eq('status','ACTIVE').eq('is_verified',true).order('legal_name').limit(300),s.from('journey_services').select('id,service_type,status,title,notes,planned_date,treatment_id,hospital_id,appointment_id,treatment:treatments(name_i18n),hospital:hospitals(display_name_i18n),appointment:appointments(scheduled_at,status,location_name,instructions)').eq('booking_id',bookingId).in('service_type',['DOCTOR_CONSULTATION','HOSPITAL_PROCEDURE']).order('created_at')]);
 return{treatments:(treatmentRows.data??[]).map(x=>({id:x.id,label:localized(x.name_i18n,locale)})),hospitals:(hospitalRows.data??[]).map(x=>({id:x.id,label:localized(x.display_name_i18n,locale)})),services:(services.data??[])as unknown as ProgramService[]};
}
