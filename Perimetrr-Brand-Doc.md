# Perimetrr — Brand Document

**perimetrr.com**

---

## 1. Brand Foundation

**What it is:** A GPS-geofenced, browser-credential-linked attendance and presence platform. Administrators create workspaces and staff profiles; employees open the shared workspace link or code and link a browser. Watch Tower lets authorized organization personnel oversee only their attached branches.

**Mission line:** Perimetrr makes presence provable — for a five-person team or a five-hundred-client reseller network.

**Elevator pitch:** Perimetrr checks attendance against a linked browser credential and an office Perimeter, then gives administrators a clear view of presence and exceptions. Enterprises can group their branch workspaces under one organization, with access enforced by server-side membership.

**Security claims:** A stored UUID is a bearer credential, not hardware attestation or proof of a person. Browser-provided GPS can be spoofed. Do not claim that either eliminates attendance fraud. Biometrics are not part of the current attendance workflow. Provisional transfer attendance becomes verified only after authorized approval; the original status and resolution remain in the audit history.

**Core metaphor:** The perimeter — a defined boundary you must be inside to be counted present. Every naming and visual decision downstream should reinforce "boundary, verified entry, presence" rather than generic "clock" or "punch" imagery, since that's what differentiates this from commodity attendance apps.

---

## 2. Audience & Tiers

This matters for tone because you're bridging two very different buyers in one brand:

- **Free tier (≤5 employees):** small business owner, likely non-technical, price-sensitive, wants something that "just works" without setup friction.
- **SMB/paid tier:** ops manager or HR lead, cares about reliability, reporting, and reducing proxy check-in fraud.
- **Enterprise tier:** An IT/ops decision-maker managing multiple branches of one organization. Each branch retains its workspace; explicitly granted organization personnel can oversee those branches, never another enterprise’s workspaces. White-label/reseller access is a separate future capability and must not imply platform-wide access.

The brand voice needs to feel trustworthy enough for the enterprise buyer without feeling cold or inaccessible to the 5-person free-tier owner. That's a common tightrope (Slack and Notion both walk it) — approachable but not lightweight.

---

## 3. Voice & Tone

- **Direct, not corporate.** Say what the product does in plain terms before reaching for jargon.
- **Confident about security, humble about hype.** Avoid absolute claims ("eliminates fraud," "guarantees accuracy") unless backed by something verifiable — reads as more credible to enterprise buyers, and is safer from a claims/liability standpoint.
- **No forced cuteness.** The perimeter/boundary metaphor gives you enough personality — lean on it instead of generic SaaS playfulness (no "let's get this party started" onboarding copy).

**Tagline options** (pick one primary, others become secondary/contextual):
- *"Presence you can prove."* — strongest for enterprise/security positioning.
- *"Know who's really there."* — strongest for SMB, plain-language.
- *"The edge of accountability."* — more abstract, good for a hero banner, not for a signup button.

Recommendation: lead with **"Presence you can prove"** site-wide, use **"Know who's really there"** in SMB/free-tier-facing marketing (onboarding emails, small-business landing page).

---

## 4. Naming System

Keep the perimeter metaphor consistent across the product so every touchpoint reinforces the brand, rather than defaulting to generic SaaS terms:

