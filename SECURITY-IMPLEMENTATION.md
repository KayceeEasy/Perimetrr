# Security implementation and verification — v1.1.1

Status: organization/transfer hardening, permitted advisor repairs, and the dedicated API boundary applied to the connected Supabase project on 2026-10-03. Live Data API exposure is `api` only; the extra search path is `extensions`. Hosting deployment, production DNS, and account-email delivery were not verified.

## Authorization model

- A workspace and its staff must be created by an authenticated administrator before employees can pair.
- Workspace admins have direct tenant membership. Organization owners/admins additionally have access to workspaces attached to their organization. A branch role alone does not grant organization-wide access.
- Attaching an existing workspace requires both organization authorization and direct workspace ownership. A workspace already attached to another organization cannot be reassigned through this flow.
- Only an organization owner can authorize or revoke organization personnel. The target must already have a confirmed account. Separately granted branch roles survive organization-role revocation; the UI explicitly warns about this.
- UI flags, local storage, user-editable account metadata, and the old platform impersonation controls do not grant access. Privileged RPCs check current database membership and have explicit role grants. RLS is retained on backing application tables; direct browser table access is now revoked entirely.
- Browser updates cannot assign organization ownership, activate paid plans, or approve transfer rows directly. Fake checkout, coupon, retention-discount, and administrator-password-reset controls were removed.

## Device transfers and attendance

The UUID exists in both browser storage and the database. The server compares it on load and on attendance/history operations. It is a bearer credential, not a physical-device identifier; copying it can copy its authority. Public staff DTOs and exports omit credentials.

Pending transfers snapshot the previous credential, expire after 24 hours, and cannot be silently overwritten by another browser. Only the matching pending browser can record provisional attendance. Approval must come from a workspace/organization administrator or a same-workspace, already-linked Team Lead with the transfer code. Leads cannot approve themselves; five incorrect codes require administrator review.

Approval atomically changes the linked credential and normalizes only inside-Perimeter provisional records referencing that exact request, staff, and tenant. Rejection marks that request’s provisional rows rejected. Outside-Perimeter attempts remain outside-Perimeter. Original status, request ID, resolution timestamp, and approving actor remain auditable. Historical requests are retained rather than overwritten by a uniqueness constraint on staff/status.

Old pending requests that predate request snapshots must be rejected and requested again; no historical provisional record is automatically associated with a guessed transfer request.

## Verification completed

- 20 local automated regression tests: parsing, static assets/handlers, metadata, private-file exclusion/404 behavior, schedule normalization, membership checks, forged local permission flags, credential-free DTOs, transfer display states, QR-origin restrictions, nonexistent-workspace denial, dedicated-client schema selection, removal of direct table queries, date-filter validation, and guarded attendance/schedule calls.
- Live SQL regression suite: cross-company denial, two authorized branches versus another organization, delegated membership/revocation, RLS visibility, protected organization/plan columns, anonymous administrator RPC denial, null-device/GPS rejection, pending request replay/overwrite denial, exact-request approval/rejection, retained history, authorized lead approval, expiry, five-attempt limits, and inactive/trial workspace behavior.
- All SQL fixtures ran in transactions ending with ROLLBACK. No fixture accounts or attendance remain. Private keys were neither printed nor changed.
- Dedicated-boundary SQL tests ran both before application and against the installed live schema: 27-endpoint allowlist; no exposed tables/views; no residual table/column permissions; preserved RLS/platform service access; default-deny future functions/tables; anonymous and authenticated extension denial; tenant-scoped attendance, transfer lists, administrator lists, schedule writes and short names; foreign-company denial; normal pairing, device checks, attendance and shared schedules; and protected Free-plan provisioning through JSON-returning endpoints.
- 12 real HTTP probes passed: Auth health, empty unknown pairing, wrong credential denial, invalid attendance denial, anonymous admin denial, raw-table absence, rejected public profiles, absent extension RPC, and rejected GraphQL access. Probes used nonexistent identifiers or deliberately invalid actions and did not read customer records or write attendance.
- Supabase advisors rerun after changes. Missing foreign-key indexes and policy performance warnings repaired. New indexes may remain marked unused until actual traffic uses them; this is not a failed security check.
- Browser checks cover signed-out states, required-field validation, navigation, and mobile/tablet/nonstandard viewport layout. Full account registration, recovery email delivery, real camera/location permission flows, and authenticated browser journeys still need deployment-level acceptance testing.

