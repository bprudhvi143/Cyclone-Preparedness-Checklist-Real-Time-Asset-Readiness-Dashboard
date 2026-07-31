SW20 — Cyclone Preparedness Checklist and Real Time Asset Readiness Dashboard
*Original reference: PS37 · Track: SW · Department: GVMC Disaster Management, All Departments **

1. Problem
Visakhapatnam is on the cyclone prone east coast. The city experienced Cyclone HudHud (2014) which caused extensive damage. GVMC has cyclone preparedness protocols, but verification of asset readiness (pumps working, shelters identified, communication systems active, equipment staged) is manual and paper based. No real time checklist dashboard exists for the GVMC Commissioner to track preparedness across 8 to 10 zones.

Current process today: Pre cyclone meetings. Checklist forms distributed to zones. Verbal status reports.

Why it's still unsolved: No digital real time status board. Commissioner cannot see which zones have pending preparedness gaps.

2. Goal
Ship a working pilot that replaces the manual/undocumented process above with a system GVMC Disaster Management, All Departments can run without   hand-holding — instrumented, observable, and demoable end-to-end within the hackathon window.

3. Users & Stakeholders
Primary operator: GVMC Disaster Management, All Departments *
Secondary: GVMC City Operations Center / Commissioner's Office (for cross-department visibility)
End beneficiary: Visakhapatnam residents affected by this problem

4. User Stories
As a GVMC Disaster Management field officer, I want to see live, ward-level data on this problem so that I can act before it escalates into a complaint or an incident.
As a GVMC Commissioner's Office analyst, I want a single dashboard view of this problem across all wards so that I can prioritize budget and staff deployment.
As a GVMC Disaster Management supervisor, I want automatic alerts when something needs attention so that my team stops relying on manual patrol or after-the-fact complaints.

5. Requirements (from the official brief)
Digital preparedness checklist, zone level status, mobile submission, commissioner dashboard

6. Proposed Architecture
Track: SW

KoBoToolbox
Google Sheets
Streamlit
SMS alert
App/dashboard layer: a thin Expo (React Native) or React.js client talks to a REST/GraphQL backend; keep business logic server-side so the same API can serve web and mobile without duplicating rules.

7. Success Metrics
Commissioner's full 10zone preparedness status in under 60 minutes vs. hours of phone calls.
Feasibility/innovation assessment: 10 / 10 Software only. KoBoToolbox or Google Forms can run the pilot., 9 / 10 Digital cyclone readiness dashboard for GVMC Commissioner is high value.

8. Rollout Plan
Week 1 — Discovery: confirm data ownership with GVMC Disaster Management, All Departments *, lock the pilot ward/zone, and instrument one location end-to-end.
Week 2 — Build: ship the core pipeline (capture → store → visualize) with real (not mock) data from the pilot location.
Week 3 — Pilot: run against the live pilot zone, tune thresholds/alerts against real false-positive rates.
Handover: package as a GVMC-operable service with a runbook, not a demo the team has to babysit.
Indicative pilot budget: Rs 5,000 to 10,000 (KoBoToolbox or custom form, Power BI or Streamlit dashboard)

9. Risks & Assumptions
Assumes GVMC Disaster Management, All Departments * will designate an owner who can approve data access and sign off on the pilot zone — without this, the build has nowhere to plug in.
No digital real time status board. Commissioner cannot see which zones have pending preparedness gaps.

10. Out of Scope (for the pilot)
City-wide rollout beyond the pilot ward/zone/asset set named above.
Deep integration with legacy GVMC systems beyond a read/write API — treat as a follow-on phase.