| Generic term | Perimetrr term |
|---|---|
| Geofence radius | **The Perimeter** |
| Admin dashboard | **Command Center** |
| Organization branch oversight | **Watch Tower** (e.g. "oversee your branches in Watch Tower") |
| Mobile companion app | **Perimetrr Go** |
| White-label instance | **Perimetrr for [Client Brand]** (kept low-key — white-label buyers generally want *their* name foregrounded, not Perimetrr's internal naming system bleeding through) |

Note: don't over-apply this system in dense UI copy (e.g. a busy admin table) — it reads as cute the tenth time you see it and slows scanning. Reserve it for headers, marketing copy, and onboarding; keep dense data tables in plain language ("Check-ins," "Employees," "Status").

---

## 5. Launch Plans & Pricing

- **Perimetrr Free** — $0; planned allowance of 5 active staff, one workspace and one location per business, core check-in/out and a basic dashboard.
- **Perimetrr Team** — $9.95 per workspace/month or $99.50/year; planned allowance of 30 active staff, schedules, reporting and exports.
- **Perimetrr Enterprise** — $29.95 per organization/month or $299.50/year; planned allowance of three branches and 90 active staff total, with organization-scoped branch oversight and authorized personnel management in Watch Tower.
- **Perimetrr White Label** (or **Perimetrr Reseller**) — full white-labeling, client-fleet monitoring dashboard for resellers/agencies managing multiple downstream companies.

Annual billing gives two months free (approximately 17% savings). Always show the total annual charge prominently alongside any monthly equivalent. Use "Recommended for growing teams" for Team, not an unsupported "Most popular" claim. No invented original prices or artificial discounts.

Prices are displayed in USD. The preferred billing model charges USD with optional local-currency estimates. Processor selection, Nigerian individual merchant eligibility and payout destination acceptance remain under review; no provider is activated. Checkout must disclose the actual currency and total before payment. Additional staff/branch pricing and trials are not approved offers yet; large organizations require a volume agreement.

Implementation note: creating an organization does not activate a paid subscription. New workspaces provision on the Free plan. Paid billing, tier limits, and reseller entitlements must be implemented and verified before being advertised as active features.

---

## 6. Visual Direction

### Color palette
- **Primary:** Deep navy or charcoal (#0F1B2D-ish range) — security, trust, "night watch" feel.
- **Accent:** Electric green or amber (#39FF88 or #FFB020-ish range) — reads as a "verified/active" signal, similar to a GPS pin or radar-ping, and gives you a strong color for status indicators (checked-in = accent color, absent = muted gray).
- **Neutral base:** Off-white/light gray for dashboard backgrounds — keeps long admin sessions (Command Center view) easy on the eyes; avoid pure white, which feels harsh in data-dense dashboards.

*(These are starting-point suggestions, not final hex codes pulled from any existing brand — treat as a direction to react to, then lock exact values once you're in design tooling.)*

### Iconography
- **Core mark concept:** concentric rings or a radar-ping motif — doubles as a literal geofence visualization and a logo mark. A pin-in-ring or target-style icon works well at small sizes (favicon, app icon) and scales cleanly to a wordmark lockup.
- Avoid literal clock/punch-card imagery as the primary mark — it undersells the security/verification angle that differentiates you from commodity attendance apps.

### Typography
- **Headings:** a geometric sans (e.g. in the style of Inter, Space Grotesk, or IBM Plex Sans) — technical enough to read as "security software," not so cold it feels enterprise-1990s.
- **Body:** a highly legible sans for dashboard density (Inter or system-ui stack works well and keeps load times fast).
- Avoid rounded/friendly typefaces (e.g. Nunito-style) as the primary heading font — undercuts the security positioning, even on the free-tier-facing pages.

### Logo lockup notes
- Wordmark should work in all-lowercase (**perimetrr**) as a clean, modern option, with an uppercase/title-case (**Perimetrr**) variant for formal contexts (invoices, enterprise contracts, white-label negotiation decks).
- Icon mark (rings/radar-ping) should work standalone as an app icon/favicon without the wordmark attached.

---

## 7. What I'd Flag Before You Lock Any of This In

- [Unverified] I haven't checked whether "Perimetrr," any tier names above, or the icon concept collide with existing registered trademarks — worth a proper USPTO TESS search (or a trademark attorney, given the white-label/reseller model raises the stakes if you ever need to defend the mark on behalf of resellers using your brand).
- The exact hex codes and font names above are directional suggestions for you to react to, not a locked design system — treat this section as a starting brief for whoever builds the actual visual assets (you, a designer, or a tool like Figma).
- Launch prices are defined above; paid checkout and staff/branch limits are not active. Keep proposed allowances distinct from enforced entitlements in customer-facing material.

---

## 8. Next Steps (suggested order)

1. Confirm/verify perimetrr.com trademark clearance is safe to build on.
2. Lock exact color hex values and typography choices (or hand this doc to a designer).
3. Design the icon mark (rings/radar-ping) — this is the piece most worth getting right first, since it'll be reused everywhere (favicon, app icon, white-label contexts).
4. Draft onboarding copy for the free tier using the "Know who's really there" voice.
5. Draft enterprise/reseller sales copy using the "Presence you can prove" voice.
