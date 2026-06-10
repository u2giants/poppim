# PM System Design — From ClickUp to a Tailored PM Platform

> **⚠️ PLATFORM SUPERSEDED — needs re-targeting.** This document is written against **Plane**, which we evaluated and **rejected** (see `plane-free-edition-gaps.md`). The chosen platform is now **Directus** (see `platform-decision-report.md` for *why* and `directus-execution-plan.md` for *how*). The **requirements, pain points, data model, and feature list below remain valid** — only the *Plane-specific* mechanics (Issue Types, the 2.x constraints, the Plane build list) are obsolete. This doc is queued to be re-targeted from Plane to Directus.

**Purpose.** This document is for whoever builds the company's replacement project management system. It covers the **software**: how the team uses **ClickUp** today, what's broken about that, and how to tailor the chosen PM platform into the most efficient system for *this* company — specifically, into the system Jen, Jessica, and Liz actually want.

**Read the companion first.** `business-process.md` explains the business and the workflow with no software in it. This document assumes you've read it and uses its vocabulary (offer/project, SKU, design collection, style number, licensing sheet, Brand Assurance, PI, PPS, on-shelf date). Every feature below traces back to a pain point documented there.

**Two scopes, one platform.** The system must serve **POP Creations** (licensed, heavyweight, Jessica + Liz) and **Spruce Line** (generic, lightweight, Jen) with their different data models — without forcing one line's process onto the other.

---

# PART 1 — The Current System (ClickUp) and Why It's Being Replaced

## 1.1 How ClickUp is structured today

The team runs everything in **ClickUp**, organized into three **Spaces**:
- **POP Creations** — the licensed line.
- **Spruce Line** — the generic line.
- **designflow** — internal software/dev work (not product work).

Within those spaces, work lives in **Lists**, which behave very differently from pure product lists — most are really **project/presentation/brief records with many child SKU tasks beneath them.** The key lists and their scale (this defines migration scope):

| List | Space | Records | Active | What it really is |
|---|---|---|---|---|
| Licensing Management | POP | 7,281 | ~8 | Primary SKU tracking for all licensed products |
| Edge Generic | Spruce | 701 | ~123 | Primary Spruce design tracking (note: "Edge" = old Spruce name) |
| Customer Refresh | POP | 264 | ~93 | Buyer-requested refreshes |
| Licensing Administration Tasks | POP | 236 | ~41 | Admin/coordination |
| New Prod Development | POP | 199 | ~26 | Internal new-product development |
| Freelancers Generic | Spruce | 111 | ~17 | **Dead** — failed freelancer-tracking experiment (do not model as live) |
| Customer Category Expansion | POP | 78 | ~12 | Buyer requests for new categories |
| General Presentations | Spruce | 48 | ~26 | Account-agnostic presentations staged for sales (Adam) to self-serve |

**The parent/child structure is real and load-bearing** (counts of parent records vs. child tasks):
- Customer Refresh: 264 parents / 2,446 children
- Customer Category Expansion: 78 / 428
- New Prod Development: 199 / 457
- Licensing Management: 7,281 / 4,280

This is the most important structural fact in the whole migration: **ClickUp flattens "offer/project" and "picked product/SKU" into one task type.** The replacement must model them as two distinct things.

## 1.2 How each line uses ClickUp

**POP (Jessica/Liz):**
- Work moves between **status columns** that correspond to the 17 pipeline stages (see `business-process.md` §5 and the stage list in §3.2 below).
- Products carry a structured **SKU code**: `[FORMAT][SIZE][LICENSOR][PROPERTY][MATERIAL][##] [description + dimensions]` — e.g., `GFZ80MVAV01 Marvel printed glass Avengers… 8x10"`, `MTC3ADYPN02 Disney MDF die-cut block Groovy Princess Tiana 3x4"`.
- **Tags** carry most of the metadata and routing logic — licensor, channel, and workflow signals (see §1.3).
- Custom fields hold things like sample-request count, retailer/customer, factory, put-up (packaging), and category — but coverage is sparse.

