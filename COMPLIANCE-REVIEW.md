# Beta compliance review — 10 October 2026

This is an engineering risk review, not a legal opinion or certification. Public policies describe the current beta, not a hypothetical paid service. Operator details were supplied by Kenneth Omeh: trading name Perimetrr; Chevron Drive, Lekki, Lagos, Nigeria; support@perimetrr.com. Verify mailbox delivery during final deployment.

## Implemented

- Standalone privacy, terms, browser-storage/cookie and beta refund pages; discoverable legal navigation and sitemap entries.
- Unchecked terms/authority acknowledgement before workspace submission and terms acknowledgement before enterprise registration. Existing sign-in does not require the registration checkbox. This is not blanket employee-processing or marketing consent.
- Removed automatic optional error-event logging, its unused helpers and the old local diagnostic cache. Pairing and offline attendance are untouched.
- Removed unsupported protocol/cipher assertions and an absolute claim that impersonation is always blocked. The privacy notice explains submitted coordinates, browser credentials, GPS limitations, providers and unresolved retention.
- Increased light-theme muted-text contrast, added visible keyboard focus and native checkbox controls. Static image-alt and asset checks run in the release suite.

## Tracking and third parties

Source inspection found no Google Analytics, Meta pixel, Hotjar, Clarity or embedded video/social frames in public files. Attendance analytics is a workplace reporting feature, not advertising tracking. Google Fonts, jsDelivr, unpkg and Supabase still receive network information. Cloudflare production settings may inject analytics or other scripts: inspect actual live requests before declaring the deployment tracker-free. Self-hosting fonts and vendor assets is a useful follow-up for reduced provider exposure.

Do not install a decorative cookie banner. Optional trackers must be blocked pending valid consent if introduced. Audit persistent authentication, offline storage and preferences for necessity and actual retention in each target jurisdiction. No blanket global consent exemption is claimed.

## Data minimization and unresolved launch risks

1. Employer staff identity, work policy, schedules, attendance times, submitted coordinates and pairing credentials are processed. Do not collect IDs, biometrics, health information or bank details. Avoid storing exact submitted coordinates longer than needed for disputes; implementation of a verified retention/deletion mechanism remains outstanding. No database purge was performed.
2. Establish employer-controller / service-processor responsibilities in a data-processing agreement; maintain a subprocessor list, storage-region inventory and international-transfer assessment. A privacy page alone does not provide these safeguards.
3. Conduct a DPIA/risk assessment for employee location and monitoring. Agree lawful grounds; employee consent may not be freely given. Do not automate disciplinary/payroll outcomes from an uncertain GPS result.
4. Determine whether NDPC registration as a controller/processor of major importance, a DPO, and audit returns apply. Small size or lack of incorporation is not a general exemption. Confirm classification with a Nigerian adviser or licensed DPCO.
5. Prepare breach-response, access/deletion request and retention procedures, including provider backups. Assess statutory notification duties immediately when an incident occurs; do not invent an unconditional notification promise.
6. Shared invitation first-claim linking can let someone select another unclaimed staff identity. Device persistence does not solve enrollment identity. This was explicitly excluded from the earlier security change; disclose and control it before real-company rollouts.
7. Frontend terms acknowledgements are not a tamper-resistant legal acceptance ledger. Versioned server-side acceptance evidence and customer agreements need implementation/review before commercial reliance.
8. Paid checkout remains unimplemented. The beta refund page preserves mandatory rights without inventing a refund window. Approve actual cancellation, renewal and refund rules before accepting money.
9. EU/UK targeting may add GDPR/UK GDPR and cookie obligations, representation/transfer requirements and consumer protections. Other countries may add requirements; do not claim worldwide compliance.
10. Accessible markup and contrast improvements are not a complete WCAG audit. Screen-reader, zoom, keyboard, dialog focus and error-state acceptance tests remain necessary on the deployed app.

## Claims, images and provenance

No customer-review/testimonial blocks were identified in the public source audit. Demo staff are fictional; do not present them as customers. Do not advertise perfect fraud prevention, guaranteed accuracy, legal certification, paid capabilities not enabled, or invented uptime/customer numbers.

The current mark is a simple repository SVG. Social-preview and Apple-icon generation is reproducible in tools/render-brand-assets.ps1, but authorship/licensing of any inherited assets, including image/png, still needs owner confirmation. Local presence is not proof of copyright ownership. Lucide and qrcode-generator have upstream open-source licenses; preserve applicable notices when distributing/self-hosting them. Inter/Outfit font licenses must likewise be retained if bundled. Customer-uploaded logos need customer permission. No blanket image copyright clearance is claimed.

## Authoritative references

- Nigeria Data Protection Commission, final GAID 2025: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf
- NDPC FAQs, including major-importance registration/audit distinctions: https://ndpc.gov.ng/faqs/
- Nigerian consumer rights: https://fccpc.gov.ng/consumers/
- UK ICO storage and consent guidance: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-we-comply-with-the-pecr-rules/
- WCAG 2.2 requirements: https://www.w3.org/WAI/WCAG22/quickref/

These sources inform the risks; a qualified adviser must determine applicability to actual processing and markets. No conclusion of full compliance has been made.
