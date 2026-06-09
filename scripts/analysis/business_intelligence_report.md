# Business Intelligence Report
**Sources:** ClickUp webhook behavioral data (Mar 30 – May 14, 2026) · PM interview rounds 1 & 2 · Owner clarifications
**Written:** 2026-05-14 · **Last updated:** 2026-05-14
**Purpose:** Define how the business works, map the real process, identify pain points, and specify how the replacement PM system should do better. Drives all Plane build decisions.

> **Convention:** Questions still needing answers are marked `[OPEN — ask: Person]`. Replace with findings when answered; remove the marker.

---

## 1. How the Business Works

### Two product divisions, one dev team

**POP Creations** makes licensed home decor products carrying IP from Disney, Warner Bros., Paramount, Marvel, and others. Every product must be formally approved by the licensor at multiple pipeline stages before it can be sold. This licensor approval process — concept submission, pre-production sample approval, production approval — is the single largest source of work volume, delay, and coordination overhead in the business.

**Spruce Line** makes non-licensed home decor. No licensor. Simpler pipeline, lower overhead. Buyers approve directly.

**designflow** is the internal dev team (2 developers) building this platform. Separate workflow, not product business. Team is based in India (confirmed by behavioral data: activity peaks at 9–10 UTC = 2:30–3:30pm IST, and Sundays are as active as Mondays).

### Team geography

| Location | Who |
|----------|-----|
| Germany | Jessica (Project Manager) |
| Eastern US | Designers (confirmed: multiple users in UTC-4/UTC-5 peak window) |
| São Paulo, Brazil | Designers |
| Colombia | Designers |
| India | Programming team (designflow) |
| External | Factories |

**Implication for the system:** SLA clocks, notification windows, and "business day" calculations cannot assume Mon–Fri or a single timezone. The system must either work in UTC or allow per-user timezone configuration, and SLA definitions should count calendar days, not business days, unless explicitly configured otherwise.

**Note on ClickUp identity:** The behavioral data shows "Umamaheswararao Meka" as the single most active user (200 actions — 54% of all recorded events), primarily status updates and task moves. Jessica (the PM) appears as "Jessica Cortázar" with only 4 recorded actions. This suggests Uma may be a ClickUp coordinator or admin who performs data entry on behalf of the team, not a separate project manager. `[OPEN — ask: Jessica]` *Who is Uma and what is her actual role? Is she doing ClickUp data entry on your behalf, or is she a separate coordinator?*

### Two ways a product enters the pipeline

There are two distinct origins for new work. The system must support both as first-class workflows:

**Path A — Buyer-initiated (reactive):**
A buyer at a retailer requests products for a specific occasion. Example: "Dollar General wants a Halloween plush assortment for Fall 2027." The sales manager brings this to the PM. A project is opened anchored to: buyer + retailer + occasion/season. All creative work for that inquiry flows under this project.

