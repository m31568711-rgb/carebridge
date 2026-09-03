import { readFileSync } from 'node:fs';
import { createServerClient } from '@supabase/ssr';
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

  let cookies = [];
  const auth = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => {
        for (const item of nextCookies) {
          cookies = cookies.filter((cookie) => cookie.name !== item.name);
          if (item.value) cookies.push({ name: item.name, value: item.value });
        }
      },
    },
  });
  const login = await auth.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw login.error ?? new Error('Route administrator login failed.');
  const cookieHeader = cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
  const routes = [
    ...['patients', 'doctors', 'provider_staff', 'laboratory_staff', 'radiology_staff'].map((type) => ({ path: `admin/accounts/${type}`, marker: '@carebridge.test' })),
    { path: 'admin/accommodation', marker: 'Nile Serenity Recovery Hotel' },
    { path: 'admin/travel', marker: 'CB-DEMO2026INTL2' },
  ];
  for (const locale of ['en', 'fr', 'ar']) {
    for (const { path, marker } of routes) {
      const headers = { Cookie: cookieHeader };
      if (process.env.CAREBRIDGE_SITE_BYPASS_TOKEN) headers['OAI-Sites-Authorization'] = `Bearer ${process.env.CAREBRIDGE_SITE_BYPASS_TOKEN}`;
      const response = await fetch(`${baseUrl}/${locale}/${path}`, { headers, redirect: 'manual' });
      const body = await response.text();
      if (!response.ok || !body.includes(marker) || /This page couldn.t load|A server error occurred|Application error/i.test(body)) {
        throw new Error(`${locale}/${path} failed with HTTP ${response.status}`);
      }
    }
  }
  console.log(`All 21 authenticated Admin routes loaded successfully from ${new URL(baseUrl).host}.`);
} finally {
  if (userId) await service.auth.admin.deleteUser(userId);
}