## Unresolved launch risks — do not call this a clean security audit

1. **Managed PostGIS installation:** The dedicated boundary closes the previously identified web exposure without modifying Supabase-owned extension objects. `public.spatial_ref_sys` still has its managed table grants/RLS configuration, but neither browser role can use the public schema, REST exposes only api, and GraphQL access is rejected. The latest advisor reports zero security errors, with one `extension_in_public` warning. Extension relocation/owner-level grant cleanup remains future defense in depth, not an outstanding anonymous API write path. Never re-grant public schema usage or exposure to browser roles.
2. **Enrollment trust — deliberately unchanged:** A shared company link/code exposes a minimal staff roster and permits first-claim linking of an unbound staff profile. Someone with that invitation can claim a colleague’s unbound profile. UUID persistence does not solve initial identity verification. The user explicitly excluded enrollment changes from this release. Pending provisional transfers remain unverified until reviewed.
3. **GPS and browser credentials:** Client GPS can be spoofed and credentials can be copied or lost. No biometric or hardware-attestation guarantee is implemented. Apply operational review and risk controls appropriate to attendance/payroll use.
4. **Deployment/account configuration:** Canonical URLs currently target `perimetrr.com`. The actual hosting domain and Supabase redirect allowlist must be verified together before release. The repository has no confirmed production-host association; no Vercel deployment was performed in this task.
5. **Commercial and notification scope:** Organization creation is not a paid upgrade. Background push delivery, native companion-app claims, and commercial enforcement need separate implemented, tested services.

The latest advisor reports 12 anonymous and 27 authenticated SECURITY DEFINER API-function warnings. These are the explicitly approved endpoints, not leftover public-schema access. Thin wrappers call reviewed internal implementations; the five new administrator endpoints check current tenant membership before reading/writing and never accept a supplied actor or paid entitlement. Caller JWT identity remains unchanged inside SECURITY DEFINER functions. Narrow output, device/request checks, explicit grants, pinned search paths, and regression tests remain required controls—not a reason to ignore all advisor warnings.

## Dedicated API boundary and release cutover

`dedicated-api-schema.sql` keeps all tables, IDs, indexes, policies and data in place. It exposes an allowlist in `api`, revokes browser table/column grants and direct internal-function execution, and removes browser `public` schema usage. Existing platform/service access is preserved. Future postgres-created functions no longer inherit PUBLIC execution; future API tables/functions need deliberate grants. No customer data, shared invitations or agent keys are deleted or rotated.

Workspace and organization provisioning endpoints return JSON rather than an exposed backing-table composite type. Attendance exports, administrative reads, schedule writes and onboarding short-name updates now use scoped endpoints. Dead app_config metadata helpers and the archive's nonexistent attendance-table query were removed. Browser bundles and cache keys use v1.1.1 and explicitly target api. Deploy this matching frontend before accepting real traffic; older bundles that explicitly select public are intentionally rejected. Do not reopen the database to make those bundles work.

The Management API configuration change is separate from the SQL transaction. Both the persisted setting and the effective HTTP behavior were verified after cutover. For rollback, restore a reviewed complete release and its grants/configuration together; do not treat re-exposing public as a safe rollback.

## Reproducible review sources

`security-hardening.sql`, `enterprise-and-transfers.sql`, `advisor-hardening.sql`, and `dedicated-api-schema.sql` are the applied change sources, in that order. `tests/enterprise-transfers.sql` and `tests/api-schema.sql` are rollback-only and run in the same transaction. `tools/database-query.cjs`, `tools/database-advisors.cjs`, `tools/api-schema-config.cjs`, and `tools/verify-api-schema.cjs` remain excluded from the public build. The installed CLI binary was unavailable, so no migration-history entry or generated schema dump was fabricated; a proper baseline/migration ledger is still needed for reproducible new-environment provisioning.