**Path B — Internal line refresh (proactive):**
The design team decides the existing product line needs updating before any buyer asks. This includes:
- Refreshing designs on existing product types (updating art for a plush line that hasn't changed in two seasons)
- Experimenting with entirely new product types the company hasn't made before

In Path B there is no buyer yet. The project is not anchored to a buyer — it's anchored to: product category + licensor/property + season target. The output of this work feeds into the design library, where it waits to be presented to buyers in future sales conversations.

`[OPEN — ask: Jessica]` *In Path B (internal refresh), who makes the decision to start a new proactive design push? Is it the art director, the sales manager, you, or a group decision? And is the output always presented to buyers later, or do some internal refreshes exist purely as exploratory work that never gets pitched?*

`[OPEN — ask: Jessica]` *Does the pipeline for an internal refresh (Path B) go through the same licensor approval steps as a buyer-requested product, or does it stop earlier (e.g., at concept approved) and only re-enter the full pipeline when a buyer picks it?*

### What a "project" actually is

In ClickUp today, each card corresponds to a project. A project represents a specific inquiry — a combination of buyer + retailer + occasion that defines a creative brief. Examples:

- "Julie Greer at Burlington, Valentines 2027"
- "Alice Zhu at Dollar General, Fall Winter 2026"
- "Dollar General Halloween inquiry" ← the buyer, retailer, and seasonal occasion together

The brief attached to that project defines what the creative team is constrained to produce:
- Which buyer is requesting it
- Which retailer (and therefore what price points, shelf dimensions, shipping requirements apply)
- Which occasion/season (which style guide versions are valid, what shelf dates products must hit)
- Which licensed properties the buyer carries and wants
- Which product types the buyer purchases

Every SKU, every preliminary design, every file produced during that project is scoped to this brief. Creative designers reference it constantly so they don't have to memorize per-buyer restrictions.

### The team and what each person owns

| Role | What they own in the pipeline |
|------|-------------------------------|
| **Project Manager (Jessica)** | End-to-end pipeline oversight; assigns work; coordinates across all teams; escalates blockers; manages PM-level stage advancement |
| **Sales Manager** | Buyer communication; sends preliminary concepts; converts picks into orders; notifies buyers of licensor-required changes |
| **Art Director** | Approves all preliminary designs before they go to buyers; approves licensing sheets before they go to the licensing team; final creative authority |
| **Technical Lead Designer** | Audits technical design team output; communicates with factories; sends tech pack files; manages reorder file updates |
| **Technical Designers** | Create costing sheets, licensing sheets, tech packs, packaging designs; revise based on licensor/factory feedback |
| **Creative Senior Designer** | Advises creative team on product restrictions, materials, production constraints |
| **Creative Designers** | Create preliminary concepts; prepare art files for buyer picks; write SKU descriptions; handle art revisions |
| **Sourcing Managers** | Validate costing sheets; identify factories that can manufacture each product |
| **Licensing Manager + Coordinator** | Submit concepts and packaging to licensor portals; download licensor assets; download style guides; manage all licensor correspondence |
| **Production Managers** | Post-approval production tracking |
| **Factories** | External; receive tech pack files; produce pre-production samples (PPS); produce mass production |

---

## 2. The Business Process — How Products Actually Flow

### Phase 1: Ideation & Entry (both paths)

**Path A (buyer-initiated):** The sales manager receives a request from a buyer at a retailer for a specific occasion. The PM opens a project card anchored to that buyer+retailer+occasion brief. Three teams activate simultaneously:
- Technical design team: researches production references, creates costing sheet
- Sourcing team: identifies factories capable of making the product
- Creative team: begins designing preliminary concepts within the brief constraints

The ClickUp pipeline opens with: `idea new prod form → buyers insight → licensor insight`

**Path B (internal line refresh):** The decision to refresh or experiment originates internally. A project card is opened without a buyer. The pipeline begins with: `[OPEN — ask: Jessica]` *Does Path B work start in a different ClickUp space or list, or does it enter the same pipeline with a flag indicating "no buyer yet"?*

### Phase 2: Preliminary Concept & Buyer Selection

Creative designers produce preliminary concepts constrained by the brief:
- The buyer's product type preferences
- The licensed properties they carry
- Style guide rules (assets allowed, storytelling guidelines, shelf date windows)

The art director reviews and approves preliminary concepts before they go to buyers.

The sales manager presents approved concepts to the buyer (via email, presentations, or other external channel — `[OPEN — ask: Sales Manager]` *How are preliminary concepts delivered to buyers? Email with PDF attachments? Google Slides? An external portal? Do buyers ever respond directly in a tool the team uses, or always via email?*).

The buyer makes picks (selects designs they want) or passes.

**Critical data problem here:** Unpicked designs are orphaned to this project. They exist nowhere else. See Pain Point 1.

**For Path B:** No buyer review step. Designs go into the design library after art director approval and wait to be matched to future buyer inquiries.

### Phase 3: SKU Creation & Documentation

When a buyer selects a design, a SKU card is created and linked to the project card. This triggers the full pipeline.

The creative designer:
- Prepares finalized art files for the pick
- Writes the SKU description (material, size, artwork description)

The technical designer:
- Creates a licensing sheet using the art files
- Designs packaging

The art director reviews and approves the licensing sheet before it goes to the licensing team. **This review stage is a documented, recurring bottleneck** (see Pain Point 3).

`[OPEN — ask: Jessica + Art Director]` *When the art director approves a preliminary design at Phase 2, and then at Phase 3 she reviews the licensing sheet made from that same design — what causes her to change her mind at Phase 3? Is it because the licensing sheet format reveals details the preliminary didn't show? Or is it a separate creative judgment pass?*

### Phase 4: Licensor Submission & Approval Cycle (POP Creations only)

The licensing coordinator submits the concept package (art files + licensing sheet + packaging) to the licensor portal.

**Licensor reviews:**
- Correct use of assets (no cross-style-guide mixing, no distorted characters)
- Color accuracy per style guide
- Storytelling rules (no plain backgrounds, no unrelated assets mixed)
- Packaging guideline compliance
- On-shelf date within the style guide's valid window

Possible outcomes:
- **Revisions** → back to creative or technical design team → art director → resubmit
- **Concept Approved** → proceed to sampling
- **Concept Approved with Changes** → minor revisions must be applied before sampling

`[OPEN — ask: Licensing Coordinator]` *When a licensor returns revisions, how do those comments arrive — as a PDF report, email text, portal message? And how do you currently get those revision details into ClickUp so the creative/technical team knows what to fix?*

`[OPEN — ask: Licensing Coordinator]` *Do any licensors have an API or automated submission system, or is every submission a manual login to a web portal?*

### Phase 5: Pre-Production Sample (PPS)

Tech pack files go to the factory. Factory produces a pre-production sample and sends photos.

The art director and licensing team review PPS photos internally before submitting to the licensor.

Licensor reviews PPS and either:
- Approves → Pre-Production Approved → factory proceeds to mass production
- Revisions → Factory Resample required

### Phase 6: Production Approvals & Closure

After PPS approval, mass production proceeds.

Depending on the licensor, final closure requires one or more of:
- A product safety form submission
- A physical sample mailed to the licensor's office
- PPS photo approval alone (sufficient for some licensors)

When all requirements are met: **Production Approved** → submission closed in the licensor system.

`[OPEN — ask: Licensing Coordinator]` *For each major licensor (Disney, WB, Paramount, Marvel — whoever you work with most), what specifically is required for final production approval? Which ones need a physical sample, which ones need the safety form, which ones stop at PPS photos?*

### Spruce Line parallel path

Spruce Line skips the entire licensor approval cycle. Behavioral data confirms an active but simpler flow:

`upcoming projects → in work → with buyer for approval → send out art for po → complete`

Plus non-linear states observed: `ideas`, `approved for future orders`, `waiting for factory`, `price req/buyer approving`, `int apprvd/selections made`, `smpl req`

`[OPEN — ask: Jessica]` *In Spruce Line, does the art director review preliminary designs before they go to buyers, or does it go straight from creative designer to sales manager? Is there any internal approval step before buyer presentation?*

`[OPEN — ask: Jessica]` *What does "Edge Generic" refer to in Spruce Line? It was the most active list during the observation period. Is it a product category, a retailer program name, or something else?*

---

## 3. What the Behavioral Data Actually Shows

Data collected Apr 14 – May 14, 2026 (clean period after webhook repair). 370 mapped events across POP Creations + Spruce Line; 123 designflow events; 96 events with unmapped list_id.

### Who is doing work in ClickUp

| User | Total Actions | Primary Activity |
|------|--------------|-----------------|
| Umamaheswararao Meka | 200 | 148 status changes, 21 assignee adds, 19 task moves |
| Jennifer Chaffier | 65 | 42 status changes, 15 assignee changes |
| Elizabeth | 47 | 25 status changes, 13 comments |
| Ilona Kereki | 25 | 13 status changes, 9 comments |
| Vaibhav | 16 | 15 status changes (dev team) |
| Jessica Cortázar | 4 | 2 status changes, 2 assignee adds |

Uma accounts for 54% of all recorded actions. If Uma is a data-entry coordinator rather than the primary PM, this still represents a structural over-centralization problem. If Uma is a role we haven't correctly identified, the picture changes. `[OPEN — ask: Jessica]` *(See identity question in Section 1.)*

### What type of work actually happens

| Action | Count | % of actions |
|--------|-------|-------------|
| Status change | 247 | 68% |
| Assignee added | 46 | 13% |
| Comment posted | 26 | 7% |
| Task moved (section) | 19 | 5% |
| Due date set | 8 | 2% |
| Priority set | **1** | 0.3% |

**On priority:** One priority update in 30 days confirms the ClickUp UI buries the field. However, **priority should and will be used** in the new system — the team has urgency needs that aren't being captured today. The new system must surface priority directly in list rows, not buried inside a task detail panel. `[OPEN — ask: Jessica]` *How do you currently communicate urgency on a SKU — is it a verbal conversation, a Slack/WhatsApp message, or something in ClickUp? What would make you actually use a priority field every day?*

**On time tracking:** Zero time-tracking events were recorded. However, we do want a lightweight **check-in / check-out** mechanism for designers (see Section 5). This is different from ClickUp-style time tracking — it's about measuring how long a designer spends on a specific task, not logging billable hours.

**On comments:** Comments are sparse (7%). The team communicates outside the system. `[OPEN — ask: Jessica]` *Where does the team's day-to-day communication actually happen — WhatsApp, Slack, email, or something else? Is there a single primary channel?*

### When the team works

Peak UTC hours: 13–17 (9am–1pm Eastern US). Secondary peak: 19–21 UTC (3–5pm Eastern, overlapping with Brazil/Colombia afternoon).

**The 3–7 UTC window** (8:30am–12:30pm IST) confirms India-based activity. Confirmed: the programming team (designflow) is in India.

**Day-of-week pattern:**

| Day | Events | Notes |
|-----|--------|-------|
| Sunday | 81 | As active as Monday — India work week (Sun–Thu) or weekend catch-up |
| Monday | 83 | Peak US/Europe day |
| Tuesday | 29 | Unexpectedly quiet |
| Wednesday | 30 | Unexpectedly quiet |
| Thursday | 69 | Active — India work week includes Thu |
| Friday | 74 | Active US/Europe end of week |
| Saturday | 4 | Near-zero |

Mid-week Tue/Wed dip is notable. Could reflect project cycle rhythms (heavy work at start/end of week, midweek = execution heads-down). SLA clocks must not assume Mon–Fri or a single timezone.

### Which lists are active

| Division | List | Events |
|----------|------|--------|
| Spruce Line | Edge Generic | 53 |
| POP Creations | Licensing Management | 32 |
| POP Creations | Licensing Administration Tasks | 25 |
| POP Creations | Customer Refresh | 25 |
| Spruce Line | General Presentations | 13 |
| designflow | development | 123 |
| (unmapped) | — | 96 |

### What POP Creations pipeline transitions reveal

Only 24 POP Creations status transitions were captured in the clean window. Slow-moving licensor approval stages (which span weeks) did not complete during the 30-day observation. What was captured:
- Multiple new products entering: `{new} → idea new prod form` (7×), `{new} → buyers insight` (6×)
- One early pipeline progression: `buyers insight → design brief → design in prog`
- `in progress → complete` (3×) — short-cycle completions, likely Spruce Line-adjacent tasks inside POP

No concept submission, licensor review, PPS, or production approval transitions were captured. These stages simply take longer than 30 days to cycle through.

---

## 4. Inefficiencies and Pain Points

### Pain Point 1: Lost designs — the most frequent waste in the business

Preliminary designs are scoped to the project that commissioned them. When a buyer passes on a design, it remains attached to that project with no library presence, no searchable metadata, no reuse pathway.

**Frequency:** Several times per week the team needs a design they can't find.
**Cost:** Creative designers recreate work from scratch. Sourcing research is duplicated. The accumulated creative output of the company is invisible to the people who need it.
**Root cause:** ClickUp ties tasks to lists. There is no independent design entity. A design without a buyer selection is a dead-end task.

### Pain Point 2: The PM is the pipeline's single point of failure

One person (54% of all recorded actions) manually advances every non-licensing pipeline stage. With hundreds of concurrent SKUs, this is a full-time data entry job layered on top of actual project management.

**Cost:** PM's coordination and escalation capacity is consumed by status maintenance. Pipeline state is always hours or days behind reality.
**Root cause:** No role-scoped self-advancement in ClickUp. PM maintains control because open access leads to errors.

### Pain Point 3: Art Director is a recurring approval bottleneck with five distinct failure modes

The art director approves every licensing sheet before licensor submission. Five documented reasons this creates backlog:
1. Her other responsibilities cause her to miss review windows — items accumulate
2. She modifies previously approved artwork at this stage, forcing complete rework on the licensing sheet
3. She's unfamiliar with some product types and must consult China/sourcing/sales before approving
4. Creative's color choices don't match her preferences — sent back for rework
5. Wrong licensor property on packaging (e.g., Mickey and Friends vs. Mickey Mouse) — licensing team catches this after the fact and returns to her

**Cost:** Every item in her queue is a blocked SKU. The queue depth is invisible to everyone else.
**Root cause:** No queue visibility, no SLA clock, no pre-submission validation checklist.

### Pain Point 4: Duplicate design collision — handled ad-hoc and silently

When two buyers pick the same design in the same cycle, the creative designer makes minor cosmetic changes. The sales team presents this as "minor changes" without explaining why.

**Cost:** Untracked creative labor; potential buyer trust risk; no record that two SKUs share a design origin.
**Root cause:** ClickUp has no design identity concept — it cannot detect that two tasks reference the same source artwork.

### Pain Point 5: Approved concepts that go cold — invisible sunk cost

A concept can reach "Concept Approved" and then stop moving. No PO, no sampling request, no follow-up. Licensor approval work completes but generates zero revenue.

**Frequency:** Unknown. PM explicitly asked the system to detect this.
**Root cause:** ClickUp has no time-in-status tracking or forward-looking alerts.

### Pain Point 6: No stage SLA enforcement

The team has estimated times per stage (mentioned by PM) but ClickUp does not track time-in-stage, flag slow items, or alert anyone. Items sit indefinitely with no escalation.
**Root cause:** ClickUp statuses are labels, not timed states.

### Pain Point 7: Licensor-specific completion requirements are in people's heads

Each licensor has different final approval requirements. This institutional knowledge lives in the licensing team's memory, not the system. The PM must remember which licensor needs what to know when a product is actually done.
**Root cause:** ClickUp has no per-licensor conditional workflow profile.

### Pain Point 8: Batch operations are impossible

The PM needs to: find all SKUs with completed art files → assign them to technical designer X. ClickUp requires opening each task individually. With hundreds of concurrent SKUs, this is hours of mechanical work per week.
**Root cause:** ClickUp list view has no meaningful multi-select batch workflow.

### Pain Point 9: File paths live outside the system

Art files, licensing sheets, and tech packs live on a shared server (or drive). File locations are communicated outside ClickUp — pasted into messages or called out verbally. The system has no record of where files are.
**Root cause:** No structured file path field in ClickUp.

`[OPEN — ask: Jessica + Technical Designers]` *Where do art files, licensing sheets, and tech packs actually live — a shared network server, Google Drive, Dropbox, something else? What does the folder structure look like, and is there a consistent file naming convention?*

### Pain Point 10: No visibility into designer performance or output history

The company has no way to answer: who designed this? How long did it take them? Which designers' work gets picked by buyers most often? Which designers produce work that sails through licensor approval vs. generates lots of revisions? Which designers are strongest on which licensors?

This is not tracked anywhere today. `[OPEN — ask: Jessica + Art Director]` *Is designer performance a topic that comes up — are there designers the art director trusts immediately vs. always sends back? Is there a sense that some designers are better at certain licensors?*

---

## 5. How the New System Should Outperform ClickUp

### Principle: Design first, project second

**ClickUp model:** A design exists inside a project. Project closes → design is inaccessible.

**New model:** Designs are first-class entities. A design lives in the **design library** with structured metadata: licensor, licensed property, product type, season eligibility, style guide version, designer, creation date, status (preliminary / art-file-ready / approved / picked / archived). A project references designs. A SKU is a "design × buyer × season" record, not a standalone task.

This eliminates Pain Points 1, 4, and part of 5. Every design ever created — picked or not — lives in the library. Searching for "Disney Mickey Mouse plush, holiday-eligible" returns everything the creative team has ever produced for that combination.

### Role-scoped stage advancement

Each pipeline stage has an owner role. The stage owner advances it when their work is done. The PM does not move items forward — the system routes automatically. The PM's view becomes: exceptions, SLA breaches, conflicts, and items awaiting her specific decisions (batch assignment, escalation, unblocking).

### Stage SLA clocks with escalating alerts

Every stage has a configurable expected duration. The clock starts when a task enters the stage. At 75% of expected time: yellow flag. At 100%: red, PM alerted. At 150%: escalation notification. SLA targets are configurable per licensor (Disney is known to turn around faster than others; PPS review timelines vary).

### Designer check-in / check-out

When a designer starts work on a task, they check in. When they finish and hand off, they check out. The system records: who worked on it, start time, end time, elapsed time per stage. This is lightweight — not time-sheet granularity, just task-level timing.

Over time this data supports:
- **Efficiency tracking:** which designers complete stages within SLA
- **Licensor affinity:** whose work is approved by licensors without revision vs. generates repeated rework
- **Buyer conversion:** whose preliminary designs get picked by buyers most often
- **Load balancing:** who has capacity right now vs. who is overloaded

Eventually, when sales/adoption data is pulled in, designs can be matched to their designers to build a performance picture: who designs product that sells, who designs for which licensors best, and who consistently underperforms.

`[OPEN — ask: Jessica + Art Director]` *Would you use a check-in/check-out system if it was a single button on the task card? Or would designers forget or resist it? Is there a lighter-weight way to capture elapsed time (e.g., system infers it from when the stage was entered vs. when the stage was advanced)?*

### Priority surfaced inline, not buried

Priority will be used in the new system. It must appear as a color-coded inline field on every task in every list view — not inside a task detail panel. The PM or any team member sets it in one click from the list. Sensible defaults (new tasks are Normal unless escalated) avoid the friction of having to set it. High and Urgent items float visually.

`[OPEN — ask: Jessica]` *When you need something done urgently today, what do you do — message someone directly, or change something in ClickUp? If we made priority a colored tag visible in the list that you could set in one click, would you actually use it?*

### Art Director queue dashboard

A dedicated screen showing everything in the art director's review queue, sorted by time waiting. Pre-submission validation runs automatically before anything enters her queue: licensor property verified? style guide date within shelf window? required file types attached? Required fields populated? Items failing validation are blocked from entering her queue — they go back to the submitter with a specific error message.

### Concept-cold alerts

When a concept reaches "Concept Approved" and no PO or sampling request is created within N days (configurable), the system alerts the PM and sales manager: "This concept has been approved but has not advanced in N days. Is this product still being pursued?" Forces explicit decision rather than passive abandonment.

### Design conflict detection

When buyer picks are processed, the system checks whether the selected design has already been selected by another buyer in the same active cycle. If yes, the system surfaces the conflict immediately and creates a linked "variant" task for the modified version, tracking design origin for both SKUs.

### Batch assignment workflow

The PM selects a filtered view (e.g., status = art files ready, assigned = nobody), multi-selects all matching SKUs, and assigns them to a technical designer in one action. No individual task opens required.

### Licensor requirement profiles

Each licensor has a profile stored in the system: which stages are required, what the expected turnaround window is, what physical deliverables are needed for final closure, what their asset usage rules are. The pipeline shown for a SKU is dynamically generated from the licensor profile — Disney SKUs and WB SKUs show different stages. Spruce Line SKUs show a completely different pipeline.

### AI opportunities

The following are places where AI assistance could meaningfully reduce manual work or improve decision quality:

| Where | AI capability | Value |
|-------|--------------|-------|
| Style guide compliance pre-check | Vision model reviews art files against licensor rules before the art director sees them | Catches wrong property, distorted characters, mixed assets — before they waste the art director's time |
| Licensor revision parsing | NLP parses licensor feedback PDFs/emails → creates structured revision tasks automatically | Eliminates manual transcription of licensor notes into ClickUp |
| Design library search | Natural language search: "plush, Disney, Winnie the Pooh, spring-eligible" | More useful than tag-based filtering for creative team members |
| Buyer brief briefing | AI generates a one-page creative brief from the project's structured data | Creative designer gets a formatted brief without the PM writing it |
| Stage duration prediction | ML on historical check-in/check-out data predicts realistic completion dates | SLA estimates become data-driven rather than guessed |
| Duplicate design detection | Vision model compares new preliminary designs against the design library | Catches accidental near-duplicates before buyer presentation |
| Design performance scoring | Correlates design attributes (licensor, property, product type, designer) with pick rates and sales | Surfaces which design approaches work, supports designer development |

`[OPEN — ask: Jessica]` *Of these AI ideas, which two or three would make the biggest difference to you personally? Are there any you'd be uncomfortable with (e.g., performance scoring on designers)?*

### Buyer brief as project anchor, not repeated per SKU

The buyer+retailer+occasion brief lives on the project record. Every SKU inherits its brief. Creative designers see the brief in a persistent sidebar panel while working on any SKU in that project — buyer name, retailer, occasion, product types requested, licensed properties, style guide versions in scope, shelf dates. They never need to look it up separately.

---

## 6. Open Questions Summary

All open questions are embedded inline above with `[OPEN — ask: Person]` markers. Below is a consolidated list for interview planning.

### Questions for Jessica (PM, Germany)
- Who is Umamaheswararao Meka and what is her actual role?
- In Path B (internal design refresh), who decides to start it? Does it go through full licensor approval?
- Does Path B work enter the same pipeline as Path A with a flag, or a different space/list?
- What causes the art director to change her mind at Phase 3 about artwork she already approved at Phase 2?
- What does "Edge Generic" refer to in Spruce Line?
- Does Spruce Line have an art director review step before buyer presentation?
- How do you communicate urgency today, and would you use an inline priority field?
- Where does team day-to-day communication happen (WhatsApp, Slack, email)?
- Where do art files, licensing sheets, and tech packs live? What is the folder/naming structure?
- **Confirm or correct:** Is status + assignee + art file path the entirety of what the system needs to track, or are there other critical fields she uses or wishes she had?
- **Wishlist:** What would the ideal version of this system do that no PM tool has ever done for her?
- Of the AI opportunities listed, which two or three would matter most? Any she'd be uncomfortable with?
- Would check-in/check-out work as a single button, or would it need to be inferred automatically?

### Questions for the Art Director
- What does her review queue look like on a heavy day — how many items, what kinds of issues?
- What is the single most common reason something gets sent back to the creative team?
- When she approves a preliminary design and then changes her mind at the licensing sheet stage — what triggered the change?
- Is designer performance a topic? Are there designers whose work she trusts immediately vs. always scrutinizes?
- What would make her review process faster — a checklist? A side-by-side style guide comparison? Something else?
- Wishlist: what would the system do for her that ClickUp doesn't?
- Where does she think AI could help in her review process?

### Questions for Creative Designers
- How do you receive a project brief today? Does the PM send it, or do you look it up in ClickUp yourself?
- When you start a new preliminary design, what information do you need that you have to currently go find yourself?
- How do you currently find past designs to reference or use as a starting point?
- If there was a searchable design library, what fields would you search by most?
- Would you use a check-in/check-out button when you start and finish work on a design?
- Where do finished art files go? What do you name them, and how does the PM know they're ready?
- Wishlist: what would the system do for you that ClickUp doesn't?
- Where do you think AI could help in your work?

### Questions for Technical Designers
- How do you find out that art files are ready for you to work from? Does the PM tell you, or do you check ClickUp?
- What information is typically missing or unclear when you receive an assignment?
- What format are the art files you receive — Illustrator, PDF, both?
- Do you ever need to modify the art files, or do you work strictly from what the creative team delivers?
- What's the most time-consuming part of creating a licensing sheet or tech pack?
- Wishlist: what would the system do for you that ClickUp doesn't?
- Where do you think AI could help in your work (e.g., auto-populating licensing sheet fields)?

### Questions for the Licensing Coordinator / Manager
- Walk me through a single licensor submission start to finish — what you open, what you fill in, where you go.
- For each major licensor you work with, what is required for final production approval? (Physical sample? Safety form? PPS photos only?)
- When a licensor returns revisions, how do those comments arrive, and how do they get into the system today?
- Do any licensors have APIs or automated submission capabilities, or is it all manual?
- How do you track which submissions are pending, which have been returned, which are approved — is that in ClickUp, a spreadsheet, email folders?
- Wishlist: what would the system do for you that ClickUp doesn't?
- Where do you think AI could help (e.g., parsing licensor feedback into structured revision tasks)?

### Questions for the Sales Manager
- How are preliminary concepts delivered to buyers — email with attachments, Google Slides, a link, something else?
- When a buyer makes their selections, how does that information get back to the PM? Email? ClickUp? Direct message?
- How do buyers communicate feedback when they want changes — same channel?
- Is the list of buyers and retailers stable year to year, or does it change often?
- Does a buyer ever select from multiple projects simultaneously (e.g., picking designs from both a Halloween brief and a Christmas brief in the same conversation)?
- Wishlist: what would the system do for you that ClickUp doesn't?

---

## 7. Round 3 Interview Questions

These are ready to send. Multiple people are asked the same question where their perspectives should be compared. Each section is labeled with who should answer.

---

### Section A — For Jessica (Project Manager)
*These require your specific oversight perspective.*

**A1.** When you look at ClickUp at the start of your day, what are the first three things you check? Walk me through exactly what you open and in what order.

**A2.** The system currently shows you current status. What it doesn't show you is *time* — how long something has been sitting in a stage, or whether it's on track to hit a deadline. If you could see one time-based number on every SKU card, what would it be?

**A3.** You mentioned the team has estimated times for each pipeline stage. Can you give me your best estimate for each stage — even rough ranges? For example: "Art file creation: 2–3 business days. Licensor review: 2–4 weeks." These numbers will be used to set automatic SLA alerts in the new system.

**A4.** Right now you personally advance most of the non-licensing pipeline stages. In the new system, each person advances their own stage when their work is done. What's your biggest concern about giving that responsibility to the team? What would need to be true for you to trust it?

**A5.** Think about a product that went perfectly — from idea to production approval with minimal rework, delays, or surprises. What made that one work? What was different about it compared to the ones that get stuck?

**A6.** Think about the worst bottleneck you've dealt with in the last month. What was stuck, where was it stuck, and what did you have to do to unstick it?

**A7.** If the new system had an AI assistant that you could ask questions in plain English — "which SKUs are stuck waiting for the art director?", "which concepts were approved last month that still have no PO?", "which designer has the most open assignments right now?" — would you actually use that? What questions would you ask it every week?

**A8 (confirm or correct).** Based on what we've seen in the data, the main things that change on a task are: status, who's assigned, and occasionally a due date. Is there anything important that gets tracked today (even imperfectly) in ClickUp that we haven't talked about — any field, note, or piece of information that would be lost if we only built for status + assignee + file path?

---

### Section B — For the Art Director
*Answered by Art Director only.*

**B1.** On a typical week, roughly how many licensing sheets are waiting in your review queue? Is it ever so many that you have to triage — doing the easier ones first and leaving the harder ones? How does that decision get made?

**B2.** When you look at a licensing sheet that's been submitted for your review, what are the five things you check first? Walk me through your actual review process step by step.

**B3.** When you send something back for revisions, how do you communicate what needs to change — do you mark up the document, type notes in ClickUp, send a message, or something else? And how do you find out when the fix has been made?

**B4.** If the system automatically checked for the most common problems before a licensing sheet reached you — wrong licensor property, style guide date mismatch, missing files — and blocked it from reaching your queue until those were fixed, would that help or would it create different problems?

**B5.** Is there a difference in quality or reliability between designers — some whose work you can approve quickly and others you almost always send back? If yes: what specifically is different about the work from those two groups?

**B6 (same as Section C, Q6 — compare answers).** If you could add one field or one piece of information to every SKU card that doesn't exist today, what would it be?

---

### Section C — For Creative Designers
*Can be answered by multiple designers — compare their responses.*

**C1.** When you're assigned to a new preliminary design, how do you receive the brief? Walk me through exactly how you find out what you need to make.

**C2.** When you're starting a design, what's the hardest information to track down — the thing you most often have to go find yourself that should just be in front of you?

**C3.** After you finish a preliminary design that doesn't get picked by the buyer — what happens to that work? Where does it go? Have you ever tried to reuse it for a different project, and if so, how did that go?

**C4 (same question as Section D, Q3 — compare answers).** If we built a searchable library of every design ever created — picked or not — what would you search by? What fields would you type into the search? *[Note to interviewer: also ask the technical designer this same question and compare.]*

**C5.** When you finish an art file and it's ready for the technical designer, what do you do right now to hand it off? How does that person know it's ready?

**C6 (same as Section B, Q6 — compare answers).** If you could add one field or one piece of information to every SKU card that doesn't exist today, what would it be?

**C7.** If there was a button on your task that you clicked when you started working and clicked again when you finished — just to record how long you spent — would you use it? Or would it feel like surveillance? Be honest.

**C8.** Is there anything in your work that you feel is repetitive and mechanical — something you do the same way every time that a computer could probably do for you?

---

### Section D — For Technical Designers
*Can be answered by multiple technical designers — compare their responses.*

**D1.** When an art file from the creative team is ready for you, how do you find out? Do you get notified, do you check ClickUp, does someone message you?

**D2.** When you open an assignment and start working on a licensing sheet or tech pack — what information is missing or unclear most often? What do you have to go ask someone about?

**D3 (same question as Section C, Q4 — compare answers).** If we built a searchable library of every design ever created, what would you search by? What fields would you type into the search?

**D4.** Is there any part of creating a licensing sheet or tech pack that feels mechanical — the same fields filled in the same way every time? If yes: could you describe that part in detail?

**D5.** How do you know when a licensor has come back with revisions on something you worked on? How does that information reach you today?

**D6 (same as Section B, Q6 — compare answers).** If you could add one field or one piece of information to every SKU card that doesn't exist today, what would it be?

---

### Section E — For the Licensing Coordinator / Manager
*Answered by licensing team only.*

**E1.** Walk me through a single concept submission from start to finish — from the moment the licensing sheet lands on your desk to the moment you click Submit in the licensor portal. What do you open, what do you fill in, what do you check?

**E2.** For each licensor you work with regularly — Disney, WB, Paramount, and any others — what exactly is required to fully close out a product? (Concept approval only? PPS photos? Physical sample? Product safety form?) Please be specific per licensor if they differ.

**E3.** When a licensor comes back with revisions, what does that look like practically — do they send a PDF, an email, a portal notification? And how do you currently get those revision notes to the creative or technical designer who needs to make the fix?

**E4.** How do you keep track of which submissions are waiting for licensor response, which have been returned, and which are approved? Is that in ClickUp, a spreadsheet, email folders, or in your head?

**E5.** Do any licensors have a submission API or digital workflow that allows programmatic integration, or is every submission a manual login to a web portal?

**E6 (same as Section B, Q6 — compare answers).** If you could add one field or one piece of information to every SKU card that doesn't exist today, what would it be?

---

### Section F — For the Sales Manager
*Answered by sales team only.*

**F1.** When you present preliminary concepts to a buyer, what does that look like practically — do you send a PDF, a PowerPoint, a Google Slides link, or something else? Does the buyer respond in the same channel?

**F2.** When a buyer makes their picks, how do you communicate that back to the PM? Do you update ClickUp, send an email, message in WhatsApp/Slack, or something else?

**F3.** Have you ever had a buyer select a design and then change their mind later? How often does that happen, and what's the process when it does?

**F4.** Is your list of buyers and retail clients mostly stable from season to season, or does it change significantly? When a buyer changes — new person, different retailer — how does the team find out and how does the project structure adjust?

**F5.** When the licensor forces a change to a design that a buyer already approved, you have to go back to the buyer and tell them the design changed. How do you handle that conversation today — do you tell them why, or just present it as a "small update"? Has that ever caused a problem with a buyer?

**F6 (same as Section B, Q6 — compare answers).** If you could add one field or one piece of information to every SKU card that doesn't exist today, what would it be?
