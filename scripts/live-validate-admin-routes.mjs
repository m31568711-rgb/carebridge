import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const baseUrl = (process.env.CAREBRIDGE_ROUTE_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
});
if (!keyResponse.ok) throw new Error(`Could not obtain temporary validation access (${keyResponse.status})`);
const keys = await keyResponse.json();
const serviceKey = keys.find((key) => key.name === 'service_role')?.api_key ?? keys.find((key) => key.type === 'legacy' && key.name !== 'anon')?.api_key;
if (!serviceKey) throw new Error('Service role is unavailable for temporary validation cleanup.');

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `carebridge-route-admin-${Date.now()}@example.test`;
const password = `Qa!${crypto.randomUUID()}Aa1`;
let userId;

try {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: 'Route', last_name: 'Validator' } });
  if (created.error || !created.data.user) throw created.error ?? new Error('Could not create route administrator.');
  userId = created.data.user.id;
  await service.from('user_roles').delete().eq('user_id', userId);
  const role = await service.from('user_roles').insert({ user_id: userId, role: 'SUPER_ADMIN', granted_by: userId });
  if (role.error) throw role.error;

  const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const login = await auth.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw login.error ?? new Error('Route administrator login failed.');
  const accountChecks = await Promise.all(['patients', 'doctors', 'provider_staff', 'laboratory_staff', 'radiology_staff'].map((requested_type) => auth.rpc('admin_list_accounts', { requested_type })));
  if (accountChecks.some((result) => result.error)) throw new Error('One or more Admin account data sources failed.');
  const [accommodation, travel, offers, bookings, doctorProgram] = await Promise.all([
    auth.from('accommodation_room_options').select('id,property:accommodation_properties(id,property_name,city:cities(name_i18n))').limit(1),
    auth.from('travel_plans').select('booking_id,booking:bookings(booking_reference)').limit(1),
    auth.from('offers').select('id,hospital:hospitals(display_name_i18n),pharmacy:pharmacies(display_name_i18n),radiology_center:radiology_centers(display_name_i18n),medical_laboratory:medical_laboratories(display_name_i18n)').limit(1),
    auth.from('bookings').select('id,hospital:hospitals(display_name_i18n),pharmacy:pharmacies(display_name_i18n),radiology_center:radiology_centers(display_name_i18n),medical_laboratory:medical_laboratories(display_name_i18n)').limit(1),
    auth.from('journey_services').select('id,hospital:hospitals(display_name_i18n)').limit(1),
  ]);
  if ([accommodation, travel, offers, bookings, doctorProgram].some((result) => result.error)) throw new Error('One or more Admin/provider relationship queries failed.');
  const [{ data: booking }, { data: medicalCase }, { data: offer }, { data: appointment }, { data: labOrder }, { data: radiologyOrder }] = await Promise.all([
    auth.from('bookings').select('id,patient_id').eq('booking_reference', 'CB-ADMINTEST26').maybeSingle(),
    auth.from('medical_cases').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    auth.from('offers').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    auth.from('appointments').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    auth.from('lab_orders').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    auth.from('radiology_orders').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!booking || !medicalCase || !offer || !appointment) throw new Error(`Persistent route-validation records are incomplete (booking=${Boolean(booking)}, case=${Boolean(medicalCase)}, offer=${Boolean(offer)}, appointment=${Boolean(appointment)}).`);
  const masterModules = ['countries','cities','specialties','treatments','hospitals','hospital_branches','hospital_specialties','hospital_treatments','doctors','doctor_specialties','doctor_languages','doctor_hospitals','pharmacies','radiology_centers','medical_laboratories','provider_documents','provider_accreditations'];
  const routes = [
    'admin', ...masterModules.map((module) => `admin/${module}`), 'admin/import', 'admin/journeys', `admin/journeys/${booking.id}`,
    'admin/customer-accounts', `admin/customer-accounts/${booking.patient_id}`,
    ...['patients', 'doctors', 'provider_staff', 'laboratory_staff', 'radiology_staff'].map((type) => `admin/accounts/${type}`),
    'admin/accommodation', 'admin/travel',
    'patient', 'patient/cases/new', `patient/cases/${medicalCase.id}`, 'patient/providers', 'patient/offers', `patient/offers/${offer.id}`,
    'patient/bookings', `patient/bookings/${booking.id}`, 'patient/appointments', `patient/appointments/${appointment.id}`,
    'patient/journeys', `patient/journeys/${booking.id}`, 'patient/accommodation', 'patient/travel', 'notifications',
    'doctor', 'doctor/cases', `doctor/cases/${medicalCase.id}`, 'doctor/bookings', `doctor/bookings/${booking.id}`, 'doctor/appointments', `doctor/appointments/${appointment.id}`, 'doctor/clinical',
    'provider', 'provider/offers', `provider/offers/${offer.id}`, 'provider/bookings', `provider/bookings/${booking.id}`, 'provider/appointments', `provider/appointments/${appointment.id}`, 'provider/diagnostics',
    ...(labOrder ? [`provider/diagnostics/lab/${labOrder.id}`] : []), ...(radiologyOrder ? [`provider/diagnostics/radiology/${radiologyOrder.id}`] : []),
  ];
  for (const locale of ['en', 'fr', 'ar']) {
    for (const path of routes) {
      const headers = {};
      if (process.env.CAREBRIDGE_SITE_BYPASS_TOKEN) headers['OAI-Sites-Authorization'] = `Bearer ${process.env.CAREBRIDGE_SITE_BYPASS_TOKEN}`;
      const response = await fetch(`${baseUrl}/${locale}/${path}`, { headers, redirect: 'manual' });
      const body = await response.text();
      if (!response.ok || !body.includes('id="root"') || /A server error occurred|Application error/i.test(body)) {
        throw new Error(`${locale}/${path} failed with HTTP ${response.status}`);
      }
    }
  }
  console.log(`All ${routes.length * 3} EN/FR/AR application route entry points and their authenticated live data sources loaded successfully from ${new URL(baseUrl).host}.`);
} finally {
  if (userId) await service.auth.admin.deleteUser(userId);
}
