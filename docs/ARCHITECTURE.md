# Architecture decisions

## Application shape

CareBridge uses a modular monolith for the MVP foundation. The App Router provides server-rendered public pages, Auth callbacks, and server-protected portals. Feature code is grouped by capability, while cross-cutting configuration such as roles and locales is centralized.

```text
request
  → locale/session proxy
  → route group
      → public multilingual content
      → Supabase Auth flow
      → server role guard
          → portal shell
              → RLS-protected Supabase data
```

This shape avoids premature microservices while preserving boundaries that can later become services if scale or compliance requires it.

## Rendering and runtime

- Public pages are React Server Components by default.
- Interactive controls are small client components.
- Auth state is verified with `supabase.auth.getUser()` on the server, not trusted from browser state.
- `proxy.ts` refreshes session cookies and handles locale redirects.
- The standard Next.js scripts are retained alongside the OpenAI Sites/Vinext adapter.
- External Supabase access uses HTTPS and does not require raw TCP connections.

## Data model boundaries

`profiles` contains only common account data. Hospitals, doctors, pharmacies, credentials, documents, organization membership, and directory relationships have dedicated tables. Medical-case data is absent by design and must be introduced in a later isolated migration with patient/provider assignment tables and its own RLS review.

Junction tables model many-to-many relationships:

- hospitals ↔ specialties;
- hospitals/branches ↔ treatments and optional starting prices;
- doctors ↔ specialties;
- doctors ↔ hospitals/branches.

`hospital_memberships` is the authorization boundary for hospital-scoped operations. A role name alone never identifies which hospital a staff member may access.

## Future LAB extension

Add LAB through a forward-only migration:

1. add `LAB` to `app_role` and the provider type enum;
2. add a dedicated laboratory table and membership model if organizations need multiple users;
3. extend provider-document/accreditation ownership checks;
4. add a centralized portal mapping and translated dashboard copy;
5. add independent RLS tests before exposing the route.

Existing tables do not need to be repurposed.

## Translation model

The initial UI uses type-checked in-repository dictionaries rather than a remote content service. The English dictionary defines the shape, and French/Arabic must satisfy it. Database directory names use `jsonb` language maps so reference data can be presented without duplicating entity rows.

If translation volume grows, dictionaries can be split by feature or moved behind the same `getDictionary(locale)` interface.

## PWA and offline boundary

The service worker is intentionally conservative. Only public shell resources and immutable static files are cached. Authenticated pages remain network-first and are not written to Cache Storage. Later offline medical features require a separate privacy, encryption, device-security, and revocation design review.

## Audit foundation

`audit_logs` is append-only from the client perspective and stores actor, action, entity reference, metadata, and time. The generic insertion function is available only to trusted `service_role` code. Later business modules should add narrowly scoped server actions or triggers that validate ownership before emitting events.
