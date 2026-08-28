import type {SupabaseClient} from '@supabase/supabase-js';

export type AppointmentStatus='REQUESTED'|'CONFIRMED'|'RESCHEDULED'|'COMPLETED'|'CANCELLED'|'NO_SHOW';
export interface AppointmentRecord{id:string;booking_id:string;patient_id:string;doctor_id:string|null;appointment_type:string;scheduled_at:string;timezone:string;duration_minutes:number;location_name:string;location_details:string|null;status:AppointmentStatus;instructions:string|null;patient_notes:string|null;provider_notes:string|null;booking?:{booking_reference:string;medical_case?:{title:string}|null}|null;doctor?:{display_name:string|null;first_name:string;last_name:string}|null}
export interface InvoiceRecord{id:string;invoice_number:string;booking_id:string;currency:string;total_amount:number;amount_paid:number;due_date:string|null;status:string;notes:string|null;items?:Array<{id:string;description:string;quantity:number;unit_amount:number;line_amount:number}>;payments?:Array<{id:string;amount:number;paid_at:string;method:string;reference_number:string|null}>}
export interface TravelPlan{id:string;arrival_at:string|null;departure_at:string|null;airline:string|null;arrival_flight_number:string|null;departure_flight_number:string|null;origin_airport:string|null;destination_airport:string|null;arrival_terminal:string|null;travel_notes:string|null;accommodation_mode:'NOT_REQUIRED'|'SELF_ARRANGED'|'COORDINATED';accommodation_name:string|null;accommodation_address:string|null;check_in_date:string|null;check_out_date:string|null;accommodation_reference:string|null;accommodation_notes:string|null;companion_name:string|null;companion_relationship:string|null;companion_contact:string|null;companion_notes:string|null}
export interface TransportRecord{id:string;transport_type:string;pickup_at:string;pickup_location:string;destination:string;provider_label:string|null;contact:string|null;status:string;notes:string|null}
export interface JourneyEvent{id:string;event_type:string;status_label:string|null;occurred_at:string}
export interface BookingOperations{appointments:AppointmentRecord[];invoices:InvoiceRecord[];travel:TravelPlan|null;transport:TransportRecord[];events:JourneyEvent[]}

export async function loadBookingOperations(supabase:SupabaseClient,bookingId:string):Promise<BookingOperations>{
 const [appointments,invoices,travel,transport,events]=await Promise.all([
  supabase.from('appointments').select('*,doctor:doctors(display_name,first_name,last_name)').eq('booking_id',bookingId).order('scheduled_at'),
  supabase.from('invoices').select('*,items:invoice_items(*),payments:payment_records(id,amount,paid_at,method,reference_number)').eq('booking_id',bookingId).order('created_at',{ascending:false}),
  supabase.from('travel_plans').select('*').eq('booking_id',bookingId).maybeSingle(),
  supabase.from('transport_arrangements').select('*').eq('booking_id',bookingId).order('pickup_at'),
  supabase.from('journey_events').select('id,event_type,status_label,occurred_at').eq('booking_id',bookingId).order('occurred_at',{ascending:false}).limit(100),
 ]);
 return{appointments:(appointments.data??[]) as unknown as AppointmentRecord[],invoices:(invoices.data??[]) as unknown as InvoiceRecord[],travel:travel.data as TravelPlan|null,transport:(transport.data??[]) as TransportRecord[],events:(events.data??[]) as JourneyEvent[]};
}
export async function loadAppointments(supabase:SupabaseClient,{page=1,pageSize=20,status,from,to}:{page?:number;pageSize?:number;status?:string;from?:string;to?:string}={}){let q=supabase.from('appointments').select('*,booking:bookings(booking_reference,medical_case:medical_cases(title)),doctor:doctors(display_name,first_name,last_name)',{count:'exact'}).order('scheduled_at').range((page-1)*pageSize,page*pageSize-1);if(status)q=q.eq('status',status);if(from)q=q.gte('scheduled_at',from);if(to)q=q.lte('scheduled_at',to);const{data,count}=await q;return{records:(data??[]) as unknown as AppointmentRecord[],count:count??0,page,pageSize};}
