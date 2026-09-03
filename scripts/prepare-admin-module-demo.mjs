import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN']) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
});
if (!keyResponse.ok) throw new Error(`Could not obtain CareBridge-Dev service access (${keyResponse.status})`);
const keys = await keyResponse.json();
const serviceKey = keys.find((key) => key.name === 'service_role')?.api_key ?? keys.find((key) => key.type === 'legacy' && key.name !== 'anon')?.api_key;
if (!serviceKey) throw new Error('CareBridge-Dev service role is unavailable.');
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const browser = () => createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const assert = (condition, message) => { if (!condition) throw new Error(`Demo preparation failed: ${message}`); };
const sql = async (query) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`CareBridge-Dev SQL operation failed (${response.status})`);
  return response.json();
};

const usersResult = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersResult.error) throw usersResult.error;
const usersByEmail = new Map(usersResult.data.users.map((user) => [user.email?.toLowerCase(), user]));
const { data: adminRole } = await service.from('user_roles').select('user_id').in('role', ['SUPER_ADMIN', 'ADMIN']).limit(1).maybeSingle();
assert(adminRole?.user_id, 'a persistent Admin or SUPER_ADMIN is required');
const persistentAdminId = adminRole.user_id;

const tempEmail = `carebridge-demo-preparer-${Date.now()}@example.test`;
const tempPassword = `Qa!${crypto.randomUUID()}Aa1`;
let tempAdminId;
try {
  const createdAdmin = await service.auth.admin.createUser({ email: tempEmail, password: tempPassword, email_confirm: true, user_metadata: { first_name: 'Demo', last_name: 'Preparer' } });
  if (createdAdmin.error || !createdAdmin.data.user) throw createdAdmin.error ?? new Error('Could not create temporary administrator.');
  tempAdminId = createdAdmin.data.user.id;
  await service.from('user_roles').delete().eq('user_id', tempAdminId);
  const roleResult = await service.from('user_roles').insert({ user_id: tempAdminId, role: 'SUPER_ADMIN', granted_by: persistentAdminId });
  if (roleResult.error) throw roleResult.error;
  const admin = browser();
  const login = await admin.auth.signInWithPassword({ email: tempEmail, password: tempPassword });
  if (login.error || !login.data.session) throw login.error ?? new Error('Temporary administrator login failed.');

  const [{ data: hospitals }, { data: laboratories }, { data: radiologyCenters }] = await Promise.all([
    admin.from('hospitals').select('id').eq('status', 'ACTIVE').limit(2),
    admin.from('medical_laboratories').select('id').eq('status', 'ACTIVE').limit(2),
    admin.from('radiology_centers').select('id').eq('status', 'ACTIVE').limit(2),
  ]);
  assert(hospitals?.length && laboratories?.length && radiologyCenters?.length, 'provider master data is required');

  const accountScenarios = [
    { accountType: 'patients', fullName: 'Layla Hassan Demo', email: 'demo.patient.layla@carebridge.test', phone: '+20 100 555 0101', dateOfBirth: '1988-04-17', gender: 'FEMALE' },
    { accountType: 'patients', fullName: 'Omar Nabil Demo', email: 'demo.patient.omar@carebridge.test', phone: '+20 100 555 0102', dateOfBirth: '1979-11-03', gender: 'MALE' },
    { accountType: 'doctors', fullName: 'Dr Nadia Karim Demo', email: 'demo.doctor.nadia@carebridge.test', phone: '+20 100 555 0201' },
    { accountType: 'doctors', fullName: 'Dr Youssef Adel Demo', email: 'demo.doctor.youssef@carebridge.test', phone: '+20 100 555 0202' },
    { accountType: 'provider_staff', fullName: 'Salma Farid Demo', email: 'demo.provider.salma@carebridge.test', phone: '+20 100 555 0301', relationshipId: hospitals[0].id, staffRole: 'HOSPITAL_ADMIN' },
    { accountType: 'provider_staff', fullName: 'Karim Samy Demo', email: 'demo.provider.karim@carebridge.test', phone: '+20 100 555 0302', relationshipId: hospitals.at(1)?.id ?? hospitals[0].id, staffRole: 'HOSPITAL_COORDINATOR' },
    { accountType: 'laboratory_staff', fullName: 'Hana Amin Demo', email: 'demo.lab.hana@carebridge.test', phone: '+20 100 555 0401', relationshipId: laboratories[0].id },
    { accountType: 'laboratory_staff', fullName: 'Fadi Mansour Demo', email: 'demo.lab.fadi@carebridge.test', phone: '+20 100 555 0402', relationshipId: laboratories.at(1)?.id ?? laboratories[0].id },
    { accountType: 'radiology_staff', fullName: 'Mariam Lotfy Demo', email: 'demo.radiology.mariam@carebridge.test', phone: '+20 100 555 0501', relationshipId: radiologyCenters[0].id },
    { accountType: 'radiology_staff', fullName: 'Samir Riad Demo', email: 'demo.radiology.samir@carebridge.test', phone: '+20 100 555 0502', relationshipId: radiologyCenters.at(1)?.id ?? radiologyCenters[0].id },
  ];
  let createdAccounts = 0;
  for (const scenario of accountScenarios) {
    if (usersByEmail.has(scenario.email)) continue;
    const response = await fetch(`${url}/functions/v1/admin-account-management`, {
      method: 'POST',
      headers: { apikey: publishableKey, Authorization: `Bearer ${login.data.session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scenario, password: `Qa!${crypto.randomUUID()}Aa1`, locale: 'en' }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Could not create ${scenario.accountType} demo record: ${body.error ?? response.status}`);
    }
    createdAccounts += 1;
  }

  const { data: cities, error: cityError } = await admin.from('cities').select('id').eq('is_active', true).limit(3);
  if (cityError || !cities?.length) throw cityError ?? new Error('No active cities available.');
  const properties = [
    { id: 'a1000000-0000-4000-8000-000000000001', property_name: 'Nile Serenity Recovery Hotel', city_id: cities[0].id, location_address: '12 Fictional Corniche Avenue, CareBridge Demo District', latitude: 30.044400, longitude: 31.235700, notes: 'Fictional recovery-friendly hotel near the care team.', is_active: true, created_by: persistentAdminId },
    { id: 'a1000000-0000-4000-8000-000000000002', property_name: 'Lotus Medical Residence', city_id: cities.at(1)?.id ?? cities[0].id, location_address: '8 Fictional Wellness Street, CareBridge Demo District', latitude: 30.056100, longitude: 31.239400, notes: 'Fictional serviced residence for longer recovery stays.', is_active: true, created_by: persistentAdminId },
    { id: 'a1000000-0000-4000-8000-000000000003', property_name: 'Harbor Family Suites', city_id: cities.at(2)?.id ?? cities[0].id, location_address: '24 Fictional Harbor Road, CareBridge Demo District', latitude: 31.200100, longitude: 29.918700, notes: 'Fictional family accommodation with accessible rooms.', is_active: true, created_by: persistentAdminId },
  ];
  const propertyResult = await admin.from('accommodation_properties').upsert(properties, { onConflict: 'id' });
  if (propertyResult.error) throw propertyResult.error;
  const options = [
    { id: 'b1000000-0000-4000-8000-000000000001', property_id: properties[0].id, room_type: 'Recovery King Room', available_rooms: 12, price_per_night: 145, currency: 'USD', meal_plan: 'Full board', wellness_services: ['Recovery meals', 'Wheelchair assistance'], notes: 'Quiet-floor room.', is_active: true, created_by: persistentAdminId },
    { id: 'b1000000-0000-4000-8000-000000000002', property_id: properties[0].id, room_type: 'Companion Twin Room', available_rooms: 8, price_per_night: 175, currency: 'USD', meal_plan: 'Breakfast and dinner', wellness_services: ['Airport welcome'], notes: 'Suitable for patient and companion.', is_active: true, created_by: persistentAdminId },
    { id: 'b1000000-0000-4000-8000-000000000003', property_id: properties[1].id, room_type: 'One-bedroom Medical Suite', available_rooms: 6, price_per_night: 210, currency: 'EUR', meal_plan: 'Recovery meal plan', wellness_services: ['Physiotherapy visit', 'Medication fridge'], notes: 'Fictional extended-stay suite.', is_active: true, created_by: persistentAdminId },
    { id: 'b1000000-0000-4000-8000-000000000004', property_id: properties[2].id, room_type: 'Accessible Family Suite', available_rooms: 5, price_per_night: 6800, currency: 'EGP', meal_plan: 'Breakfast', wellness_services: ['Accessible transport coordination'], notes: 'Fictional accessible family suite.', is_active: true, created_by: persistentAdminId },
  ];
  const optionResult = await admin.from('accommodation_room_options').upsert(options, { onConflict: 'id' });
  if (optionResult.error) throw optionResult.error;

  const demoPatient = usersByEmail.get('demo.patient@carebridge.test');
  assert(demoPatient, 'the persistent demo patient account is required');
  const { data: journeys, error: journeyError } = await admin.from('bookings').select('id,patient_id,booking_reference').eq('patient_id', demoPatient.id).eq('journey_type', 'INTERNATIONAL_MEDICAL_TRAVEL').order('updated_at', { ascending: false }).limit(3);
  if (journeyError) throw journeyError;
  assert(journeys?.length, 'an international persistent demo journey is required');
  const additionalJourney = journeys.find((journey) => journey.booking_reference === 'CB-DEMO2026INTL2');
  const mainJourney = journeys.find((journey) => journey.booking_reference === 'CB-DEMO2026INTL');
  assert(additionalJourney && mainJourney, 'both persistent international demo journeys are required');
  const accommodationJourneys = [additionalJourney, mainJourney];
  const stayDates = [
    ['2026-10-12', '2026-10-19'],
    ['2026-11-04', '2026-11-09'],
  ];
  let accommodationCount = 0;
  for (const [index, journey] of accommodationJourneys.entries()) {
    const { data: existing } = await admin.from('accommodation_bookings').select('id').eq('id', `c1000000-0000-4000-8000-00000000000${index + 1}`).maybeSingle();
    if (existing) continue;
    const [checkIn, checkOut] = stayDates[index];
    const bookingResult = await admin.from('accommodation_bookings').insert({
      id: `c1000000-0000-4000-8000-00000000000${index + 1}`,
      booking_id: journey.id,
      patient_id: journey.patient_id,
      room_option_id: options[index].id,
      arrangement: index === 0 ? 'CAREBRIDGE_ARRANGED' : 'PATIENT_SELECTED',
      check_in_date: checkIn,
      check_out_date: checkOut,
      number_of_rooms: 1,
      guests: index === 0 ? 2 : 1,
      price_per_night: options[index].price_per_night,
      currency: options[index].currency,
      final_price: index === 0 ? 950 : null,
      status: index === 0 ? 'CONFIRMED' : 'CANCELLED',
      notes: 'Persistent fictional CareBridge client-demo stay.',
      created_by: persistentAdminId,
    });
    if (bookingResult.error) throw bookingResult.error;
    accommodationCount += 1;
  }

  const travelExamples = [additionalJourney].map((journey) => ({
    booking_id: journey.id,
    patient_id: journey.patient_id,
    travel_arrangement: 'CAREBRIDGE_ARRANGED',
    trip_type: 'ROUND_TRIP',
    origin_location: 'Cairo, Egypt',
    destination_location: 'Istanbul, Türkiye',
    outbound_departure_at: '2026-10-12T05:30:00Z',
    outbound_arrival_at: '2026-10-12T08:05:00Z',
    return_departure_at: '2026-10-24T12:10:00Z',
    return_arrival_at: '2026-10-24T14:20:00Z',
    origin_airport: 'CAI',
    destination_airport: 'IST',
    airline: 'CareBridge Demo Airways',
    outbound_flight_number: 'CB401',
    return_airline: 'CareBridge Demo Airways',
    return_flight_number: 'CB402',
    ticket_reference: 'CB-DEMO-TRAVEL-401',
    cabin_class: 'Economy',
    ticket_price: 740,
    ticket_currency: 'USD',
    booking_status: 'TICKETED',
    accommodation_mode: 'NOT_REQUIRED',
    travel_notes: 'Fictional CareBridge-arranged round trip.',
    updated_by: tempAdminId,
  }));
  if (travelExamples.length) {
    const travelResult = await admin.from('travel_plans').upsert(travelExamples, { onConflict: 'booking_id' });
    if (travelResult.error) throw travelResult.error;
  }
  const carebridgeJourney = additionalJourney;
  const { data: existingPassport } = await admin.from('patient_passports').select('patient_id').eq('patient_id', demoPatient.id).maybeSingle();
  if (!existingPassport && carebridgeJourney) {
    const passportResult = await admin.from('patient_passports').insert({
      patient_id: demoPatient.id,
      booking_id: carebridgeJourney.id,
      full_name_as_passport: 'CAREBRIDGE FICTIONAL PATIENT',
      passport_number: 'DEMO-PASSPORT-2031',
      nationality: 'Fictional demo nationality',
      date_of_birth: '1985-06-14',
      issue_date: '2026-01-10',
      expiry_date: '2031-01-09',
      updated_by: tempAdminId,
    });
    if (passportResult.error) throw passportResult.error;
  }

  const checks = await Promise.all([
    admin.rpc('admin_list_accounts', { requested_type: 'patients' }),
    admin.rpc('admin_list_accounts', { requested_type: 'doctors' }),
    admin.rpc('admin_list_accounts', { requested_type: 'provider_staff' }),
    admin.rpc('admin_list_accounts', { requested_type: 'laboratory_staff' }),
    admin.rpc('admin_list_accounts', { requested_type: 'radiology_staff' }),
    admin.from('accommodation_properties').select('id', { count: 'exact', head: true }),
    admin.from('accommodation_bookings').select('id', { count: 'exact', head: true }),
    admin.from('travel_plans').select('id', { count: 'exact', head: true }),
    admin.from('patient_passports').select('patient_id', { count: 'exact', head: true }),
  ]);
  assert(checks.every((result) => !result.error), 'all new Admin module data is readable through authenticated Admin access');
  await sql(`update public.user_roles set granted_by='${persistentAdminId}' where granted_by='${tempAdminId}'; update public.travel_plans set updated_by='${persistentAdminId}' where updated_by='${tempAdminId}'; update public.patient_passports set updated_by='${persistentAdminId}' where updated_by='${tempAdminId}';`);
  console.log(JSON.stringify({ createdAccounts, accountRows: checks.slice(0, 5).map((result) => result.data?.length ?? 0), accommodationProperties: checks[5].count, accommodationBookings: checks[6].count, travelPlans: checks[7].count, passportExamples: checks[8].count, accommodationBookingsAdded: accommodationCount }));
} finally {
  if (tempAdminId) await service.auth.admin.deleteUser(tempAdminId);
}
