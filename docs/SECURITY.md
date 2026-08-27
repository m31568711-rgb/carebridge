# Security and RLS model

This document describes the Phase 1 authorization boundary. It is not a substitute for a production penetration test, compliance review, data-processing agreement, incident-response plan, or jurisdiction-specific medical privacy assessment.

## Trust boundaries

- The browser receives only the Supabase publishable key. It is untrusted.
- Supabase Auth establishes identity; PostgreSQL RLS establishes data authorization.
- Server-rendered role guards protect routes and improve UX, but never replace RLS.
- Service-role credentials belong only in audited server or deployment secret stores and are not used by this frontend.
- Provider verification and audit writes are trusted administrative/server operations.

## Policy matrix

| Data | Anonymous | Authenticated owner/member | Platform admin |
| --- | --- | --- | --- |
| Countries, cities, specialties, treatments | Active rows | Active rows | Full management |
| Profiles | None | Own profile only | Read all; status via admin RPC |
| User roles | None | Own assignments | Full management |
| Hospitals and branches | Active + verified directory | Own scoped hospital, including drafts | Full management |
| Hospital memberships | None | Own row; hospital admins can manage coordinators | Full management |
| Doctors and affiliations | Active + verified directory | Doctor owns professional record; hospital staff see affiliations for their hospital | Full management |
| Pharmacies | Active + verified directory | Owner manages own pharmacy | Full management |
| Provider documents | None | Owning provider scope only | Full review and management |
| Approved accreditations | Approved public credentials | Owning provider scope | Full review and management |
| Notifications | None | Recipient only; `read_at` is the only client-updatable field | Can create operational notifications |
| Audit logs | None | None | Read-only; trusted server writes |
| App settings | Public rows only | Public rows only | Full management |

## Important invariants

### Patient isolation

There are no medical case or record tables in this phase. When those tables are added, every row must have an explicit patient owner and a separately modeled care-team assignment. A `DOCTOR` role alone must never authorize access to all patients.

### Hospital scope

Hospital access requires an active membership row containing both `user_id` and `hospital_id`. Helper functions are `SECURITY DEFINER`, use an empty search path, and return only authorization booleans. Hospital administrators may manage coordinators for their own hospital but cannot grant another hospital-admin role.

### Verification

Provider owners can maintain their directory data but cannot change `is_verified`, verification timestamps, document review fields, or accreditation approval status. Database triggers enforce this even if a client bypasses the UI.

### Profile and notification column protection

RLS decides which rows may be updated. Explicit PostgreSQL column grants further restrict self-service profile changes and notification updates. Account status changes go through an admin-checked function; notification recipients may update only `read_at`.

### Storage conventions

- Avatar path: `{auth_user_id}/{filename}`
- Provider path: `{provider_kind}/{provider_uuid}/{filename}`
- Provider kind is one of `hospital`, `doctor`, or `pharmacy`

The Storage policy parses this convention and checks provider ownership or hospital membership. `provider-private` is never public. Signed URLs should be short-lived when private downloads are added.

## Security checklist before production

1. Configure a custom SMTP provider and verify Auth redirect allowlists.
2. Restrict Google Maps browser keys by exact origin and permitted APIs.
3. Store payment, push, and any future service-role secrets in the deployment secret store.
4. Enable Supabase database backups and point-in-time recovery appropriate to the risk profile.
5. Review Auth password, MFA, session duration, and breached-password settings.
6. Add rate limiting and abuse monitoring to signup, recovery, search, and future uploads.
7. Add malware scanning, content-type verification, and quarantine for medical/provider uploads.
8. Add structured security monitoring without logging medical content or secrets.
9. Run RLS integration tests against a disposable Supabase project for every new workflow.
10. Complete privacy, retention, consent, residency, and regulatory reviews before storing medical data.

## RLS testing approach for future modules

For each table, test anonymous, unrelated patient, assigned patient, unrelated provider, assigned provider, organization coordinator, organization administrator, platform administrator, and service-role behavior. Test direct REST queries—not only UI flows—and test inserts, updates, deletes, Realtime delivery, and Storage paths independently.
