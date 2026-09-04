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
const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } });
if (!keyResponse.ok) throw new Error(`Could not obtain temporary validation access (${keyResponse.status})`);
const keys = await keyResponse.json();
const serviceKey = keys.find((key) => key.name === 'service_role')?.api_key ?? keys.find((key) => key.type === 'legacy' && key.name !== 'anon')?.api_key;
if (!serviceKey) throw new Error('Service role is unavailable for temporary validation cleanup.');
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const browser = () => createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const run = Date.now();
const adminEmail = `carebridge-account-admin-${run}@example.test`;
const blockedEmail = `carebridge-account-blocked-${run}@example.test`;
const password = `Qa!${crypto.randomUUID()}Aa1`;
const createdIds = [];
const assert = (condition, message) => { if (!condition) throw new Error(`Admin account validation failed: ${message}`); };

try {
  const createdAdmin = await service.auth.admin.createUser({ email: adminEmail, password, email_confirm: true, user_metadata: { first_name: 'Account', last_name: 'Administrator' } });
  if (createdAdmin.error || !createdAdmin.data.user) throw createdAdmin.error ?? new Error('Could not create temporary administrator.');
  createdIds.push(createdAdmin.data.user.id);
  await service.from('user_roles').delete().eq('user_id', createdAdmin.data.user.id);
  const roleResult = await service.from('user_roles').insert({ user_id: createdAdmin.data.user.id, role: 'SUPER_ADMIN', granted_by: createdAdmin.data.user.id });
  if (roleResult.error) throw roleResult.error;

  const adminClient = browser();
  const adminLogin = await adminClient.auth.signInWithPassword({ email: adminEmail, password });
  if (adminLogin.error || !adminLogin.data.session) throw adminLogin.error ?? new Error('Temporary administrator login failed.');
  const [{ data: hospital }, { data: laboratory }, { data: radiology }] = await Promise.all([
    adminClient.from('hospitals').select('id').limit(1).single(),
    adminClient.from('medical_laboratories').select('id').limit(1).single(),
    adminClient.from('radiology_centers').select('id').limit(1).single(),
  ]);
  assert(hospital && laboratory && radiology, 'provider master data is available');
  const scenarios = [
    { accountType: 'patients', name: 'CareBridge Validation Patient', expectedRole: 'PATIENT', relationshipId: '', dateOfBirth: '1990-05-12', gender: 'FEMALE' },
    { accountType: 'doctors', name: 'CareBridge Validation Doctor', expectedRole: 'DOCTOR', relationshipId: '' },
    { accountType: 'provider_staff', name: 'CareBridge Validation Coordinator', expectedRole: 'HOSPITAL_COORDINATOR', relationshipId: hospital.id, staffRole: 'HOSPITAL_COORDINATOR' },
    { accountType: 'laboratory_staff', name: 'CareBridge Validation Laboratory', expectedRole: 'PROVIDER', relationshipId: laboratory.id },
    { accountType: 'radiology_staff', name: 'CareBridge Validation Radiology', expectedRole: 'PROVIDER', relationshipId: radiology.id },
  ];
  let patientLogin;
  let patientClient;
  for (const scenario of scenarios) {
    const email = `carebridge-account-${scenario.accountType}-${run}@example.test`;
    const createResponse = await fetch(`${url}/functions/v1/admin-account-management`, {
      method: 'POST',
      headers: { apikey: publishableKey, Authorization: `Bearer ${adminLogin.data.session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scenario, fullName: scenario.name, email, password, phone: '+20 100 000 0000', locale: 'en' }),
    });
    const createBody = await createResponse.json();
    if (!createResponse.ok) throw new Error(`Admin creation endpoint returned ${createResponse.status}: ${createBody.error ?? 'unknown error'}`);
    createdIds.push(createBody.userId);

    const accountClient = browser();
    const login = await accountClient.auth.signInWithPassword({ email, password });
    assert(!login.error && Boolean(login.data.user), `${scenario.accountType} account can sign in`);
    if (scenario.accountType === 'patients') { patientLogin = login; patientClient = accountClient; }
    const [{ data: profile }, { data: roles }, { data: accounts, error: listError }] = await Promise.all([
      accountClient.from('profiles').select('display_name,date_of_birth,gender,phone').eq('id', createBody.userId).single(),
      accountClient.from('user_roles').select('role').eq('user_id', createBody.userId),
      adminClient.rpc('admin_list_accounts', { requested_type: scenario.accountType }),
    ]);
    assert(profile?.display_name === scenario.name, `${scenario.accountType} profile is linked`);
    if (scenario.accountType === 'patients') assert(profile.date_of_birth === '1990-05-12' && profile.gender === 'FEMALE', 'patient demographics are linked');
    assert(roles?.length === 1 && roles[0].role === scenario.expectedRole, `${scenario.accountType} has exactly the expected role`);
    assert(!listError && accounts?.some((account) => account.user_id === createBody.userId && account.email === email), `${scenario.accountType} appears in its Admin list`);
    const updatedPhone = `+20 100 111 ${String(createdIds.length).padStart(4, '0')}`;
    const callAccountAction = (body) => fetch(`${url}/functions/v1/admin-account-management`, { method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${adminLogin.data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const profileUpdate = await callAccountAction({ action: 'update_profile', targetUserId: createBody.userId, accountType: scenario.accountType, fullName: `${scenario.name} Updated`, phone: updatedPhone, dateOfBirth: scenario.dateOfBirth, gender: scenario.gender });
    assert(profileUpdate.ok, `${scenario.accountType} Admin update endpoint succeeds`);
    const updatedProfile = await adminClient.from('profiles').select('display_name,phone').eq('id', createBody.userId).single();
    assert(updatedProfile.data?.display_name.endsWith('Updated') && updatedProfile.data?.phone === updatedPhone, `${scenario.accountType} Admin update persists`);
    const deactivated = await callAccountAction({ action: 'set_status', targetUserId: createBody.userId, accountStatus: 'SUSPENDED' });
    assert(deactivated.ok, `${scenario.accountType} can be deactivated without deleting its identity`);
    const suspended = await adminClient.from('profiles').select('account_status').eq('id', createBody.userId).single();
    assert(suspended.data?.account_status === 'SUSPENDED', `${scenario.accountType} deactivation persists`);
    await accountClient.auth.signOut();
    const blockedLogin = await accountClient.auth.signInWithPassword({ email, password });
    assert(Boolean(blockedLogin.error), `${scenario.accountType} suspended Auth login is denied`);
    const reactivated = await callAccountAction({ action: 'set_status', targetUserId: createBody.userId, accountStatus: 'ACTIVE' });
    assert(reactivated.ok, `${scenario.accountType} can be reactivated`);
    const restoredLogin = await accountClient.auth.signInWithPassword({ email, password });
    assert(!restoredLogin.error, `${scenario.accountType} Auth login is restored after activation`);
    if (scenario.accountType === 'doctors') assert((await adminClient.from('doctors').select('id').eq('user_id', createBody.userId)).data?.length === 1, 'doctor profile relationship is linked');
    if (scenario.accountType === 'provider_staff') assert((await adminClient.from('hospital_memberships').select('id').eq('user_id', createBody.userId).eq('hospital_id', scenario.relationshipId)).data?.length === 1, 'hospital membership is linked');
    if (scenario.accountType === 'laboratory_staff') assert((await adminClient.from('diagnostic_provider_memberships').select('id').eq('user_id', createBody.userId).eq('medical_laboratory_id', scenario.relationshipId)).data?.length === 1, 'laboratory membership is linked');
    if (scenario.accountType === 'radiology_staff') assert((await adminClient.from('diagnostic_provider_memberships').select('id').eq('user_id', createBody.userId).eq('radiology_center_id', scenario.relationshipId)).data?.length === 1, 'radiology membership is linked');
  }
  assert(patientLogin?.data.session && patientClient, 'patient session is available for denial test');
  const deniedList = await patientClient.rpc('admin_list_accounts', { requested_type: 'patients' });
  assert(Boolean(deniedList.error) && !deniedList.data, 'non-admin account listing is denied');

  const deniedResponse = await fetch(`${url}/functions/v1/admin-account-management`, {
    method: 'POST',
    headers: { apikey: publishableKey, Authorization: `Bearer ${patientLogin.data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountType: 'patients', fullName: 'Blocked Patient', email: blockedEmail, password, phone: '', dateOfBirth: '1991-01-01', gender: 'MALE', locale: 'en' }),
  });
  assert(deniedResponse.status === 403, 'non-admin account creation is denied');

  const publicClient = browser();
  const signup = await publicClient.auth.signUp({ email: blockedEmail, password });
  assert(Boolean(signup.error) && !signup.data.user, 'public self-registration is disabled');

  const users = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const demoEmails = new Set(users.data.users.filter((user) => user.email?.startsWith('demo.') && user.email.endsWith('@carebridge.test')).map((user) => user.email));
  assert(['demo.patient@carebridge.test', 'demo.doctor@carebridge.test', 'demo.provider@carebridge.test', 'demo.lab@carebridge.test', 'demo.radiology@carebridge.test'].every((email) => demoEmails.has(email)), 'persistent demo accounts remain available');
} finally {
  for (const userId of createdIds.reverse()) await service.auth.admin.deleteUser(userId);
}

console.log('All five Admin account types passed create, list/read, update, deactivate/reactivate, Auth/profile/role/provider linkage, role-based login, non-admin denial, public-signup denial, cleanup, and persistent demo-account preservation.');