**Spruce (Jen):**
- The board is organized **by lifecycle stage**, and the top priority field is work "in development for a PO."
- One task = one account-specific project **or** one general internal-development project. Title convention: **ACCOUNT – BUYER – PROJECT TITLE – STATUS NOTES** (e.g., "Forman Mills - Jennifer - Wall Art - SENT TO ADAM").
- Presentations are attached as **dated PDFs**; the date is repeated in the task title and filename so sales always uses the latest ("Cowgirl Country - updated 6.11.25").
- A separate **General Presentations** board holds account-agnostic trend art for sales to self-serve, organized by format → theme.
- When a buyer commits, items get a **style number**, and all files become findable by it; art files are filed in an art library by theme (florals, abstracts, sports…).

**Spruce stage columns (verbatim board order):** Send Out Art for PO → Approved for Future Orders → Sample Received → Sample Requested → Price Requested/Buyer Approving → **Initial Approval/Selections Made** ("Int Approval" in ClickUp is *Initial*, not "Internal") → With Buyer for Approval → Waiting for Factory → In Work → Upcoming Projects → On Hold.

## 1.3 Tags — the de-facto metadata layer (POP)

ClickUp tags do the work that typed fields should. They cluster into three groups, and the migration must convert them into proper structured attributes:

- **Licensor / property routing:** `disney` (3,574), `marvel` (2,125), `wb` (1,208), `star wars` (1,095), `nick` (495), `nbcu` (491), `sega` (341), `peanuts` (272), `strawberry shortcake` (142), `one piece` (89), `coca cola` (50) → become a **Licensor** attribute.
- **Channel / workflow routing:** `customer refresh` (1,516), `on po` (356), `customer category expansion` (182), `for licensor` (160), `prod development` (142), `internal approval` (133), `packaging submitted` (105), `packaging approved` (65), `stallion art wholesale only` (62), `iconick only` (5), `for factory` (39), `template` (33) → become **channel**, **stage milestones**, or **routing flags**.
- **Stale / to-drop:** `for adam` (104) is **outdated** — all client designs go to sales now; do **not** carry it forward as a live routing signal.

## 1.4 Files, costing, and off-system communication

