# CareBridge

CareBridge is a production-oriented foundation for a multilingual international medical tourism and patient journey platform. This first phase establishes the public experience, authentication, role-aware portals, provider directory schema, notification infrastructure, PWA shell, and least-privilege Supabase policies. It deliberately does **not** implement medical cases, treatment offers, bookings, payments, prescriptions, or laboratory workflows.

## Technology stack

- Next.js 16 App Router with TypeScript and React 19
- Tailwind CSS 4 and a reusable accessible component system
- Supabase PostgreSQL, Auth, Storage, Realtime, and Row Level Security
- English, French, and Arabic with automatic RTL layout
- Installable PWA shell with a conservative offline strategy
- Vitest for foundation tests and ESLint for static analysis
- Vinext/OpenAI Sites adapter for the included hosted preview path

The application source uses standard Next.js App Router conventions. The default `dev` and `build` scripts use the Sites-compatible Vinext adapter; `dev:next`, `build:next`, and `start:next` run the standard Next.js toolchain.

## Folder structure

```text
app/
  [locale]/
    (public)/           # Multilingual landing page
    (auth)/             # Login, signup, recovery, reset, auth errors
    (portals)/          # Role-protected portal routes
    auth/callback/      # Supabase PKCE callback
    offline/            # Localized PWA fallback
  manifest.ts           # Web app manifest
src/
  components/           # Shared brand, layout, and UI primitives
  config/               # Central role and portal configuration
  features/             # Auth, dashboard, notifications, and PWA features
  i18n/                 # Locale configuration and dictionaries
  lib/                  # Supabase, environment, auth, and utility helpers
  types/                # Domain interfaces
supabase/
  migrations/           # Versioned PostgreSQL schema and RLS
  seed.sql               # Generic multilingual reference data
tests/                   # i18n, RBAC, and auth validation tests
docs/                    # Architecture and security decisions
public/                  # PWA icons, service worker, and social preview
```

## Local setup

Prerequisites: Node.js 22.13 or later, npm, and a Supabase project.

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Supabase → Project Settings → API**.
3. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` locally.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev` or use `npm run dev:next` for the native Next.js development server.

No service-role credential is read by application code. Never prefix a secret with `NEXT_PUBLIC_`.

## Supabase setup

### Apply the schema

The primary migration is `supabase/migrations/202608270001_initial_foundation.sql`. Apply it to a new Supabase project using the CLI:

```bash
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For a clean local Supabase environment, `npx supabase db reset` applies migrations and then `supabase/seed.sql`. In a hosted project, run the seed explicitly only if the generic country, city, specialty, and treatment examples are wanted.

The migration creates Storage buckets and adds `notifications` to the `supabase_realtime` publication. It is designed for a fresh project; review policy names before applying it to a project that already has similarly named Storage policies.

### Configure Auth

In **Supabase → Authentication → URL Configuration**:

- Set the Site URL to the exact `NEXT_PUBLIC_APP_URL` value.
- Add local redirect URLs such as `http://localhost:3000/**`.
- Add the final production origin with `/**` after deployment.

Enable email/password authentication. Configure an SMTP provider before production so confirmation and recovery emails are reliable. The signup flow writes basic name and language metadata; a database trigger creates the profile and assigns the `PATIENT` role.

### Bootstrap the first administrator

Create and confirm the user through Supabase Auth, copy the user UUID, then run this once in the SQL editor:

```sql
insert into public.user_roles (user_id, role)
values ('USER_UUID_HERE', 'SUPER_ADMIN')
on conflict (user_id, role) do nothing;
```

Provider roles require both a global role in `user_roles` and, for hospital staff, a scoped row in `hospital_memberships`. Add those only through a trusted administrative process or the SQL editor until the administration workflows are implemented.

## Environment variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Browser-safe | Canonical origin, Auth redirects, and social metadata |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Supabase publishable/anon credential protected by RLS |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser-safe, restricted | Future Maps integration |
| `NEXT_PUBLIC_PAYMENT_PUBLIC_KEY` | Browser-safe | Future payment UI |
| `PAYMENT_PROVIDER_SECRET_KEY` | Server-only | Future payment server calls |
| `PAYMENT_WEBHOOK_SECRET` | Server-only | Future webhook verification |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` | Browser-safe | Future push subscription |
| `WEB_PUSH_PRIVATE_KEY` | Server-only | Future push delivery |

## Internationalization

Routes are prefixed with `/en`, `/fr`, or `/ar`. English is the default. `proxy.ts` redirects unprefixed requests using the saved language cookie or the browser language header. Dictionaries live in `src/i18n/messages`, and TypeScript plus tests enforce identical translation-key coverage.

Arabic routes set `dir="rtl"`, use logical CSS properties, and switch to an Arabic-friendly system font stack. The language selector preserves the current route and persists the choice in a one-year cookie. Add a language by extending the locale tuple, adding a complete dictionary, adding direction metadata, and updating PWA offline routes.

## RBAC and protected routes

Roles are defined once in `src/config/roles.ts`:

- `SUPER_ADMIN`, `ADMIN`
- `PATIENT`
- `HOSPITAL_ADMIN`, `HOSPITAL_COORDINATOR`
- `DOCTOR`
- `PHARMACY`

`/portal` resolves the correct area on the server. Every dashboard calls a server-side role guard before rendering. Frontend visibility is only a usability layer; database access is controlled independently by RLS. A future `LAB` role should be introduced through a new enum migration and a new provider module, without modifying existing migrations.

## Security and RLS overview

Every exposed application table has RLS enabled. Key principles:

- Profiles are private to the owner and platform administrators.
- Provider directory rows are anonymous-readable only when both active and verified.
- Hospital staff access is tied to an active `hospital_memberships` row for one hospital.
- Doctor access is limited to their own professional record; the doctor role grants no blanket patient access.
- Provider documents and private Storage objects are provider-scoped and never anonymous.
- Notification rows are visible only to their recipient; recipients can update only `read_at`.
- Audit rows are immutable to clients. The generic audit RPC is restricted to `service_role` for trusted server-side use.
- Verification fields are protected by triggers so provider users cannot approve themselves.

See [docs/SECURITY.md](docs/SECURITY.md) for the policy matrix and threat-boundary notes.

## Notifications and Realtime

Notifications are stored in `public.notifications` with recipient, type, translation keys, JSON payload, read timestamp, and optional related entity. The dashboard bell loads the latest records and subscribes to recipient-filtered PostgreSQL changes. RLS still applies to every Realtime-delivered row.

Future modules should create notifications from trusted server-side code or narrowly scoped database functions; clients cannot insert arbitrary notifications.

## PWA behavior

The manifest, PNG icon placeholders, install prompt, service-worker registration, and localized offline pages are included. The service worker caches only:

- localized offline pages;
- the manifest and PWA icons;
- immutable framework static assets encountered by the app.

It does not cache API routes, Auth callbacks, Supabase requests, navigated private responses, or medical records. Replace the placeholder icons in `public/icons` when final brand assets are available.

## Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:next
```

The scripts call their local Node entry points directly, which keeps them reliable even when the workspace path contains shell metacharacters.

## Phase boundaries

This foundation intentionally leaves patient cases, medical record sharing, offers, booking, payments, prescriptions, invoices, travel workflows, and laboratories for later migrations and feature modules. Do not place medical data in the current `profiles`, `notifications`, or provider-directory tables.
