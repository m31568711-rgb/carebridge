// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- Supabase Edge Functions run in Deno and resolve npm: specifiers at deployment.
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

const accountTypes = ['patients', 'doctors', 'provider_staff', 'laboratory_staff', 'radiology_staff'] as const;
const genders = ['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
const hospitalRoles = ['HOSPITAL_ADMIN', 'HOSPITAL_COORDINATOR'] as const;
type AccountType = (typeof accountTypes)[number];

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function splitFullName(value: string) {
  const parts = value.trim().replace(/\s+/g, ' ').split(' ');
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return json({ error: 'Unauthorized.' }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Unauthorized.' }, 401);
  const actorId = userData.user.id;
  const { data: actorRoles } = await service.from('user_roles').select('role').eq('user_id', actorId).in('role', ['ADMIN', 'SUPER_ADMIN']);
  if (!actorRoles?.length) return json({ error: 'Administrator access is required.' }, 403);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.action === 'update_profile') {
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : '';
    const targetType = body.accountType as AccountType;
    const targetFullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
    const targetPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const targetBirth = typeof body.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth) ? body.dateOfBirth : null;
    const targetGender = genders.includes(body.gender as (typeof genders)[number]) ? body.gender as string : null;
    const names = splitFullName(targetFullName);
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId) || !accountTypes.includes(targetType) || !names.lastName || targetPhone.length > 40 || (targetType === 'patients' && (!targetBirth || !targetGender))) return json({ error: 'Review the account fields.' }, 400);
    const { error } = await service.from('profiles').update({ first_name: names.firstName, last_name: names.lastName, display_name: targetFullName, phone: targetPhone || null, ...(targetType === 'patients' ? { date_of_birth: targetBirth, gender: targetGender } : {}) }).eq('id', targetUserId);
    if (error) return json({ error: 'Could not update the account.' }, 400);
    await service.from('audit_logs').insert({ actor_id: actorId, action: 'UPDATE', entity_type: 'application_account', entity_id: targetUserId, metadata: { fields: targetType === 'patients' ? ['name','phone','date_of_birth','gender'] : ['name','phone'] } });
    return json({ userId: targetUserId });
  }
  if (body?.action === 'set_status') {
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : '';
    const accountStatus = body.accountStatus === 'ACTIVE' ? 'ACTIVE' : body.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : null;
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId) || !accountStatus || targetUserId === actorId) return json({ error: 'Invalid account status request.' }, 400);
    const { error: authError } = await service.auth.admin.updateUserById(targetUserId, { ban_duration: accountStatus === 'SUSPENDED' ? '876000h' : 'none' });
    if (authError) return json({ error: 'Could not update the account.' }, 400);
    const { error: profileError } = await service.from('profiles').update({ account_status: accountStatus }).eq('id', targetUserId);
    if (profileError) {
      await service.auth.admin.updateUserById(targetUserId, { ban_duration: accountStatus === 'SUSPENDED' ? 'none' : '876000h' });
      return json({ error: 'Could not update the account.' }, 400);
    }
    await service.from('audit_logs').insert({ actor_id: actorId, action: 'UPDATE', entity_type: 'application_account', entity_id: targetUserId, metadata: { account_status: accountStatus } });
    return json({ userId: targetUserId, accountStatus });
  }
  const accountType = body?.accountType as AccountType;
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const locale = ['en', 'fr', 'ar'].includes(String(body?.locale)) ? String(body?.locale) : 'en';
  const dateOfBirth = typeof body?.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth) ? body.dateOfBirth : null;
  const gender = genders.includes(body?.gender as (typeof genders)[number]) ? body?.gender as string : null;
  const relationshipId = typeof body?.relationshipId === 'string' ? body.relationshipId : '';
  const staffRole = hospitalRoles.includes(body?.staffRole as (typeof hospitalRoles)[number]) ? body?.staffRole as (typeof hospitalRoles)[number] : 'HOSPITAL_COORDINATOR';
  const { firstName, lastName } = splitFullName(fullName);

  if (!accountTypes.includes(accountType) || fullName.length < 2 || !lastName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || phone.length > 40) {
    return json({ error: 'Review the required account fields.' }, 400);
  }
  if (accountType === 'patients' && (!dateOfBirth || !gender || dateOfBirth > new Date().toISOString().slice(0, 10))) {
    return json({ error: 'Date of birth and gender are required for a patient.' }, 400);
  }
  if (['provider_staff', 'laboratory_staff', 'radiology_staff'].includes(accountType) && !/^[0-9a-f-]{36}$/i.test(relationshipId)) {
    return json({ error: 'Select the related healthcare provider.' }, 400);
  }

  let createdUserId: string | null = null;
  try {
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, preferred_language: locale },
    });
    if (createError || !created.user) return json({ error: createError?.message ?? 'Could not create the account.' }, 400);
    createdUserId = created.user.id;

    const { error: profileError } = await service.from('profiles').update({
      first_name: firstName,
      last_name: lastName,
      display_name: fullName,
      phone: phone || null,
      date_of_birth: accountType === 'patients' ? dateOfBirth : null,
      gender: accountType === 'patients' ? gender : null,
      preferred_language: locale,
      account_status: 'ACTIVE',
    }).eq('id', createdUserId);
    if (profileError) throw profileError;

    let role: 'PATIENT' | 'DOCTOR' | 'PROVIDER' | 'HOSPITAL_ADMIN' | 'HOSPITAL_COORDINATOR' = 'PATIENT';
    if (accountType === 'doctors') role = 'DOCTOR';
    if (accountType === 'provider_staff') role = staffRole;
    if (accountType === 'laboratory_staff' || accountType === 'radiology_staff') role = 'PROVIDER';
    const { error: clearRoleError } = await service.from('user_roles').delete().eq('user_id', createdUserId);
    if (clearRoleError) throw clearRoleError;
    const { error: roleError } = await service.from('user_roles').insert({ user_id: createdUserId, role, granted_by: actorId });
    if (roleError) throw roleError;

    if (accountType === 'doctors') {
      const { error } = await service.from('doctors').insert({ user_id: createdUserId, first_name: firstName, last_name: lastName, display_name: fullName, status: 'DRAFT' });
      if (error) throw error;
    } else if (accountType === 'provider_staff') {
      const { error } = await service.from('hospital_memberships').insert({ hospital_id: relationshipId, user_id: createdUserId, role: staffRole, is_active: true });
      if (error) throw error;
    } else if (accountType === 'laboratory_staff') {
      const { error } = await service.from('diagnostic_provider_memberships').insert({ provider_type: 'MEDICAL_LABORATORY', medical_laboratory_id: relationshipId, user_id: createdUserId, is_active: true });
      if (error) throw error;
    } else if (accountType === 'radiology_staff') {
      const { error } = await service.from('diagnostic_provider_memberships').insert({ provider_type: 'RADIOLOGY_CENTER', radiology_center_id: relationshipId, user_id: createdUserId, is_active: true });
      if (error) throw error;
    }

    const { error: auditError } = await service.from('audit_logs').insert({
      actor_id: actorId,
      action: 'CREATE',
      entity_type: 'application_account',
      entity_id: createdUserId,
      metadata: { account_type: accountType, assigned_role: role, relationship_id: relationshipId || null },
    });
    if (auditError) throw auditError;
    return json({ userId: createdUserId }, 201);
  } catch {
    if (createdUserId) await service.auth.admin.deleteUser(createdUserId);
    return json({ error: 'Could not create the account.' }, 400);
  }
});
