# Handoff — Designing Plane Around the Business Process

**Repo:** `u2giants/plane`  
**Date:** 2026-05-18  
**Purpose:** Complete context for a new AI session focused exclusively on designing the Plane PM system for this company's real workflows.

This handoff is intentionally scoped. The AI interview system lives in a separate repo (`u2giants/bizanalysis`). This session is only about designing Plane.

**Read this after** `FUTURE_SESSION_START_HERE.md`. That file contains the clearest current summary for a completely new session.

---

## What This Project Is

The company currently tracks all product work in **ClickUp**. The goal is to replace ClickUp with a self-hosted instance of **[Plane](https://github.com/makeplane/plane)** (open-source PM tool, AGPL-3.0), customized to fit how this company actually works.

Plane is already deployed on Coolify (production server: `178.156.180.212`). The deployment infrastructure is working. The open task is **figuring out how to design Plane's workspace, projects, states, and workflows to match the real business process** — not generic PM defaults.

The ClickUp behavior data has already been collected and loaded into D1. The design work is to use that intelligence to make decisions about the Plane configuration.

---

## The Company in One Page

**POP Creations / Spruce Line** — licensed and generic home decor products.  
Manufactured in China. Sold to US retail chains: Burlington, TJX, Ross, Hobby Lobby, Walmart, etc.

**Two product lines with fundamentally different workflows:**

| | POP Creations | Spruce Line |
|---|---|---|
| Products | Licensed (Disney, Marvel, WB, DC, Peanuts, etc.) | Generic / original designs ("Edge" brand) |
| Volume | ~7,900 SKUs tracked | ~700 items tracked |
| Key constraint | Must get licensor approval of design AND sample before manufacturing | No licensor — internal approval only |
| Pipeline complexity | 17 stages, multiple external gates | Simpler; stages not fully mapped yet |
| ClickUp list | Licensing Management (7,281 products) | Edge Generic (701 products) |

**Three ways work starts:**
1. Buyer (retailer) requests a specific product or refresh of an existing line
2. Company proactively refreshes a line and then presents it to buyers
3. Internal new product development — build first, find buyers later

**Three sales channels:**
1. Major retail chains (Burlington, TJX family, Ross, Hobby Lobby, Walmart, etc.) — primary
2. Wholesale sublicensors (Stallion Art, Iconick) — they buy and resell; still go through licensor approval
3. Internal development — company builds product, presents it to buyers

---

## The POP Creations Pipeline (17 Stages)

This is the confirmed, verbatim pipeline from Jessica (Project Manager). Every licensed SKU goes through some or all of these stages.

| # | Stage | Who owns it | Notes |
|---|-------|-------------|-------|
| 1 | Art files creation | Creative Designer | Artwork for buyer's selected product format |
| 2 | Licensing sheet creation | Technical Designer | LS + packaging design using the art file |
| 3 | Licensing sheet review | Creative Director (Liz) | **Internal gate** — nothing advances without her approval |
| 4 | Ready to submit | Liz → Licensing Team | Liz sends approved sheet to licensing coordinator |
| 5 | Concept submitted | Licensing Team | Submitted to licensor portal |
| 6 | Revisions | Creative + Technical Designer | Licensor rejected — corrections needed |
| 7 | Concept approved | — | Licensor approved with no corrections needed |
| 8 | Concept approved with changes | Creative + Technical Designer | Approved but minor revisions required before sampling |
| 9 | PO received | Technical Designer | Buyer sent purchase order; Techpack files now needed |
| 10 | Sales requested sample | Technical Designer | No PO yet but buyer wants a physical sample first |
| 11 | Sample requested | Factory | Techpacks sent to factory; factory makes sample |
| 12 | Sample received | Liz + Licensing Team | Factory sent PPS photos; internal review before licensor |
| 13 | Factory resample | Factory | Sample had errors — corrected and re-photographed |
| 14 | Sample sent to licensor | Licensing Team | PPS submitted to licensor portal |
| 15 | Sample revision | Creative + Technical Designer | Licensor sent changes to sample |
| 16 | Pre-production approved | — | PPS approved; mass production authorized |
| 17 | Production approved | — | All licensor requirements met; submission closed |

**Key insight from data:** 1,574 products are sitting at "Concept Approved" with no next step. A buyer must actively place a PO (or request a sample without a PO) to advance. Without that, the concept sits dormant indefinitely. The new system needs to distinguish between "waiting for buyer action" vs "actively being worked."

---

## What a ClickUp Record Represents

There are two levels of record in the current system. Plane needs to model both.

**Project card** = one sales offer. One buyer, at one retailer, for one season.  
Example: "Julie Greer at Burlington for Valentine's 2027."  
Carries: buyer name, retailer, season, license restrictions, product types offered, on-shelf date, PPS-requested date.

**SKU card** = one specific product that a buyer picked from a presentation.  
Linked to its project card.  
Carries: the full approval history from art creation through production approval.

This parent-child relationship is visible directly in the raw D1 `tasks` table and is one of the most important truths in the project:

- `Customer Refresh`: `264` parent cards, `2446` child tasks
- `Customer Category Expansion`: `78` parent cards, `428` child tasks
- `New Prod Development`: `199` parent cards, `457` child tasks
- `Licensing Management`: `7281` parent cards, `4280` child tasks

Plane needs to make this relationship explicit rather than flattening everything into one issue type.

---

## The Team (Who Uses the System)

From the live event log (Mar 30 – May 18, 2026):

| Name | Events | Role |
|------|--------|------|
| Liz (Elizabeth Parkin) | 469 | Creative Director — approves all designs and licensing sheets; primary internal gate |
| Umamaheswararao Meka | 443 | Technical Lead Designer — audits tech work, manages factory communication |
| Jennifer Chaffier (Jen) | 177 | Creative Director, Spruce Line |
| Ilona Kereki | 43 | Creative Designer / Licensing |
| Vaibhav | 30 | Designer (offshore) |
| Marcel Zabolotniy | 15 | Designer |
| Jessica Cortázar | 8 | Project Manager — manages full pipeline, stage advancement |
| Érica Perestrelo | 6 | Designer |

Full team of 18 people spans: POP Creations design, Spruce Line design, technical design, licensing, production (US + China), sales, sourcing.

---

## Pain Points the New System Must Fix

These are verbatim from employee interviews. The Plane design must address them.

### From Jessica (Project Manager)

**1. Lost preliminary designs** — "Designs are lost several times a week. We manually search past presentations to find reusable designs." Needs a searchable design library filterable by licensor, property, product type, season.

**2. Art Director bottleneck** — Five causes stack up at Liz's review queue:
- Sheets accumulate while Liz handles other responsibilities
- Liz changes artwork she already approved at the buyer stage (entire LS must be redone)
- Unfamiliarity with a product type forces consultation with other roles
- Colors approved at buyer stage get rejected at LS stage
- License property errors (e.g., Mickey and Friends art submitted under a Mickey Mouse approval)

**3. Manual stage advancement** — "I'm the only one who moves certain stages. The creative team should be able to mark their work done with the file path, and I should be able to batch-assign the next step." Plane needs role-based stage advancement so designers can move their own work forward.

**4. No incremental visibility** — "If a team member has 20 SKUs, I can't wait for them to finish all 20. I want to see when the first 5 are ready." Plane must show partial progress, not just final completion.

**5. Multi-buyer conflicts** — When two buyers pick the same design, a modified version is quietly made without tracking the relationship. Plane needs to detect and flag this.

**6. No time visibility** — "Tell me if a SKU has been stuck in one stage too long. Also if it's been at Concept Approved with no PO and no sample request for X days — that work might be wasted." SLA alerts per stage by product type.

**7. Two dates not tracked separately** — On-shelf date (when product must be in stores) and PPS-requested date (when buyer wants to see the sample) are different and both matter. ClickUp only has one date field.

**8. Costing sheet constraints not available at design time** — Designers don't know factory constraints (die lines, color count, printing technique) when designing. They find out after the LS is rejected. Constraints need to be visible during the design stage.

### From Liz (Creative Director)

**1. Missing Pantone codes** — Most common submission error. Pre-submission validation should block incomplete sheets.

**2. Designer variance** — Some designers know licensor requirements; others don't. Liz wants to see each designer's revision rate and licensor rejection patterns.

**3. Revision feedback is informal** — Corrections go via Teams messages or Illustrator markups. No structured revision history attached to the submission. Plane should store revision notes on the product card.

---

## Key Data From ClickUp

This is what the data reveals that the Plane design should reflect:

**Revision rates by licensor** (avg concept revisions per product):
- SEGA: 1.00 — every product needs revision
- Marvel: 0.43
- Peanuts: 0.38
- DC Comics: 0.31
- Disney: 0.26
- Star Wars: 0.19

**Licensor turnaround times:**
- Disney / LucasFilm / Marvel: 1–3 days
- Nickelodeon / Coca-Cola: 3–6 days
- NBC Universal / Warner Bros: 5–10 days
- Peanuts / SEGA / WWE / Care Bears: 7–10 days
- One Piece (TOEI): 7–15 days

**SLA targets by product type (from Jessica)** — full table in `BUSINESS_INTELLIGENCE.md` Section 10. Key example:
- Simple wall art (stretched/framed/plaque/block): Brief 10 min, Design 30 min, Art File 30 min, Licensing Sheet 75 min
- Complex products (functional, photo frames, storage): Brief 20–30 min, Design 60 min, LS 100–150 min
- Revisions add 30–60 min depending on product type

**Pipeline aging (active products, as of May 2026):**
- Pre-production products: avg 350 days in pipeline (max 975)
- Production products: avg 328 days (max 1,720)
- SKU Created stage: 246 products averaging 1,011 days (2.8 years) — likely abandoned but never closed

**File storage:** Design files live on a Synology NAS (`S:\[Licensor]\[Season]\[Project]\`). There is also a DAM system that generates thumbnails stored on DigitalOcean Spaces (S3-compatible). Plane should display thumbnails and NAS paths — no need to re-upload full files.

---

## Round 3 Interview Questions (Pending in D1)

These questions are inserted into the `interview_questions` table in D1 with `status = 'pending'`. They represent the gaps in understanding that still need to be filled before the Plane design can be finalized. The interview system to deliver them is being built separately (`u2giants/bizanalysis`).

**Current status as of 2026-05-19:**

- Jessica: `21` answered, `11` pending
- Liz: `15` answered, `0` pending
- Jen: `0` answered, `12` pending

### For Jessica (Project Manager) — 6 questions

| Topic | Question |
|-------|----------|
| PI approval | What is Product Integrity (PI) approval? Only 45 of 9,000 products have it. Is it legacy or product-specific? |
| Routing tags | 104 tasks are tagged "for adam." What does that mean — routing to sales, or something else? |
| Dormant products | 1,574 products at "Concept Approved" with no next step. What triggers advancement vs permanent dormancy? |
| Product lifecycle | Some products have been open 4–5 years. Are they active, or just never closed? How do you decide to cancel? |
| Costing sheet | Who creates it and when? How does a designer find factory constraints before designing? |
| Brand Assurance | What is the Brand Assurance checkpoint? Who does it and when? |

**Additional questions added on 2026-05-19:**

| Topic | Question |
|-------|----------|
| SKU creation trigger | What exact business event creates a child SKU under a project card? |
| Reuse / derivatives | If a design is reused or adapted for another buyer, should it be the same SKU, a linked derivative, or a separate SKU? |

### For Liz (Creative Director) — 6 questions

| Topic | Question |
|-------|----------|
| Role evolution | Sarbani had a formal "sarbani_approval" checkpoint. Do you perform the same step? How has the CD role changed? |
| File access | Do you need full-size design files, or is a thumbnail + NAS path enough for approvals? |
| Brand Assurance | What is Brand Assurance — do you perform it? |
| Designer visibility | Would revision rates / licensor rejection patterns per designer be useful to see? |
| Revision workflow | Would in-system revision notes attached to the submission change how you work vs Teams markups? |
| Wholesale channel | Do Stallion Art / Iconick products (sublicensors) go through any different review process? |

### For Jen (Spruce Line CD) — 10 questions (new — never interviewed before)

| Topic | Question |
|-------|----------|
| Full process | Walk me through the Spruce Line from idea to production — start from the beginning |
| Daily routine | What do you open first in ClickUp? What are you trying to find out? |
| Task structure | Do you track individual products, collections, or presentations? What does one ClickUp task represent? |
| Decision flow | How does a product get from "design done" to "buyer approved" to "in production"? Who moves it forward? |
| Approvals | No licensor involved — what are the approval steps? Who signs off before buyer? Before production? |
| Pain point | What's the single most frustrating thing about managing products today? |
| Brand identity | What is "Edge Generic"? Is "Edge" the brand name for the Spruce Line? |
| Buyer selections | When a buyer makes selections — does that get tracked in ClickUp or somewhere else? |
| Wishlist | If you could have any tool you don't have today, what would it be? |
| File workflow | When you finish designing something, what do you do with the file? |

**Additional questions added on 2026-05-19:**

| Topic | Question |
|-------|----------|
| Reuse model | When a Spruce design or collection is reused for multiple buyers, should that reuse be a duplicate, derivative, or same record? |
| Selection split | If a buyer likes only part of a collection, what should become the execution unit in the new system: project, collection, or SKU? |

**Design implication:** The Spruce Line workflow in Plane cannot be finalized until Jen's interview is complete. The data suggests her ClickUp tasks track collections/presentations (names like "Gaming - updated 10.27.25", "BCF - Kim/Anna - New Formats") rather than individual SKUs. Whether Plane should model Spruce Line as collections-of-designs vs individual products is unknown until Jen answers.

---

## Requirements for the New System

### Must-Have

- **Project-SKU hierarchy** — Every SKU belongs to a project (buyer + retailer + season). Project carries context; SKU carries approval history.
- **Two date fields per SKU** — On-shelf date and PPS-requested date are separate and both required.
- **Full 17-stage pipeline** — All stages as explicit states in Plane. Each stage knows its expected duration by product type.
- **Stage-overdue alerts** — Surface to PM when a SKU exceeds SLA for its current stage. Alert separately when a SKU has been at "Concept Approved" with no PO and no sample request beyond a threshold.
- **Design library** — Searchable repository of all preliminary designs including passed-on/rejected ones. Filterable by licensor, property, product type, season, retailer. Designs are independent of buyer selections.
- **Pre-submission validation** — Block submission to Liz's queue if Pantone codes or required manufacturing specs are missing.
- **Costing sheet constraints at design time** — Factory constraints (die lines, color count, printing technique) visible to designers while they work, not after the LS is rejected.
- **Batch stage advancement** — PM can move multiple SKUs to next stage in one action.
- **Incremental visibility** — Designers mark individual SKUs ready; PM sees partial progress in real time.
- **Creative Director review queue** — All sheets pending Liz's review, sorted by age. Status: pending / revision sent / approved.
- **Change-of-hands history** — When a different designer takes over a SKU, the system records who did what and when.
- **DAM thumbnail integration** — Thumbnails from the existing DAM (DigitalOcean Spaces S3) displayed on product cards. Full-size files stay on the NAS; Plane shows the thumbnail and the NAS path. No re-uploading.

### Should-Have

- **PM dashboard** — Bottleneck view, designer workload, retroactive deadline calculator.
- **Multi-buyer conflict detection** — Alert when two active projects select the same design.
- **Structured revision notes** — In-system revision comments attached to specific submissions, replacing Teams messages.
- **Role-specific views** — Designer, Creative Director, PM, Sales each see a tailored workspace.
- **Notifications** — When Liz approves → notify designer + licensing coordinator. When licensor responds → notify PM.
- **Wholesale sublicensor support** — Stallion Art / Iconick products use the same pipeline but need routing tags and separate views.

### Nice-to-Have

- **Designer productivity metrics** — Pick rate, revision rate, avg stage completion time, licensor familiarity score per designer.
- **Natural language queries** — Jessica's specific queries (see `BUSINESS_INTELLIGENCE.md` Section 13 for verbatim examples).

---

## How to Access All the Data

### D1 Database (ClickUp data)

**Database ID:** `c37aeb36-e16e-416b-b699-c910f6f8dc10`  
**MCP tool:** `mcp__9a4e64b3-8b0d-4708-9ca2-19515b76966e__d1_database_query`

```json
{ "database_id": "c37aeb36-e16e-416b-b699-c910f6f8dc10", "sql": "SELECT ..." }
```

Uses SQLite syntax. Always add `WHERE is_internal = 0` to exclude the internal dev space.

**Key tables:**
- `products` (9,069 rows) — primary query surface, but not perfect one-row-per-business-product truth
- `workflow_stages` (76 rows) — maps raw ClickUp status strings to clean stage names
- `checkpoint_map` (27 rows) — formal milestone definitions
- `events` (1,255 rows) — live webhook events with real user names
- `interview_questions` (59 rows) — all answered and pending interview content

Full table reference: `DATA_ACCESS_GUIDE.md` in this repo.

### Key documents in this repo

| File | What it contains |
|------|-----------------|
| `BUSINESS_INTELLIGENCE.md` | **Read this first.** Full synthesis of everything known about the company — pipeline, team, pain points, SLA targets, licensor data, requirements. |
| `DATA_ACCESS_GUIDE.md` | How to query the D1 database; every table with column descriptions and sample queries |
| `SCHEMA_DESIGN.md` | The proposed robust D1 schema (what a well-designed schema looks like) |
| `DB_ANALYSIS.md` | Original analysis of the raw ClickUp database |
| `DATA_GAPS_AND_FIXES.md` | Known data quality issues and webhook bugs fixed |
| `AI_OPERATING_RULES.md` | Rules for working in this repo (single branch = main, Coolify for runtime config, etc.) |

### Live Worker (for querying data via HTTP)

`https://plane-integrations.u2giants.workers.dev/query` — POST with `{ "question": "..." }` for natural language → SQL → answer.

### Production Plane instance

Deployed on Coolify at `178.156.180.212`. Coolify REST API:
```
Base URL: http://178.156.180.212:8000/api/v1
Auth: Bearer 1|mlVx9mbwsN1Sga6eLtJEvmPioy6Sra9AnepnCe3K7d0a2927
Server UUID: onwp0kd7w1w74w9yeotnoihp
```

---

## What This New Session Should Do

### Primary objective
Design how Plane should be structured to serve this company's real workflows. This means making concrete decisions about:

1. **Workspace structure** — How many projects? How are POP Creations and Spruce Line separated? Are projects per-licensor, per-retailer, per-product-line, or something else?

2. **States (pipeline stages)** — Plane uses "states" instead of ClickUp statuses. Map the 17 POP Creations stages to Plane states. Define the Spruce Line states (pending Jen's interview, but design what's known).

3. **Issue types / hierarchy** — Plane has "issues" with optional sub-issues. How do "project cards" (buyer + retailer + season) and "SKU cards" map to Plane's data model? Is a project card a Plane Project, or a parent Issue?

4. **Custom fields** — What custom fields does each issue type need? (On-shelf date, PPS-requested date, licensor, retailer, product type, put-up/manufacturing method, factory, costing constraints, etc.)

5. **Cycles and modules** — Plane supports cycles (sprints) and modules (groupings). Are licensor submissions a "module"? Are seasonal deadlines a "cycle"?

6. **Views** — Define the key views for each role: PM dashboard, CD review queue, designer workload, licensing tracker.

7. **Automation** — What stage transitions should trigger notifications? What validations should block advancement?

### Critical modeling warning

Do not start by asking "how do we map ClickUp lists to Plane projects?"

Start by asking:

- what is a project brief?
- what is a preliminary design?
- what is a reusable concept?
- what is a picked SKU?
- what is a derivative SKU for another buyer?

The replacement system will only be materially better than ClickUp if those domain objects are made explicit.

### What to decide before writing any code

- Whether the 17-stage pipeline maps to a single Plane project with 17 states, or multiple projects with fewer states each
- Whether the Project Card / SKU Card hierarchy is Plane Projects > Issues, or Epic > Stories, or something else
- How Spruce Line is modeled (blocked on Jen's interview — but define the options)
- What the design library looks like in Plane's data model

### What NOT to do in this session

- Do not design or implement the AI interview system (that's `u2giants/bizanalysis`)
- Do not modify the Cloudflare Worker or D1 schema for interview purposes
- Do not make decisions about Round 3 interview delivery — those answers are pending

---

## Key Design Decisions Still Open

1. **Spruce Line model** — Collections vs individual SKUs. Cannot finalize until Jen is interviewed. Design both options so one can be selected.

2. **"Concept Approved" limbo state** — 1,574 products are approved but waiting indefinitely for a buyer PO. Does Plane need a special "parked" state, or a time-based alert when a product sits here too long?

3. **Sarbani approval checkpoint** — There is still a formal `sarbani_approval` checkpoint in the D1 system from the previous Creative Director. Whether Liz has absorbed this role or it's been eliminated is unanswered. Confirmed in Round 3 Liz question.

4. **Brand Assurance** — Referenced in both the D1 checkpoint map and the Round 3 questions. No one has explained what it is yet. Cannot model it until Jen or Liz answers.

5. **PI (Product Integrity) approval** — Only 45 of 9,069 products have it. Likely product-type-specific. Cannot model it until Jessica answers.

6. **Costing sheet workflow** — Who creates it, when, and how it connects to the product card. Cannot design the data model for factory constraints at design time until Jessica answers.

7. **File access in Plane** — Does Liz need full-size files accessible in Plane, or are thumbnails + NAS path sufficient? Determines whether Plane needs DAM integration or just a text field for the path.
