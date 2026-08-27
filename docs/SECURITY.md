# Security and RLS model

This document describes the current Parts 1–3 authorization boundary. It is not a substitute for a production penetration test, compliance review, data-processing agreement, incident-response plan, or jurisdiction-specific medical privacy assessment.

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
| Radiology centers and laboratories | Active + verified directory | Owner scope only | Scoped/full management |
| Medical cases | None | Patient owner; actively assigned verified doctor | Scoped management |
| Case documents | None | Patient owner; actively assigned verified doctor | Scoped management |
| Treatment recommendations | None | Patient sees submitted recommendations; assigned doctor manages own recommendation | Scoped management |
| Provider documents | None | Owning provider scope only | Full review and management |
| Approved accreditations | Approved public credentials | Owning provider scope | Full review and management |
| Notifications | None | Recipient only; `read_at` is the only client-updatable field | Can create operational notifications |
| Audit logs | None | None | Read-only; trusted server writes |
| App settings | Public rows only | Public rows only | Full management |

## Important invariants

### Patient isolation

Every medical case has an explicit patient owner. A doctor receives access only through an active `case_doctor_assignments` row and an active, verified doctor profile linked to the authenticated user. A `DOCTOR` role alone never authorizes access to patients. Treatment choices exist only on doctor recommendations and must belong to the case specialty.

### Hospital scope

Hospital access requires an active membership row containing both `user_id` and `hospital_id`. Helper functions are `SECURITY DEFINER`, use an empty search path, and return only authorization booleans. Hospital administrators may manage coordinators for their own hospital but cannot grant another hospital-admin role.

### Verification

Provider owners can maintain their directory data but cannot change `is_verified`, verification timestamps, document review fields, or accreditation approval status. Database triggers enforce this even if a client bypasses the UI.

### Profile and notification column protection

RLS decides which rows may be updated. Explicit PostgreSQL column grants further restrict self-service profile changes and notification updates. Account status changes go through an admin-checked function; notification recipients may update only `read_at`.

### Storage conventions

- Avatar path: `{auth_user_id}/{filename}`
- Provider path: `{provider_kind}/{provider_uuid}/{filename}`
- Provider kind is one of `hospital`, `doctor`, `pharmacy`, `radiology_center`, or `medical_laboratory`
- Patient medical path: `{patient_uuid}/{case_uuid}/{safe_unique_filename}` in private `patient-medical`

Storage policies parse these conventions and check provider ownership, hospital membership, patient ownership, or an active doctor assignment. `provider-private` and `patient-medical` are never public. Medical downloads use short-lived signed URLs.

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