- **Design files live on a Synology NAS**, never in ClickUp. Designers paste the NAS path into a comment when work is done (`S:\[Licensor]\[Season]\[Project]\…`, UNC `\\edgesynology1\files\shared\…`). A separate **DAM** thumbnails every NAS file and stores the thumbnails on DigitalOcean Spaces (S3-compatible).
- **Costing/pricing runs in DesignFlow**, a separate piece of software (it even has its own ClickUp space). Albert manages it. It's a named bottleneck — when DesignFlow pricing isn't updated, buyer approvals stall (Jen's worst recent bottleneck was Burlington Storage Bodies stuck a week on DesignFlow).
- **Communication and approvals happen off-system** — in Microsoft Teams (messages, calls, Illustrator markups) and email. This is the core fragmentation problem: the record of *why* things happened is scattered across ClickUp + Teams + email + the shared server + DesignFlow.

## 1.5 What's structurally broken about ClickUp for them

1. **Flat task model** — no real separation of offer/project from picked product/SKU; the hierarchy is faked with parent/child tasks.
2. **Designs get lost** — an unpicked preliminary design only exists inside the one buyer presentation it was made for; there's no design library.
3. **No bulk operations** — Jessica must open each SKU individually to advance a stage or assign a designer.
4. **No time-in-stage / on-track visibility** — the system shows current status but not how long something has been stuck or whether it will make its on-shelf date.
5. **No formal cancel** — dead products sit open for years; no required closure reason.
6. **No revision tracking** — feedback lives in Teams/email/markups, not on the record.
7. **No role-appropriate field visibility** — e.g., designers should see manufacturing constraints but not pricing.
8. **Scattered records** — five places to look for the truth.
9. **Adoption is fragile** — prior attempts to push updating onto the team failed because the tool was hard and discipline was assumed.

## 1.6 Current data realities (migration scope)

The existing data has been analyzed; the realities that shape the migration:

- **~9,069 products total; only ~300 active at any time.** Most records are historical.
- **Large dormant pools:** ~1,574 at "Concept Approved" with no order or sample (approved-but-unsold inventory, not dead); ~2,387 "Pre-Production Approved"; ~2,175 "Production Approved" (completed).
- **Very old open items:** ~246 products average ~2.8 years (1,011 days) open at early stages; some are 4–5 years old — almost all are unclosed-but-dead and need a bulk "Abandoned" closure on import.
- **Sparse fields:** `buyer` is stored as opaque IDs, not names; `product_category` is populated on only ~57 of 9,069; `retailer` on ~200. The new system must capture these as first-class structured fields going forward, and backfill where possible.
- **Dead boards:** Freelancers Generic is abandoned — archive, don't model.
- **PI is tracked on only ~45 of 9,069** because most licensors don't require it — confirming it must be a three-state field (Required/Not Required/Completed), not a checkbox.

There is also an **existing analytics layer** worth keeping: a Cloudflare Worker + D1 database ingests ClickUp webhooks and runs a natural-language "ask a question" query endpoint. It's the foundation for the AI assistant features (§3 below) and should run alongside Plane, not be thrown away — see §5.

---

# PART 2 — Plane: What It Gives You and What It Doesn't

Before mapping the business onto Plane, here is an accurate account of Plane's data model and its **hard constraints**, verified against this Plane codebase. The constraints drive most of the "build vs. configure" decisions.

## 2.1 Plane's building blocks

| Plane entity | What it is | Useful for us as… |
|---|---|---|
| **Workspace** | Top-level org container (projects, members, labels, states, views, cycles, modules, pages, intake) | The company, or one per business line |
| **Project** | A container of issues with its own states, labels, cycles, modules, members | A business line (POP / Spruce), or a major list |
| **Issue** | The core work item; has a `parent` self-reference for sub-issues | Offer/project cards **and** SKUs/products |
| **Issue Type** | Workspace-level classification of issues; can mark an "epic" | Distinguishing "Project Card" vs. "SKU" vs. "Design" |
| **State** | A workflow status, grouped into backlog / unstarted / started / completed / cancelled / triage; **fully customizable per project**, unlimited states | The 17 POP stages and the 11 Spruce stages |
| **Label** | A tag; **hierarchical** (labels can have parent labels); project- or workspace-scoped | Licensor, property, theme, season (categorical only) |
| **Cycle** | A **time-boxed** container (start/end dates) | Seasons |
| **Module** | A **non-time-boxed** grouping with its own status, a lead, and members | Licensors, themes, or collections |
| **View** | A **saved filtered view** (filters + grouping + layout), project- or workspace-scoped, private or shared | "My SKUs in Licensing Sheet Review," "Liz's queue," etc. |
| **Intake** | A triage inbox (pending / accepted / rejected / snoozed / duplicate) | Incoming buyer requests / new submissions |
| **Estimate** | Project-scoped points or categories on issues | Effort sizing (not time logging) |
| **File asset** | Attachments via S3-compatible storage | NAS-path links + DAM thumbnails (see §4.5) |
| **Webhook / REST API** | Workspace webhooks (HMAC-signed, HTTPS) + a full REST API | Migration import, notifications, the analytics bridge |

**Built-in Issue fields you get for free:** name, rich description, priority (urgent/high/medium/low/none), state, parent, issue type, assignees, labels, start_date, target_date, estimate, sequence id, sub-issue relationships, links, attachments, comments, and a full activity/audit trail.

## 2.2 The constraints that shape the build

These are real limits in this Plane version. Plan around them explicitly.

1. **No custom typed properties (the big one).** This Plane (community edition) has **Issue Types for classification but no custom-property system** — the old `IssueProperty` model was renamed to `IssueUserProperty` (per-user view settings), and there is no model for typed custom fields (text/number/date/dropdown/relation) attached to an issue type. → **Every domain field we need that isn't a built-in — Brand Assurance number, PI status, on-shelf date, PPS-requested date, licensor, property, buyer, retailer, factory, cost target, style number, costing constraints — must be added by extending the core (a new properties model or a structured JSON field on the issue, plus UI and API).** This is the largest single piece of engineering and it is unavoidable; do not assume it can be configured.
2. **Sub-issues are one level deep by convention.** The Issue→parent self-reference has no enforced depth limit, but the UI assumes parent → child only. Our **Spruce three-tier model** (Collection → Project → Style-numbered product) therefore needs a deliberate strategy (§3.3), not naïve nesting.
3. **Bulk operations are partial.** Native bulk endpoints exist only for **delete, archive, and date updates.** **Bulk state change, bulk assignee, and bulk label** — which Jessica needs daily — must be **built** (a custom bulk endpoint over the existing per-issue PATCH).
4. **No time tracking.** There's an `is_time_tracking_enabled` flag but no real time-entry model — only effort estimates (points/categories). Our **time-in-stage and on-track** features must be **built** from state-transition timestamps (the activity log) + the SLA tables, via a background job.
5. **No field-level access control.** Permissions are role-based at the project level (Admin/Member/Guest), with no per-field visibility. The requirement that **designers see manufacturing constraints but not pricing** must be **built** (separate objects/projects with different membership, or a custom permission layer).
6. **Attachment size limit** defaults to ~5 MB. Not a blocker because full design files stay on the NAS — Plane only needs to hold **thumbnails + the NAS path** — but the import must respect it.

---

# PART 3 — Tailoring Plane to This Company

## 3.1 Workspace / project topology

Recommended: **one Workspace** for the company, with **two Plane Projects** — "POP Creations" and "Spruce Line" — so each gets its own custom states, labels, and views without bleeding into the other. (A third, "Design Library," is discussed in §3.4.) Shared people (Adam, Albert/China) are members of both.

Do **not** make each offer/SKU a Plane *Project* — there are thousands. Offers and SKUs are **Issues**, distinguished by **Issue Type**.

## 3.2 POP data model in Plane

| Business object | Plane representation |
|---|---|
| Business line | Plane **Project** "POP Creations" |
| **Offer / project card** | **Issue**, Issue Type = `Project` (the parent) |
| **SKU / picked product** | **Issue**, Issue Type = `SKU`, `parent` = its project issue (sub-issue) |
| **Preliminary design** (picked or not) | **Issue**, Issue Type = `Design`, surfaced in the Design Library (§3.4) |
| **17 pipeline stages** | Custom **States** on the POP project, grouped: ideation/brief → *backlog/unstarted*; design, review, submission, sampling → *started*; pre-production/production approved → *completed*; canceled reasons → *cancelled* |
| **Season** | **Cycle** (time-boxed) |
| **Licensor / property** | **Hierarchical Labels** (`Licensor › Disney`, `Property › Mickey Mouse`) and/or **Modules** for licensor grouping; **also** a typed Licensor custom field (see §2.2 #1) for reliable querying |
| **On-shelf date / PPS-requested date** | Two **custom date fields** (built). `target_date` can hold on-shelf; PPS-requested needs a new field. |
| **Brand Assurance #, PI status, SKU code, factory, cost target, buyer, retailer** | **Custom fields** (built) |
| **Licensing sheet, costing sheet** | Attachments / linked records on the SKU; costing constraints exposed as fields (§3.5 #9) |

The 17 POP states, in order (from `business-process.md` §5): Art files creation · Licensing sheet creation · Licensing sheet review (Liz — internal gate) · Ready to submit · Concept submitted · Revisions · Concept approved · Concept approved with changes · PO received · Sales requested sample · Sample requested · Sample received · Factory resample · Sample sent to licensor (PPS) · Sample revision · Pre-production approved · Production approved. Plus cancellation states with reasons (cost / licensing / sampling / buyer) in the *cancelled* group.

## 3.3 Spruce data model in Plane (the three-tier problem)

Spruce needs **Collection → Project → Style-numbered product**, but Plane sub-issues are one level deep by convention. Recommended approach — **don't fight the UI; use Issue Types + Modules:**

| Business object | Plane representation |
|---|---|
| Business line | Plane **Project** "Spruce Line" |
| **Design Collection** (account-agnostic theme) | **Module** (a non-time-boxed grouping with hundreds of design issues) **or** an Issue Type = `Collection`. Modules fit best because collections are long-lived groupings reused across accounts. |
| **Project** (account-specific) | **Issue**, Issue Type = `Project` (the parent) |
| **Style-numbered product** | **Issue**, Issue Type = `Style`, `parent` = its project issue |
| **Designs inside a collection** | **Issues**, Issue Type = `Design`, attached to the Collection module; **only those that get a style number** are promoted into the searchable product library |
| **11 Spruce stages** | Custom **States** on the Spruce project (board order in §1.2) |
| **Account season cadence** | **Cycles** per account where useful (Hobby Lobby's dated calendar), looser for verbal accounts (Burlington) |

This keeps the two-level parent/child (Project → Style) inside Plane's comfort zone, and uses a Module for the third tier (Collection) instead of trying to nest three deep. Critically, it honors Jen's own rule: **the searchable library holds only style-numbered items**, while the raw collection art (hundreds of designs, no high-res until requested) lives in the Collection module, not the product library.

## 3.4 The Design Library (the #1 feature)

The founding pain — lost preliminary designs — generalizes into the most important thing to build: a **searchable library of every design ever made**, independent of the presentation it was created for.

- **POP:** every preliminary design (`Design` issues), **picked or not**, filterable by licensor + property + product type + season + retailer, with a one-click "attach to a new project" action.
- **Spruce:** every **style-numbered** product (per Jen's rule), findable by style number and theme.
- **Implementation:** a dedicated **shared View** (or a dedicated "Design Library" Plane Project that `Design` issues also belong to), powered by the custom Licensor/Property/Type/Season fields from §2.2 #1 and **hierarchical Labels** for theme. Thumbnails come from the DAM (§4.5). The "attach to project" action is a small custom action that links a design issue to a new project issue (and clones it into a SKU when picked).
- **Proactive seasonal planner** rides on top: filter by **season + product type → approved-but-unsold concepts + unpicked designs → export a deck.** This is Jessica's "be proactive" wish and Jen's "design calendar from history" wish, served by the same library + the analytics layer (§5).

## 3.5 Feature build specification

Each feature below is tagged **[Configure]** (Plane setting/view), **[Build]** (new app code/endpoint/UI on top of Plane), or **[Extend-core]** (modify Plane's models). Each traces to the person and pain it serves.

| # | Feature | Serves | Effort | Notes |
|---|---|---|---|---|
| 1 | **Two-tier (POP) / three-tier (Spruce) model** | all | [Configure]+[Build] | Issue Types + parent links (§3.2/3.3); a small guard so a SKU always has a Project parent |
| 2 | **Custom domain fields** (Brand Assurance, PI status, on-shelf & PPS dates, licensor, property, buyer, retailer, factory, cost target, SKU/style code) | all | **[Extend-core]** | The single largest task; no custom-property system exists in CE (§2.2 #1) |
| 3 | **Custom per-line workflow states** | all | [Configure] | 17 POP states, 11 Spruce states, cancellation states with reasons |
| 4 | **Design Library + attach-to-project + season planner** | Jessica, Jen, Adam | [Build] | §3.4; the flagship feature |
| 5 | **Bulk stage advancement + bulk designer assignment** | Jessica | [Build] | Native bulk is delete/archive/dates only; build a bulk-PATCH endpoint + multiselect UI |
| 6 | **Time-in-stage + on-track indicator + stuck/dormant alerts** | Jessica | [Build] | From state-transition timestamps + the SLA tables (`business-process.md` §6, §8) + a background job; alert when a stage exceeds its product-type SLA, or "Concept Approved" sits with no PO |
| 7 | **Creative Director review queue + submission checklist** | Liz | [Configure]+[Build] | A saved View of everything awaiting Liz, sorted by age, with time-in-stage; plus a **submission checklist/to-do** (the thing she explicitly asked for) and one notes home. **Do not** impose a checklist on her aesthetic judgment. |
| 7b | **Spruce "in development for a PO" priority view** | Jen | [Configure] | Her top board field as a saved View |
| 8 | **Cancel state with required reason** | all | [Configure]+[Build] | Cancellation states (§3.2) + a required-reason prompt on transition; bulk "Abandoned" for the migration |
| 9 | **Costing/constraint linkage with role-based visibility** | Jessica, designers | [Build]+[Extend-core] | Surface die lines / color count / printing technique / materials to designers at design time; **pricing visible only to sourcing/sales** — needs the field-level visibility Plane lacks (§2.2 #5); also surface DesignFlow status |
| 10 | **Multi-buyer conflict detection** | Jessica | [Build] | Alert the instant two project issues reference the same design; fingerprint on design id/licensor/property |
| 11 | **Brand Assurance + PI handling** | licensing team | [Extend-core] | Fields from #2; Brand Assurance required once at "Concept submitted," reused at production; PI three-state with per-licensor default of "Not Required"; keep it out of Liz's views |
| 12 | **Role-scoped views & "assigned to me"** | all | [Configure] | Per-role saved Views; preserve "assigned to me" and **color-coding** (both explicitly wanted); respect that licensing-only data (Brand Assurance) is invisible to Liz |
| 13 | **Next-person notifications + incremental progress** | all | [Configure]+[Build] | On stage completion, notify the next role (Plane notifications + webhooks); show partial progress within a batch (the "first 5 of 20" requirement) |
| 14 | **Structured revision notes on the record** | Liz, Jen | [Configure] | In-record comments/threads replacing Teams + Illustrator markups + email; the win is consolidation, not fewer clicks |
| 15 | **Capacity / workload view** | Jessica | [Build] | Designer assignments, who's overloaded, surge reallocation (the Hobby Lobby/Ollies problem) |
| 16 | **CSV export + bulk thumbnail/mockup download** | Jessica | [Build] | Filtered view → CSV of fields; download all mockups in a view at once |
| 17 | **Sales status view for Adam** | Adam | [Configure] | Cross-line project-status view he can self-serve ("exact status of all projects") |
| 18 | **Designer track-record analytics** | Liz | [Build] | Revision/rejection patterns per designer (reuse the analytics layer, §5) |
| 19 | **Wholesale-sublicensor handling** | Liz | [Configure]+[Build] | Flag Stallion Art / Iconick; structure feedback for external designers who don't know licensing rules |
| 20 | **AI natural-language assistant** | all | [Build]/[Reuse] | Keep the existing D1/Worker NL query endpoint; point it at synced Plane data; ship the verbatim queries in §3.6 |

## 3.6 The AI assistant — verbatim queries to support

The existing natural-language query layer (§5) should answer these on day one.

**Jessica (POP):** "How many SKUs have a licensing sheet but the art director hasn't sent it to the licensing team?" · "How many SKUs have tech packs for factory but the art director hasn't confirmed which factory to send to?" · "List of all projects for the same retailer." · "Which designer created more designs this week?" · "Which designer has the least picks from buyers in the last month?" · "Summary of this project" → *"Total SKUs 27; 20 sample requested, 3 concept approved, 4 concept submitted; next action: send the 3 approved concepts to the factory."*

**Liz (POP):** "Which designs were submitted to the licensor but have no response in X days?" · "Which designer has the highest revision/rejection rate?"

**Jen (Spruce):** "What's the actual timing to get pricing and samples?" · "Status of all sample requests at the factory." · "Build a design calendar from previous years' project timing."

**Operational:** "Which concepts are approved but have no PO and no sample request?" (the ~1,574) · "Which licensor has the most outstanding submissions?" · "Which products have been stuck in the same stage 30+ days?"

---

# PART 4 — Migration & Architecture

## 4.1 What to migrate vs. archive

- **Migrate active + recent:** the ~300 active products, their parent projects, open offers, and the dormant-but-reusable "Concept Approved" pool (so the design library is useful from day one).
- **Bulk-close the ancient dead items** (4–5-year-old open records) on import with a default **"Abandoned"** closure reason — don't import them as live work.
- **Archive, don't model:** Freelancers Generic (dead) and the `designflow` software space (not product work).
- **Preserve identity:** keep every SKU code / style number exactly (SKU codes are the licensor approval record and must be immutable).
- **Backfill structured fields** from tags (§1.3) and from the existing analyzed data: convert licensor tags → Licensor field, channel tags → channel/flags, resolve buyer IDs → names where possible. Drop the stale `for adam` tag.

## 4.2 Import mechanism

Plane exposes a **REST API** and every entity has **`external_source` / `external_id`** fields built for exactly this. Use them:
1. Pull from the existing ClickUp snapshot/D1 data (the analytics layer already holds a clean, denormalized copy).
2. Create Plane projects/issues/states/labels/modules/cycles via the API, stamping `external_source="clickup"` and `external_id=<clickup id>` so records stay traceable and re-syncable.
3. Import order: states & labels & issue types → projects (offers) → SKUs (as sub-issues) → designs → attachments (thumbnails + NAS paths) → custom fields.

## 4.3 File storage

- Point Plane's S3 storage at **Cloudflare R2** (`AWS_S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com`, bucket `plane-uploads`) — R2 is S3-compatible and Plane picks it up automatically. Remove Plane's bundled MinIO service.
- **Full design files stay on the NAS.** Plane holds the **DAM thumbnail** (already on DigitalOcean Spaces) and the **NAS path** as a link on the record. Don't try to push multi-hundred-MB design files through Plane (and its ~5 MB attachment limit).

## 4.4 Keep the analytics + NL-query layer alongside Plane

There's an existing **Cloudflare Worker + D1** system that ingests ClickUp webhooks and serves a natural-language "ask a question" endpoint. **Keep it and re-point it at Plane:**
- Subscribe to **Plane webhooks** (issue/project/module/cycle/comment events; HMAC-signed) to stream changes into the analytics store, replacing the ClickUp webhook feed.
- The NL `/query` endpoint then answers §3.6's questions over live Plane data.
- This division is deliberate: **Plane = system of record + workflow; the analytics layer = reporting, alerts, and the AI assistant.** Time-in-stage, SLA alerts, designer track records, and the seasonal planner all live more naturally in the analytics layer reading Plane's data than inside Plane.

## 4.5 Target architecture (planned)

- **Plane** on **Coolify**, backed by its bundled **PostgreSQL / Redis / RabbitMQ**, behind Coolify-managed Caddy (auto SSL), `GUNICORN_WORKERS=2` on the shared server.
- **Cloudflare R2** for Plane file storage (thumbnails + small attachments); **NAS** for full design files; **DAM** for thumbnail generation.
- **Cloudflare Worker + D1** retained for webhook ingestion, analytics, alerts, and the NL assistant — now fed by Plane webhooks.
- **DesignFlow** remains the costing/pricing system for now; the goal is to **surface its status** in Plane (and eventually integrate or replace it), since it's a recurring bottleneck.

---

# PART 5 — Build Roadmap

Ordered so the system is usable early and the highest-pain items land first. Tags as in §3.5.

**Phase 0 — Foundation (system is unusable without these)**
1. Workspace + two Projects (POP, Spruce); per-line custom **States** [Configure]
2. **Issue Types** (`Project`, `SKU`/`Style`, `Design`, `Collection`) + parent-link guard [Configure]+[Build]
3. **Custom domain fields** [Extend-core] — the gating engineering task
4. Migration import from ClickUp/D1 with `external_id`, field backfill, bulk-Abandoned for dead items [Build]
5. R2 storage + NAS-path/DAM-thumbnail linkage [Configure]+[Build]

**Phase 1 — The core friction-killers**
6. **Design Library** + attach-to-project [Build] — the flagship
7. **Bulk** stage advancement + designer assignment [Build]
8. **Time-in-stage / on-track / stuck & dormant alerts** via the analytics layer [Build]
9. **Cancel with required reason** [Configure]+[Build]
10. **Creative Director queue + submission checklist** (Liz) and **Spruce PO-priority view** (Jen) [Configure]+[Build]
11. **Brand Assurance + PI fields**, role-scoped so licensing-only data stays out of Liz's views [Extend-core]+[Configure]

**Phase 2 — High-value**
12. **Multi-buyer conflict detection** [Build]
13. **Costing/constraint linkage** with designers-see-specs-not-pricing visibility [Build]+[Extend-core]
14. **Next-person notifications + incremental-progress visibility** [Configure]+[Build]
15. **Structured revision notes** [Configure]
16. **Capacity/workload view** (Jessica) [Build]
17. **CSV + bulk thumbnail export** [Build]

**Phase 3 — Differentiators**
18. **AI assistant** wired to the §3.6 queries over Plane data [Build/Reuse]
19. **Proactive seasonal planner** (POP decks; Spruce design calendar) [Build]
20. **Sales status view for Adam**; **designer track-record analytics**; **wholesale-sublicensor handling** [Configure]+[Build]

---

# PART 6 — Design Principles & Traps to Avoid

**Principles**
1. **One source of truth.** The deepest shared pain is fragmentation (ClickUp + Teams + email + shared server + DesignFlow). Every feature should pull information *into* Plane, never add a sixth place to look.
2. **Two businesses, one platform.** Configure per line; never force POP's licensor weight onto Spruce or Spruce's collection model onto POP.
3. **Support expertise, don't replace it.** Liz and Jen run on judgment. Give them visibility, tracking, and consolidation — never a rubric that gates their craft.
4. **Make the easy path the correct path.** Adoption failed before because the tool was hard and discipline was assumed. Incremental updates, bulk actions, and next-person nudges must be *less* work than the workaround.
5. **Nothing gets lost.** Every design, decision, note, and stalled item stays findable, attributable, and reusable.
6. **Plane is the spine, not the whole skeleton.** The custom-property gap, time-in-stage, alerts, conflict detection, and the assistant are all things you build *on* Plane — budget for real engineering, not just configuration.

**Traps to avoid (each is a documented wish that's easy to get wrong)**
- **Don't force a checklist on Liz's *aesthetic review*** — but **do** give her a submission *tracking* checklist and a single notes home. These are different things; conflating them was an earlier mistake.
- **Don't auto-validate everything.** Templates already fixed most wrong-property errors; over-validation adds friction. **Auto-check Pantones specifically** — that's Liz's real everyday error.
- **Don't drop "assigned to me" views or color-coding** — both must carry over from ClickUp.
- **Don't rely on real-time discipline.** People batch-update; make incremental updates the easy path and show partial progress.
- **Don't model dead boards as live** (Freelancers Generic) or treat the POP licensor pipeline as universal (Spruce has none).
- **Don't bury pricing in front of designers, or hide constraints from them** — the field-visibility split is the whole point of the costing feature.
