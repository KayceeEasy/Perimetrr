# Perimetrr

A browser-based attendance app for tenant workspaces, with server-side Perimeter checks, linked browser credentials, weekly hybrid schedules, and organization-scoped branch oversight.

## Product flows

- Administrators create a workspace and staff profiles in Command Center, then share the workspace URL, code, or QR image.
- Employees open the shared workspace and link a registered profile. A browser credential is verified by the server; it is not hardware attestation or proof of a person.
- A new browser can request a device transfer. Inside-Perimeter attendance remains provisional until an authorized administrator or same-workspace Team Lead approves it.
- Approval updates only the matching request’s provisional attendance. Original status, request identity, and resolution remain available for auditing. Rejection does not turn attendance into verified presence.
- Organization owners create or attach branch workspaces through Enterprise Organization Setup. Watch Tower exposes only organizations and branches authorized for the signed-in account.
- All interfaces use the same tenant staff directory and Monday-based schedule records. Local drafts are not cloud saves.
- Organization setup does not purchase a subscription. New workspaces start on the Free plan. Paid billing and reseller entitlements are not activated by selecting a label.

## Launch pricing

`/pricing/` displays USD launch packages, defaults to monthly billing and provides an accessible annual selector. Team is $9.95/month or $99.50/year; Enterprise is $29.95/month or $299.50/year. Annual totals are shown prominently, with two months free. `pricing/catalog.js` holds integer-cent display prices; it is not a trusted billing or entitlement source.

Setup links create workspaces/organizations, not subscriptions. Paid checkout is not implemented. The five/30/90-staff allowances are planned, not enforced by this change. No database permissions, current subscriptions or customer data were changed.

Before collecting money: choose and verify a processor that supports Nigerian individual merchants, USD subscriptions and the owner's approved payout destination; implement authenticated server checkout and verified/idempotent webhooks, then enforce tenant/organization entitlements server-side. Never accept a price or plan entitlement supplied by the browser. Local-currency estimates must disclose the actual charge currency. Additional-capacity pricing, trials and cancellation/downgrade rules remain to be agreed.

## Interactive previews

The homepage Perimeter illustration runs locally without location permission. The staff sandbox uses five fictional profiles, including two Team Leads, and starts without a selected identity. `/demo/` is a separate, in-memory Command Center preview: filters, CSV export and transfer approval/rejection never change a real workspace. Its sample approval reconciles only attendance associated with that simulated request.

## Local development

Requires Node.js 22 or later.

```powershell
npm test
npm run preview
npm run build
```

The preview server defaults to http://127.0.0.1:4173. Deploy only the generated `dist` directory. The publish allowlist excludes environment files, management scripts, SQL, tests, documentation, and dependencies.

## Database changes

Reviewed SQL sources, applied to the connected database on 2026-10-03:

1. `security-hardening.sql` and `enterprise-and-transfers.sql`, applied atomically.
2. `advisor-hardening.sql`, applied after advisor inspection and rollback-only regression tests.
3. `dedicated-api-schema.sql`, applied after rollback-only preflight. Supabase Data API exposure is now `api` only, with `extensions` as its extra search path.
4. `command-center-policies.sql`: private, constrained workspace policy storage and administrator-only configuration saves. Working days and hybrid quota update atomically; attendance uses the saved timezone and late cutoff. Apply after the dedicated API schema. `tests/command-center-policies.sql` checks temporary-demo policy saves and tenant authorization, and rolls every test change back.

Browsers use `{ db: { schema: 'api' } }`. The API offers 27 explicitly granted operations, not raw tables. Existing application tables and RLS policies remain intact in the now-unexposed `public` section; browser roles cannot use that section. Platform services retain their existing access. Shared workspace URLs, codes, and QR pairing are unchanged.

Apply sources in this order for an already-provisioned database. Do not reapply the older grant scripts after the dedicated boundary. These sources do not replace the still-needed clean provisioning baseline/migration ledger.

The private management utility reads credentials from ignored local environment settings. It never ships in the public build. Agent access keys were not changed.

Repeat the rollback-only database regression suite:

```powershell
node tools/database-query.cjs tests/enterprise-transfers.sql tests/api-schema.sql --atomic --check --apply
node tools/api-schema-config.cjs inspect
node tools/verify-api-schema.cjs
node tools/database-advisors.cjs
```

The `--apply` flag permits SQL operations inside the test transaction; `--check --atomic` ends it with ROLLBACK. Do not run the fixture suite without those flags.

The API configuration is managed with `node tools/api-schema-config.cjs enable` after the reviewed SQL boundary is installed. It changes only exposed schemas/search path and never prints the management response's JWT secret. Do not restore `public` exposure to accommodate old browser bundles: publish the matching frontend release instead.

## Release status and limitations

Version 1.2.0 uses semantic versioning. Hosting deployment and the production frontend's use of this release still require verification.

See [SECURITY-IMPLEMENTATION.md](SECURITY-IMPLEMENTATION.md) for verification evidence and unresolved launch risks. The latest security advisor reports no errors; PostGIS's installation location still produces a warning, but its tables/functions are blocked for browser roles and no longer exposed through REST or GraphQL. Shared-workspace enrollment was deliberately left unchanged for this release.

GPS can be inaccurate or spoofed. Clearing browser storage or using another browser can remove the local credential and requires relinking or transfer approval. Offline records are queued attempts, not verified server attendance until accepted. Browser notifications operate while Command Center is open; background push delivery and native biometric attendance are not configured.
