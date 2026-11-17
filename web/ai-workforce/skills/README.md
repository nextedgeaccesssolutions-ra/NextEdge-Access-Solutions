# NEAS AI Workforce Skill Library

Nine versioned operating skills are implemented in `web/lib/aiw-skills.ts` and documented here:

- JARVIS Executive Orchestration
- Revenue & Client Acquisition Engine
- Tender, Proposal & Commercial Excellence
- Rope Access, Work-at-Height & HSEQ
- Renewables, Wind & Power Project Intelligence
- Marketing, SEO & Demand Generation
- BOQ, Estimation & Cash-Flow Discipline
- Client Relationship & Service Recovery
- AI Quality, Evidence & Integrity Review

The API selects skill instructions server-side for every specialist work order. The admin portal displays skill metadata only; internal prompt instructions are not exposed to browsers.

## Governance
- Authenticated administrators only.
- Existing configured AI provider; no provider secret in source.
- Human review for generated work products.
- Gmail remains draft-only pending Google approval and independent mailbox authorization.
- No autonomous sending, publishing, paid spend, pricing commitments, payments, contracts, or engineering/HSE sign-off.
- All unknown facts are marked for verification.
  
## Validation
From `web/`: `npm run test:aiw-skills`, `npm run test:aiw-email-validation`, and `npm run build:app`.
