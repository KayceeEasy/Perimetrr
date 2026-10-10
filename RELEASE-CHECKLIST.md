# Perimetrr v1.2.0 — beta handoff

## Cloudflare Pages

- Connect the reviewed GitHub repository and production branch `main`.
- Framework preset: None. Build command: `npm run build`. Output directory: `dist`. Use Node.js 22 or later.
- Deploy only `dist`; never the repository root. No database/agent secrets belong in frontend build settings.
- Attach `perimetrr.com` in Pages custom domains after DNS activation. Decide and configure the www-to-apex redirect; a DNS record alone is not a redirect.
- `_headers` and `_redirects` carry security headers and shared-workspace aliases. Verify them on the deployed host; local tests cannot emulate the Cloudflare edge.

## Final account setup — deliberately deferred until hosting is connected

- Change Supabase Site URL from localhost to `https://perimetrr.com` and allow the actual confirmation/recovery destinations used by the app. Do not allow arbitrary production redirects.
- Configure and verify support@perimetrr.com and authentication email delivery. A working mailbox does not automatically configure Supabase SMTP.
- Test registration, confirmation, password recovery, session restoration and sign-out on the live URL.
- Keep paid checkout disabled: prices are display proposals, not enforced billing entitlements.

## Live acceptance before inviting external testers

- Confirm HTTPS, canonical/social URLs, custom 404 status and private-file denial.
- Test anonymous admin denial, cross-company denial, workspace setup, staff pairing, attendance, transfer approval and organization-scoped Watch Tower.
- Test small screens, keyboard focus, empty/error states and denied location permission.
- Begin with fictional data. Review COMPLIANCE-REVIEW.md before real staff records; policies are not certification.
- Keep an alternative attendance process during the beta. Do not claim full accessibility, perfect fraud prevention, or worldwide legal compliance.

The release includes policies, distribution plan, local previews, pricing presentation, configuration fixes and API-compatible database source. The database configuration repair was previously applied; pushing code does not deploy SQL or change Supabase Auth settings. The existing temporary demo-account regression suite requires those fixtures and rolls back all changes.
