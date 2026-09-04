import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN']) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const managementSql = async (query) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Management SQL failed (${response.status})`);
  return response.json();
};
const keys = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
}).then((response) => {
  if (!response.ok) throw new Error(`API key lookup failed (${response.status})`);
  return response.json();
});
const serviceKey = keys.find((entry) => entry.name === 'service_role')?.api_key
  ?? keys.find((entry) => entry.type === 'legacy' && entry.name !== 'anon')?.api_key;
if (!serviceKey) throw new Error('Service role key is unavailable');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const newClient = () => createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const assert = (condition, message) => { if (!condition) throw new Error(`Patient Journey validation failed: ${message}`); };
const run = Date.now();
const password = `Qa!${crypto.randomUUID()}Aa1`;
const users = [];
const journeys = [];

async function createUser(label) {
  const email = `patient-journey-${label.toLowerCase()}-${run}@example.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: 'Portal', last_name: label } });
  if (error || !data.user) throw error ?? new Error('Temporary user creation failed');
  users.push(data.user.id);
  const api = newClient();
  const login = await api.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  return { id: data.user.id, email, api };
}

try {
  const [patient, other, admin] = await Promise.all(['Patient', 'Other', 'Admin'].map(createUser));
  await service.from('user_roles').delete().eq('user_id', admin.id);
  const role = await service.from('user_roles').insert({ user_id: admin.id, role: 'SUPER_ADMIN', granted_by: admin.id });
  if (role.error) throw role.error;
  await admin.api.auth.signOut();
  const relogin = await admin.api.auth.signInWithPassword({ email: admin.email, password });
  if (relogin.error) throw relogin.error;

  const options = await patient.api.from('hospital_treatments')
    .select('hospital_id,branch_id,treatment_id,starting_price,currency,hospital:hospitals!inner(status,is_verified)')
    .eq('status', 'ACTIVE').not('starting_price', 'is', null).not('currency', 'is', null).limit(20);
  if (options.error) throw options.error;
  const option = (options.data ?? []).find((entry) => entry.hospital?.status === 'ACTIVE' && entry.hospital?.is_verified);
  assert(option, 'an active priced hospital treatment exists');

  let result = await admin.api.rpc('create_admin_care_journey', {
    target_patient: patient.id, target_type: 'INTERNATIONAL_MEDICAL_TRAVEL',
    target_start: '2035-06-10', target_end: '2035-06-24', target_notes: 'Fictional Phase 2 live validation',
  });
  if (result.error) throw result.error;
  const journey = result.data;
  journeys.push(journey);
  result = await admin.api.from('bookings').update({ journey_status: 'PLANNING' }).eq('id', journey);
  if (result.error) throw result.error;
  result = await admin.api.from('journey_services').insert({
    booking_id: journey, service_type: 'HOSPITAL_PROCEDURE', selection_state: 'PATIENT_TO_CHOOSE', status: 'PLANNED',
    title: 'Patient-selected treatment provider', created_by: admin.id,
  }).select('id').single();
  if (result.error) throw result.error;
  const serviceId = result.data.id;

  const directUpdate = await patient.api.from('journey_services').update({ hospital_id: option.hospital_id }).eq('id', serviceId).select();
  assert(Boolean(directUpdate.error), 'direct patient edits are denied');
  const crossRead = await other.api.from('journey_services').select('id').eq('id', serviceId);
  assert((crossRead.data ?? []).length === 0, 'cross-patient service reads are isolated');
  const crossSelect = await other.api.rpc('select_patient_journey_hospital', {
    target_service_id: serviceId, target_hospital_id: option.hospital_id,
    target_treatment_id: option.treatment_id, target_branch_id: option.branch_id,
  });
  assert(Boolean(crossSelect.error), 'another patient cannot select a provider');

  const selection = await patient.api.rpc('select_patient_journey_hospital', {
    target_service_id: serviceId, target_hospital_id: option.hospital_id,
    target_treatment_id: option.treatment_id, target_branch_id: option.branch_id,
  });
  if (selection.error) throw selection.error;
  const selected = await patient.api.from('journey_services')
    .select('hospital_id,treatment_id,selected_price,currency,selection_state,status').eq('id', serviceId).single();
  if (selected.error) throw selected.error;
  assert(selected.data.selection_state === 'PATIENT_SELECTED' && selected.data.status === 'REQUESTED', 'provider selection state is persisted');
  assert(Number(selected.data.selected_price) === Number(option.starting_price) && selected.data.currency === option.currency, 'configured price and currency are snapshotted');
  const duplicate = await patient.api.rpc('select_patient_journey_hospital', {
    target_service_id: serviceId, target_hospital_id: option.hospital_id,
    target_treatment_id: option.treatment_id, target_branch_id: option.branch_id,
  });
  assert(Boolean(duplicate.error), 'a second provider selection is rejected');

  const roomOptions = await patient.api.from('accommodation_room_options')
    .select('id,price_per_night,currency,available_rooms,property:accommodation_properties!inner(is_active)')
    .eq('is_active', true).gt('available_rooms', 0).limit(20);
  if (roomOptions.error) throw roomOptions.error;
  const room = (roomOptions.data ?? []).find((entry) => entry.property?.is_active);
  assert(room, 'an active accommodation option exists');
  const prematureStay = await patient.api.rpc('reserve_accommodation', {
    target_booking_id: journey, target_room_option_id: room.id, target_arrangement: 'PATIENT_SELECTED',
    target_check_in: '2035-06-10', target_check_out: '2035-06-13', target_rooms: 1, target_guests: 1,
  });
  assert(Boolean(prematureStay.error), 'accommodation cannot be chosen before Admin assigns patient choice');
  const preference = await admin.api.from('journey_accommodation_preferences').insert({
    booking_id: journey, patient_id: patient.id, arrangement: 'PATIENT_WILL_CHOOSE', updated_by: admin.id,
  });
  if (preference.error) throw preference.error;
  const stay = await patient.api.rpc('reserve_accommodation', {
    target_booking_id: journey, target_room_option_id: room.id, target_arrangement: 'PATIENT_SELECTED',
    target_check_in: '2035-06-10', target_check_out: '2035-06-13', target_rooms: 1, target_guests: 1,
    target_final_price: null, target_notes: 'Fictional validation stay',
  });
  if (stay.error) throw stay.error;
  const savedStay = await patient.api.from('accommodation_bookings')
    .select('status,price_per_night,currency,total_amount').eq('id', stay.data).single();
  if (savedStay.error) throw savedStay.error;
  assert(savedStay.data.status === 'HELD', 'patient accommodation is held for review');
  assert(Number(savedStay.data.price_per_night) === Number(room.price_per_night) && savedStay.data.currency === room.currency, 'room price and currency are snapshotted');
  const duplicateStay = await patient.api.rpc('reserve_accommodation', {
    target_booking_id: journey, target_room_option_id: room.id, target_arrangement: 'PATIENT_SELECTED',
    target_check_in: '2035-06-14', target_check_out: '2035-06-16', target_rooms: 1, target_guests: 1,
  });
  assert(Boolean(duplicateStay.error), 'a conflicting second accommodation is rejected');

  const history = await patient.api.rpc('get_patient_journey_encounter_history', { target_booking_id: journey });
  if (history.error) throw history.error;
  const otherHistory = await other.api.rpc('get_patient_journey_encounter_history', { target_booking_id: journey });
  assert(!otherHistory.error && (otherHistory.data ?? []).length === 0, 'cross-patient medical history is hidden');
  const notifications = await managementSql(`select recipient_id,type,related_entity_type,related_entity_id from public.notifications where related_entity_id='${journey}'`);
  assert(notifications.some((entry) => entry.type === 'journey.patient_selected' && entry.related_entity_type === 'booking'), 'provider selection emits a linked Admin notification');
  assert(notifications.some((entry) => entry.type.startsWith('accommodation.') && entry.related_entity_type === 'booking'), 'accommodation request emits a linked notification');

  console.log('Patient Journey Phase 2 live validation passed: ownership/RLS, provider choice, dynamic price/currency, duplicate prevention, accommodation assignment/capacity path, safe medical history, and linked notifications.');
} finally {
  if (journeys.length) await managementSql(`delete from public.bookings where id in (${journeys.map((id) => `'${id}'`).join(',')})`);
  for (const id of users) await service.auth.admin.deleteUser(id);
}
