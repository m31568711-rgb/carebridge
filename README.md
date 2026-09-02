# CareBridge

CareBridge is a production-oriented multilingual international medical tourism and patient journey platform. Parts 1–3 establish the public experience, authentication, role-aware portals, Admin/master-data workspace, provider governance, private patient medical cases, assigned-doctor treatment recommendations, verified provider discovery, notification infrastructure, PWA shell, and least-privilege Supabase policies. Bookings, payments, prescriptions, offers, and operational laboratory workflows remain outside the current scope.

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
    (auth)/             # Login, recovery, reset, auth errors
    (portals)/          # Role-protected portal routes
    auth/callback/      # Supabase PKCE callback
    offline/            # Localized PWA fallback
  manifest.ts           # Web app manifest
src/
  components/           # Shared brand, layout, and UI primitives
  config/               # Central role and portal configuration
  features/             # Auth, cases, discovery, Admin, dashboard, notifications, and PWA
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

Apply all versioned migrations in order through `202608300002_part6_clinical_hardening.sql` using the CLI:

```bash
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For a clean local Supabase environment, `npx supabase db reset` applies migrations and then `supabase/seed.sql`. In a hosted project, run the seed explicitly only if the generic country, city, specialty, and treatment examples are wanted.

The migration chain creates private Storage buckets for patient evidence, payment proofs, and clinical results, adds `notifications` to the `supabase_realtime` publication, and installs case, journey, finance, travel, and clinical RLS/audit triggers. It is designed for a fresh project; review policy names before applying it to a project that already has similarly named Storage policies.

### Configure Auth

In **Supabase → Authentication → URL Configuration**:

- Set the Site URL to the exact `NEXT_PUBLIC_APP_URL` value.
- Add local redirect URLs such as `http://localhost:3000/**`.
- Add the final production origin with `/**` after deployment.

Enable email/password authentication and disable public email signups. Configure an SMTP provider before production so password recovery emails are reliable. New accounts are created only through the authorized Admin account-management workflow.

### Bootstrap the first administrator

Create and confirm the user through Supabase Auth, copy the user UUID, then run this once in the SQL editor:

```sql
insert into public.user_roles (user_id, role)
values ('USER_UUID_HERE', 'SUPER_ADMIN')
on conflict (user_id, role) do nothing;
```

Provider roles require both a global role in `user_roles` and, for hospital staff, a scoped row in `hospital_memberships`. Admin access is controlled by `ADMIN`/`SUPER_ADMIN`; scoped `admin_privileges` rows authorize master-data, provider, verification, document, and accreditation mutations. `SUPER_ADMIN` retains all administrative privileges.

Admin and SUPER_ADMIN users manage application logins under `/admin/accounts/*`. Account creation runs through the authenticated `admin-account-management` Edge Function, creates the Supabase Auth identity, and links the existing profile, global role, doctor record, hospital membership, or diagnostic-provider membership as appropriate. Temporary passwords are never written to application tables, logs, or audit metadata.

### Moving to another Supabase project

No business-code change is required. Create the destination project, replace only the environment values, run the complete migration chain, optionally apply the fictional seed, configure Auth URLs/SMTP and any external secrets, then verify the two Storage buckets and their policies. Never copy a service-role key into a `NEXT_PUBLIC_` variable. Database rows and Storage objects are separate exports; migrate both when preserving production data.

The Admin UI uses the publishable key and relies on RLS. To grant a scoped administrator access, insert the appropriate permission rows (for example `master_data.countries`, `providers.hospitals`, or `providers.verify`) into `admin_privileges` through a trusted SQL process. `master_data.all` covers only the master-data namespace and does not grant provider verification or document access.

## Environment variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Browser-safe | Canonical origin, Auth redirects, and social metadata |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Supabase publishable/anon credential protected by RLS |
| `NEXT_PUBLIC_MAP_TILE_URL` | Browser-safe, optional | Replaceable `{z}/{x}/{y}` map tiles; defaults to OpenStreetMap |
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
- `PROVIDER` (generic provider-staff application experience; facility access still requires an explicit ownership or membership relationship)

`/portal` resolves the correct area on the server. Every dashboard calls a server-side role guard before rendering. Frontend visibility is only a usability layer; database access is controlled independently by RLS. Diagnostic staff use the existing provider role plus explicit laboratory/radiology ownership or `diagnostic_provider_memberships`; the role alone grants no clinical order access.

