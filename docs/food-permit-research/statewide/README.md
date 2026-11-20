# MarketKey — California Statewide Food-Permit Baseline

Prepared November 20, 2026. Research draft, not legal advice or a permit determination.

California's retail food framework is primarily established by the California Retail Food Code (CalCode), within the Health and Safety Code. CDPH publishes statewide guidance and supports enforcement; local environmental health agencies (LEAs) administer most retail food permits, plan reviews, inspections, and local fees.

## Files
- `statewide-framework.md` — governing law, local agency roles, plan review
- `home-based-businesses.md` — CFO and MEHKO
- `other-operation-types.md` — permanent facilities, MFF/CMFO, TFF, catering, PFR
- `food-safety-operations.md` — food handler/manager training and operating standards
- `questionnaire-logic.md` — proposed MarketKey screening flow
- `verification-queue.md` — unresolved issues before production
- `source-registry.md` — official CDPH sources

## Critical implementation rules
1. Resolve the LEA from the full business address and city.
2. Do not treat CDPH as the issuing agency for local retail food permits.
3. Separate statewide law from local procedures, fees, and interpretations.
4. Do not hard-code annual sales caps from stale overview pages.
5. MEHKO requires local authorization; it is not available statewide by default.
6. Check CFO products against the current CDPH approved-food list.
7. A questionnaire result is not a permit, approval, or legal opinion.
8. Store source, effective date, checked date, and verification status for every rule.
