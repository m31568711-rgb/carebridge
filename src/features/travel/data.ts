import type { SupabaseClient } from '@supabase/supabase-js';

export type Arrangement = 'NOT_REQUIRED'|'PATIENT_WILL_CHOOSE'|'PATIENT_SELECTED'|'CAREBRIDGE_ARRANGED';
export interface AccommodationProperty {id:string;property_name:string;location_address:string;city_id:string;notes:string|null;is_active:boolean;city:{name_i18n:Record<string,string>;country:{name_i18n:Record<string,string>}|null}|null;photos:Array<{id:string;object_path:string}>}
export interface AccommodationOption { id:string;property_id:string;room_type:string;available_rooms:number;price_per_night:number;currency:string;meal_plan:string;wellness_services:string[];notes:string|null;is_active:boolean;property:{id:string;property_name:string;location_address:string;city_id:string;is_active:boolean;city:{name_i18n:Record<string,string>;country:{name_i18n:Record<string,string>}|null}|null;photos:Array<{id:string;object_path:string}>}|null }
export interface AccommodationBooking { id:string;booking_id:string;patient_id:string;room_option_id:string;arrangement:Arrangement;check_in_date:string;check_out_date:string;number_of_rooms:number;guests:number;nights:number;price_per_night:number;currency:string;total_amount:number;final_price:number|null;status:'HELD'|'CONFIRMED'|'CHECKED_IN'|'COMPLETED'|'CANCELLED';notes:string|null;room_option?:AccommodationOption|null;booking?:JourneyChoice|null }
export interface JourneyChoice { id:string;booking_reference:string;patient_id:string;journey_type:'LOCAL_CARE'|'INTERNATIONAL_MEDICAL_TRAVEL';profile?:{display_name:string|null;first_name:string|null;last_name:string|null}|null;medical_case?:{title:string}|null }
export interface TravelPlan { id:string;booking_id:string;patient_id:string;travel_arrangement:'PATIENT_SELF_ARRANGED'|'CAREBRIDGE_ARRANGED';trip_type:'ONE_WAY'|'RETURN_ONLY'|'ROUND_TRIP';origin_location:string|null;destination_location:string|null;outbound_departure_at:string|null;outbound_arrival_at:string|null;return_departure_at:string|null;return_arrival_at:string|null;origin_airport:string|null;destination_airport:string|null;airline:string|null;outbound_flight_number:string|null;return_airline:string|null;return_flight_number:string|null;ticket_reference:string|null;cabin_class:string|null;ticket_price:number|null;ticket_currency:string|null;booking_status:string;travel_notes:string|null }
export interface Passport { patient_id:string;booking_id:string;full_name_as_passport:string;passport_number:string;nationality:string;date_of_birth:string;issue_date:string;expiry_date:string }
export interface TravelDocument {id:string;booking_id:string;patient_id:string;document_type:string;object_path:string;original_filename:string;created_at:string}

const optionSelect='*,property:accommodation_properties(id,property_name,location_address,city_id,is_active,city:cities(name_i18n,country:countries(name_i18n)),photos:accommodation_photos(id,object_path))';
const reservationSelect=`*,room_option:accommodation_room_options(${optionSelect}),booking:bookings(id,booking_reference,patient_id,journey_type,medical_case:medical_cases(title))`;
const journeySelect='id,booking_reference,patient_id,journey_type,medical_case:medical_cases(title)';

export async function loadAccommodationData(supabase:SupabaseClient, admin=false){
 const [options,properties,reservations,journeys,preferences,cities]=await Promise.all([
  supabase.from('accommodation_room_options').select(optionSelect).order('created_at',{ascending:false}).limit(200),
  supabase.from('accommodation_properties').select('id,property_name,location_address,city_id,notes,is_active,city:cities(name_i18n,country:countries(name_i18n)),photos:accommodation_photos(id,object_path)').order('created_at',{ascending:false}).limit(200),
  supabase.from('accommodation_bookings').select(reservationSelect).order('created_at',{ascending:false}).limit(200),
  supabase.from('bookings').select(journeySelect).eq('journey_type','INTERNATIONAL_MEDICAL_TRAVEL').order('updated_at',{ascending:false}).limit(200),
  supabase.from('journey_accommodation_preferences').select('*').limit(200),
  admin?supabase.from('cities').select('id,name_i18n,country:countries(name_i18n)').eq('is_active',true).order('name_i18n'):Promise.resolve({data:[]} as {data:unknown[]}),
 ]);
 const journeyRows=(journeys.data??[]) as unknown as JourneyChoice[];const ids=[...new Set(journeyRows.map(j=>j.patient_id))];const profileResult=ids.length?await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids):{data:[]};const profileMap=new Map(((profileResult.data??[]) as Array<{id:string;display_name:string|null;first_name:string|null;last_name:string|null}>).map(p=>[p.id,p]));for(const journey of journeyRows)journey.profile=profileMap.get(journey.patient_id)??null;
 return {options:(options.data??[]) as unknown as AccommodationOption[],properties:(properties.data??[]) as unknown as AccommodationProperty[],reservations:(reservations.data??[]) as unknown as AccommodationBooking[],journeys:journeyRows,preferences:(preferences.data??[]) as Array<{booking_id:string;patient_id:string;arrangement:Arrangement;notes:string|null}>,cities:(cities.data??[]) as unknown as Array<{id:string;name_i18n:Record<string,string>;country:{name_i18n:Record<string,string>}|null}>};
}

export async function loadTravelData(supabase:SupabaseClient){
 const [journeys,plans,passports,documents]=await Promise.all([
  supabase.from('bookings').select(journeySelect).eq('journey_type','INTERNATIONAL_MEDICAL_TRAVEL').order('updated_at',{ascending:false}).limit(200),
  supabase.from('travel_plans').select('*').order('updated_at',{ascending:false}).limit(200),
  supabase.from('patient_passports').select('*').limit(200),
  supabase.from('travel_documents').select('*').order('created_at',{ascending:false}).limit(200),
 ]);
 const journeyRows=(journeys.data??[]) as unknown as JourneyChoice[];const ids=[...new Set(journeyRows.map(j=>j.patient_id))];const profileResult=ids.length?await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids):{data:[]};const profileMap=new Map(((profileResult.data??[]) as Array<{id:string;display_name:string|null;first_name:string|null;last_name:string|null}>).map(p=>[p.id,p]));for(const journey of journeyRows)journey.profile=profileMap.get(journey.patient_id)??null;
 return {journeys:journeyRows,plans:(plans.data??[]) as unknown as TravelPlan[],passports:(passports.data??[]) as unknown as Passport[],documents:(documents.data??[]) as unknown as TravelDocument[]};
}