## Security and RLS overview

Every exposed application table has RLS enabled. Key principles:

- Profiles are private to the owner and platform administrators.
- Provider directory rows are anonymous-readable only when both active and verified.
- Hospital staff access is tied to an active `hospital_memberships` row for one hospital.
- Doctor access is limited to their own professional record and explicitly assigned medical cases; the doctor role grants no blanket patient access.
- Patient cases and evidence are private to their patient owner until an active doctor assignment exists.
- Treatment is selected only in a verified assigned doctor's recommendation, never in the patient's case submission.
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

## Admin bulk import

Authorized Admin and SUPER_ADMIN users can open `/admin/import` to import hospitals, doctors, pharmacies, medical laboratories, and radiology centers from CSV or Excel `.xlsx` files. Downloadable templates use stable business labels rather than internal identifiers. Countries resolve by ISO code; cities, specialties, and hospitals resolve by their business names or codes.

Each file is limited to 5 MB and 500 rows. The preview flags missing values, invalid email addresses, and duplicates within the file. The server repeats validation, rejects duplicate or unresolved records, and inserts only valid rows as drafts through the signed-in administrator's normal RLS permissions. Existing database audit triggers record successful changes.

## Private upload responsibilities

- Patients upload case-related medical reports, prior results, images, and DICOM files to the private `patient-medical` bucket.
- Laboratory and radiology staff release their official result files through the private `clinical-results` workflow.
- Authorized provider/finance users manage provider documents and payment evidence through their scoped private workflows.
- Doctors can add PDF or image consultation attachments to a booking, encounter, appointment, or follow-up. Patient access is explicit per attachment; provider coordinators do not inherit clinical access.
- Admin users manage authorized provider and accreditation evidence without making private objects public.

## Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:next
```

The scripts call their local Node entry points directly, which keeps them reliable even when the workspace path contains shell metacharacters.

## Part 4 application journey

Part 4 adds a unified role dispatcher and provider workspace, explicitly scoped provider-to-case assignments, draft/sent/decision offer lifecycles, patient offer comparison, automatic booking creation on acceptance, booking status history, event notifications, and role-aware patient/doctor/provider navigation. Offer and booking relationships remain normalized to cases, treatments, providers, doctors, and patients. Draft and withdrawn offers are hidden from patients, one accepted offer is allowed per case, and acceptance expires competing open offers.

The install action now appears only after the browser emits `beforeinstallprompt` and disappears after installation or when running standalone. Secure API responses and medical records are not added to the offline cache.

## Part 6 operational medical workflow

Part 6 adds private doctor encounters, normalized draft/issued prescriptions and medication items, assigned laboratory and radiology orders, release-gated results, private clinical-result documents, reusable follow-up appointments, journey completion, notifications, safe audit events, and server-side operational summaries. Patients see only their own issued/released records. Doctors are limited to the booking doctor relationship. Diagnostic users are limited to their owned or explicitly assigned laboratory/radiology organization, and hospital coordinators receive no implicit doctor-level access.

Clinical result objects use `{patient_uuid}/{lab|radiology}/{result_uuid}/{safe_unique_filename}` in the non-public `clinical-results` bucket. Table triggers and Storage RLS independently validate patient, result, diagnostic-provider, MIME, size, and path scope. The `clinical.support` admin privilege is explicit; an ordinary admin role does not itself reveal clinical contents.

## Phase boundaries

Part 5 adds normalized care-journey modes, scoped appointments and schedule lists, invoice items, manual payment tracking, private payment proofs, optional international travel/accommodation/companion coordination, local or airport transport, and a role-aware journey timeline. `LOCAL_CARE` never requires or renders flight/hotel coordination; `INTERNATIONAL_MEDICAL_TRAVEL` keeps every travel field optional, including accommodation.

Parts 1–6 now cover the platform foundation, Admin/master data, private specialty-led cases and discovery, offers/bookings, scheduling, payment tracking, manual travel coordination, and an internal operational medical workflow. Real e-prescribing/pharmacy dispensing, LIS, PACS/DICOM integration, external laboratory/radiology APIs, real payment gateways, and production infrastructure remain intentionally deferred. Do not place sensitive medical, result, proof-document, companion-contact, or travel-note content in profiles, notifications, public provider rows, or audit metadata.
