# Business Intelligence — POP Creations / Spruce Line PM Platform

This document consolidates everything learned during the Learning Phase (Mar 30 – May 18, 2026): live webhook event data from D1, the Mar 31 ClickUp snapshot, and two rounds of employee interviews (stored in `interview_questions` table in D1).

---

## Table of Contents

1. [The Business and Its Two Divisions](#1-the-business-and-its-two-divisions)
2. [The Team](#2-the-team)
3. [How Work Actually Flows](#3-how-work-actually-flows)
4. [The Complete Pipeline — All 17 Stages](#4-the-complete-pipeline--all-17-stages)
5. [SLA Targets — Time Per Stage by Product Type](#5-sla-targets--time-per-stage-by-product-type)
6. [Licensor Turnaround Times](#6-licensor-turnaround-times)
7. [What the Data Shows](#7-what-the-data-shows)
8. [Pain Points — From the People Doing the Work](#8-pain-points--from-the-people-doing-the-work)
9. [Custom Fields in Use](#9-custom-fields-in-use)
10. [What We Are and Aren't Capturing](#10-what-we-are-and-arent-capturing)
11. [Requirements for the New System](#11-requirements-for-the-new-system)
12. [AI Assistant Queries — Verbatim from Jessica](#12-ai-assistant-queries--verbatim-from-jessica)
13. [Open Questions](#13-open-questions)

---

## 1. The Business and Its Two Divisions

A home decor product company operating two distinct product lines, each with a different approval chain.

### Spruce Line
Non-licensed home decor. No outside licensor involved.
- Workflow: Internal design → buyer approval → done
- Simpler, faster, lower overhead

### POP Creations
Licensed home decor carrying IP from Disney, Warner Bros, Paramount, Marvel, Nickelodeon, and others.
- Workflow: Internal design → **licensor approval** → buyer approval → done
- The licensor step is the major complexity driver — each licensor has different requirements, turnaround times, and submission formats

---

## 2. The Team

### From the D1 event log (Mar 30 – May 18, 2026)

| User | Events | Role |
|------|--------|------|
| Elizabeth (Liz) | 469 | Art Director — reviews and approves all licensing sheets; the internal gate before anything goes to the licensor |
| Umamaheswararao Meka | 443 | Technical Lead Designer — audits technical work, manages factory communication |
| Jennifer Chaffier | 177 | Designer or coordinator |
| Ilona Kereki | 43 | Designer |
| Vaibhav | 30 | Designer (likely offshore) |
| Marcel Zabolotniy | 15 | Designer |
| Jessica Cortázar | 8 | Project Manager — does less direct task work, more oversight and stage advancement |
| Érica Perestrelo | 6 | Designer |

### Full role map (from Jessica, Q4)

- **Project Manager (Jessica)** — oversees the full pipeline, advances most non-licensing stages manually, allocates designers to projects
- **Sales Manager** — communicates with buyers, sends preliminary concepts, notifies buyers of licensor-requested changes, converts picks into actual orders
- **Art Director (Liz)** — approves preliminary designs sent to buyers; approves licensing sheets before submission; critical internal gate for everything going external
- **Technical Lead Designer** — audits all technical design work; manages factory communication; sends files to factories; handles reorder file updates
- **Technical Designers** — create costing sheets, licensing sheets, Techpack files for factory, packaging designs, and revise professional photos
- **Creative Senior Designer** — advises creative team on product restrictions, materials, and constraints
- **Creative Designers** — create preliminary concepts for buyers, prepare art files for picks, write SKU descriptions
- **Sourcing Managers** — review costing sheets, source factories that can produce the products
- **Licensing Manager / Coordinator** — submits concepts and packaging to licensor portals, downloads assets for all licenses and properties
- **Production Managers** — manage production phase
- **Factories** — external; receive Techpack files, produce PPS samples, execute mass production

Total workspace: ~64 users (from snapshot)

---

## 3. How Work Actually Flows

### What a ClickUp card actually represents (Jessica, Q7)

Each card = **one offer to one specific buyer for one season at one retailer.**

> "Each card corresponds to a project. This means it represents an offer made to a specific buyer at one of our retailer clients, for a specific season. For example Julie Greer at Burlington for Valentines 2027, or Alice Zhu at Dollar General for Fall Winter 2026."

Each project card carries:
- Buyer name and retailer
- Season (e.g., Valentines 2027, Fall/Winter 2026)
- Types of products requested
- License properties requested (and their valid date ranges per style guide)
- Any additional constraints from Sales

When a buyer makes official selections, **a separate SKU card is created for each picked design**, and those SKU cards are linked to the project card.

### Idea to SKU

1. **Idea origin** — retail visits, factory offers, internet inspiration, or existing product formats
2. **Teams engaged early** — Sales (verify/raise buyer interest), Technical Design (references + costing sheet), Sourcing (factory options)
3. **Buyer selects a format** — material, size, specifications
4. **Creative designer prepares art files** for the selected format
5. **Technical designer creates licensing sheet and packaging design** using the art files
6. **Art Director (Liz) reviews and approves** the licensing sheet — nothing goes to the licensor without her sign-off
7. **Licensing team submits** concept to licensor portal
8. **Licensor responds** — approved, approved with changes, or revision requested
9. Pipeline continues through sampling → production approval (see full stage list below)

---

## 4. The Complete Pipeline — All 17 Stages

From Jessica's answer to Q10 — these are the actual status values used in ClickUp's Licensing Management dashboard:

| # | Stage | Owner | Notes |
|---|-------|-------|-------|
| 1 | **Art files creation** | Creative Designer | Prepares artwork based on buyer's format selection |
| 2 | **Licensing sheet creation** | Technical Designer | Uses art files to build the LS and packaging design |
| 3 | **Licensing sheet review** | Art Director (Liz) | Internal gate — nothing moves forward without her approval |
| 4 | **Ready to submit** | Art Director → Licensing Team | Art Director sends approved sheet to licensing team |
| 5 | **Concept submitted** | Licensing Team | Licensing team submits to licensor portal |
| 6 | **Revisions** | Creative + Technical Designer | Licensor rejected concept or packaging — rework required |
| 7 | **Concept approved** | — | Licensor approved with no corrections |
| 8 | **Concept approved with changes** | Creative + Technical Designer | Approved but minor revisions required before sampling |
| 9 | **PO received** | Technical Designer | Buyer sent an order — Techpack files must be prepared |
| 10 | **Sales requested sample** | Technical Designer | No order yet, but buyer wants to see a physical sample before committing |
| 11 | **Sample requested** | Factory | Techpack files sent to factory (either because of PO or sales request) |
| 12 | **Sample received** | Art Director + Licensing Team | Factory sent PPS photos — internal review before submitting to licensor |
| 13 | **Factory resample** | Factory | Sample had errors — must be corrected and re-photographed |
| 14 | **Sample sent to licensor** | Licensing Team | PPS submitted to licensor (internally called "PPS submitted") |
| 15 | **Sample revision** | Creative + Technical Designer | Licensor sent changes to the sample |
| 16 | **Pre-production approved** | — | PPS approved; authorization to start mass production (internally called "PPS approved") |
| 17 | **Production approved** | — | All requirements met; submission closed in licensing system. Requirements vary by licensor (some need safety form, some need physical sample at their office, some satisfied with PPS approval) |

**Note on naming:** ClickUp's internal stage names don't always match licensor terminology. "Pre-production approved" = PPS approved internally. "Production approved" = final licensor sign-off.

---

## 5. SLA Targets — Time Per Stage by Product Type

From Jessica (Q16). Times in **minutes** for design/technical stages.

| Product Type | Brief | Design | Art File | Licensing Sheet | Revisions | Techpack for Factory |
|---|---|---|---|---|---|---|
| Stretched/Box | 10 | 30 | 30 | 75 | 30 | 24 |
| Framed | 10 | 30 | 30 | 75 | 30 | 24 |
| Plaque | 10 | 30 | 30 | 75 | 30 | 24 |
| Functional | 20 | 30 | 60 | 150 | 60 | 48 |
| Other Wall | 20 | 30 | 30 | 75 | 30 | 24 |
| Block | 10 | 30 | 30 | 75 | 30 | 24 |
| Box | 10 | 30 | 30 | 75 | 30 | 24 |
| Photo Frames | 30 | 60 | 60 | 150 | 60 | 48 |
| Object | 30 | 60 | 30 | 75 | 30 | 24 |
| Other Tabletop | 20 | 60 | 30 | 75 | 30 | 24 |
| Clocks | 10 | 30 | 40 | 100 | 40 | 32 |
| Soft Storage | 30 | 60 | 40 | 100 | 40 | 32 |
| Hard Storage | 30 | 60 | 40 | 100 | 40 | 32 |
| Other Storage | 20 | 60 | 40 | 100 | 40 | 32 |
| Stationery Org | 30 | 60 | 40 | 100 | 40 | 32 |
| Desk Acc | 20 | 60 | 40 | 100 | 40 | 32 |
| Other Workspace | 20 | 60 | 40 | 100 | 40 | 32 |
| Floor Coverings | 10 | 15 | 20 | 50 | 20 | 16 |
| Garden | 30 | 30 | 40 | 100 | 40 | 32 |

These numbers will drive automatic stage-overdue alerts in the new system. A SKU that has been in "Art File" stage for longer than its product type's art file time should surface as at-risk.

---

## 6. Licensor Turnaround Times

From Jessica (Q16). Used for deadline calculation and alert thresholds.

| Licensor | Expected Response |
|----------|-------------------|
| Disney | 1–3 days |
| LucasFilm / Star Wars | 1–2 days |
| Marvel | 1–2 days |
| Nickelodeon (Paramount) | 3–6 days |
| Coca-Cola | 6 days |
| Sesame Street | 4 days |
| NBC Universal | 5–7 days |
| Warner Brothers | 5–10 days |
| Peanuts | 7–10 days |
| SEGA | 7–10 days |
| Strawberry Shortcake (Wildbrain CPLP) | 7–10 days |
| WWE | 7–10 days |
| Care Bears | 7–10 days |
| One Piece (TOEI) | 7–15 days |

---

## 7. What the Data Shows

### Live event log (D1) — Mar 30 to May 18, 2026

**1,247 total events** captured across 49 days.

#### Event type breakdown

| Event Type | Count |
|------------|-------|
| taskUpdated | 853 |
| taskStatusUpdated | 223 |
| taskCreated | 56 |
| taskAssigneeUpdated | 54 |
| taskCommentPosted | 27 |
| taskMoved | 19 |
| taskDueDateUpdated | 8 |
| listUpdated / listCreated | 5 |
| taskPriorityUpdated | 1 |

#### What fields are changing most

| Field Changed | Count | Meaning |
|---------------|-------|---------|
| content | 441 | Task description/body edits — high revision activity |
| status | 433 | Stage transitions — the workflow is moving |
| assignee_add | 87 | Work is being handed off frequently |
| comment | 54 | Communication happening in-task |
| attachments | 52 | Files being added (design files, licensor sheets) |
| section_moved | 38 | Tasks moved between list sections |
| name | 33 | Task titles being updated |
| custom_field | 15 | Product-specific fields being filled in |
| assignee_rem | 14 | Reassignments |
| due_date | 8 | Deadline changes |
| priority | 2 | Rarely used |

#### When the team works (UTC hours, top 5)

| UTC | Events | ~Eastern |
|-----|--------|----------|
| 14:00 | 265 | 10am |
| 16:00 | 231 | 12pm |
| 15:00 | 142 | 11am |
| 17:00 | 113 | 1pm |
| 13:00 | 104 | 9am |

Peak activity is **9am–1pm Eastern**. Secondary cluster around 3–4pm ET likely reflects offshore contributors.

### Snapshot — Mar 31, 2026

- **17,746 tasks** total (including closed)
- **3 spaces** (Spruce Line, POP Creations, + internal/dev)
- **~50 lists**
- **64 users**
- **96% of tasks are subtasks** — the primary unit of work is the subtask, not the top-level card
- **495 linked task relationships** in `linked_tasks` field
- **91 attachments** found in comments sample

---

## 8. Pain Points — From the People Doing the Work

### Jessica (Project Manager) — Rounds 1 & 2

**1. Lost preliminary designs** (Q6, Q8)
> "Designs that are lost are lost several times a week. On several occasions, we've tried to reuse these designs for other projects to avoid starting from scratch. But this involves manually searching through past presentations to see what we can reuse and manually moving those files, which only exist there, to another location."

Designs that buyers don't select disappear into the old task. No time to organize rejects during normal operations. Search needed by: license, license property, product type, and season.

**2. Art Director bottleneck** (Q11)
Five distinct causes, per Jessica:
1. Licensing sheets accumulate while Liz handles other responsibilities
2. Liz sometimes changes artwork she already approved at the buyer stage — the entire licensing sheet must be redone
3. Unfamiliarity with a product type forces Liz to consult the senior creative designer, sales, production, or sourcing before approving — or it surfaces that the art file doesn't match what the buyer actually asked for
4. Color preferences — colors that were approved for the buyer presentation are later rejected at the licensing sheet stage
5. License property errors (e.g., Mickey and Friends artwork on a Mickey Mouse submission) — licensing team returns sheets to this stage until corrected

**3. Jessica manually advances most stages** (Q13)
> "I'm the only one who moves certain SKU stages (all those not directly related to licensing responses), instead of allowing each person to advance SKUs. For example, the creative team should be able to tell me when each art file is ready and include the file path on the server, and I should be able to select multiple SKUs and assign the licensing sheet to a technical designer within the same system, instead of manually accessing each SKU and assigning it."

Past attempts to decentralize failed. Root causes: team not tech-savvy, forgot the system, workflow disruption.

**4. Fear of incomplete uploads from the team** (Q17)
> "I'm also worried that the team will do everything locally on their computer and not upload the documents, tests, or progress reports until everything is finished. For example, if they have 20 SKUs, I can't wait for them to create 20 art files. I want to know if they have the first 5, the first 10, and so on, so we can keep moving forward and make the most of our time."

**5. Multi-buyer conflicts** (Q9)
> "Our current solution is for the creative designer to create a second version of the design with minor changes (icons, image sizes, colors, or embellishments), and the sales team presents this second version to one of the buyers to let them know we had to make some changes to the design. We don't usually go into detail about the reasons for these changes with the buyer."

**6. No time visibility / stuck SKUs** (Q12, Q15)
> "I'd like the system to tell me if a SKU has been stuck in a single stage for too long without progressing. Also, if a design gets stuck at Concept Approved but never reaches Purchase Order or there's no sampling request, because then we're wasting that work if it doesn't result in a sale."

> "For each SKU, I would like to see how long it has been in a certain status, how long ago its entire cycle began, and the deadline for it to change status so that the on-shelf date is met (retroactive planning based on the remaining stages and what we know they take)."

**7. Missing data fields** (Q21)
- **On-shelf date ≠ PPS-requested date** — these are two separate dates that need to be tracked independently
- **Costing sheet constraints** — designers need access to the factory's production constraints (die lines, number of colors, printing technique, legal line placement) at design time, not after the licensing sheet is rejected
- **Change-of-hands history** — when a different designer takes over a SKU mid-process, the history should show who did what and when

**8. Worst recent bottleneck** (Q19)
> "We had many Hobby Lobby picks simultaneously and needed to sample everything. The creatives weren't delivering the artwork quickly enough to produce licensing sheets due to the sheer volume, and also because some of the product types were new and they didn't fully understand how the artwork should be set up. The technical designers had to work overtime to finish the licensing sheets and tech packs for the factory on time. I had to pull creatives from other projects to help. And I had to send samples and submit them simultaneously (samples without approvals)."

Second incident: Large Ollies order required pausing all other projects to prioritize tech packs.

**9. What makes a product go smoothly** (Q18)
> "When the design quality is good and incorporates storytelling elements, we have fewer licensor reviews, and approvals are faster. Also, when the creative designer clearly defines the assets and style guidelines used, the packaging is easy for the technical designers to identify and design, resulting in fewer packaging revisions. Extremely important is when both the technical and creative designers have a clear understanding of the design constraints for the product type, based on the agreed-upon costs with the manufacturers."

---

### Liz / Elizabeth (Art Director) — Round 2

**1. Missing product manufacturing specs** (Q27)
> "Specs, the way a product is made — it's the little details on each product type that take up the most time."

When a submission arrives without complete manufacturing specs, Liz must go back to the designer before she can approve.

**2. Missing or wrong Pantones** (Q25)
> "The main issues are the Pantones not being provided or wrong colors wrote out."

Templates have reduced most other common errors. Pantones remain the top blocker.

**3. Volume and daily rhythm** (Q22)
> "20 plus some weeks. I check in every day to see if I need to submit anything. So it's split up but I do spend an hour a day submitting."

**4. Informal feedback loop** (Q24)
> "If it's a presentation I would typically put the screen shot in illustrator and mark up writing out what I want changed or I write the designer on teams all my corrections. Sometimes I will get on a Teams call to discuss."

No structured revision tracking. Corrections live in Teams messages and Illustrator files, not in the system.

**5. Designer variance** (Q26)
> "There are designers that get the aesthetic of the retailer and know how to design for that specific account and there are others who don't. I also know when a licensor will reject a certain design based on licensor requirements so that is also something some designers need to learn."

---

## 9. Custom Fields in Use

From task payloads in the Mar 31 snapshot. All present on ~100% of POP Creations tasks unless noted.

| Field Name | Type | Notes |
|------------|------|-------|
| DATE FCTRY SELECTED | date | Factory selection date |
| DATE TLR | date | Internal milestone date |
| Idea/Task Type | labels | Categorizes type of work |
| Next Review Date | date | Drives scheduling |
| SAS-PO | date | PO-related date |
| SMPL Req | number | Sample request quantity/status |
| 🏭 Factory | dropdown | Which factory |
| 📚 Category | dropdown | Product category |
| 🧑‍✈ Customer / Retailer | dropdown | The buyer/retailer |
| Due Date Licensor | date | Licensor submission deadline |
| 👤 Buyer | labels | Buyer name(s) |
| Revision received | date | ~40% of tasks |
| Old Statuses | dropdown | ~29% of tasks — migration artifact |

---

## 10. What We Are and Aren't Capturing

### Currently capturing ✅
- Task created, updated, deleted, moved
- Status transitions with from/to values
- Assignee added/removed
- Comments posted
- Due date changes, priority changes
- List/folder/space changes

### Not subscribed ❌
- `taskAttachmentUpdated` — file uploads/removals
- `taskChecklistItemCompleted` — checklist progress
- `taskChecklistItemDeleted` — checklist changes
- `taskLinkedTasksUpdated` — linked task relationship changes
- `taskDependencyUpdated` — dependency changes

### Known data quality issues
- `space_id` is NULL on all events — must be joined via `list_space_map`
- Time tracking API returns 0 entries despite being enabled
- Members API (`/seat`) returns null

---

## 11. Requirements for the New System

### Must-have

**Project-SKU linking**
Every SKU must belong to a project. Project record carries: buyer, retailer, season, license restrictions, product types, on-shelf date, and PPS-requested date (separate fields — Q21). SKUs inherit project context so designers don't have to look it up.

**Design library**
Searchable repository of all preliminary designs — including rejected ones. Filterable by: licensor, license property, product type, season, retailer/buyer. Designs exist independently of buyer selections and can be offered to new buyers without digging through old tasks.

**Full 17-stage pipeline tracking**
All stages from Section 4 as explicit, navigable checkpoints — not free-form status columns. Each stage knows its expected duration per product type (from Section 5).

**Stage-overdue alerts**
When a SKU exceeds the SLA time for its current stage (based on product type), surface it to the PM automatically. Also alert when a SKU reaches "Concept Approved" but has no PO and no sample request after a defined wait period.

**Pre-submission validation for licensing sheets**
Block submission to Liz's queue if: Pantone codes are missing, manufacturing specs for the product type are missing. These are the two most common rejection causes she identified.

**Costing sheet constraints linked at design time** (Q21)
Designers must be able to see factory production constraints (die lines, color count, printing technique, legal line placement) while they're designing — not discover mismatches at the licensing sheet stage.

**Batch stage advancement**
Select multiple SKUs → move them all to the next stage in one action. Jessica currently does this manually one-by-one. (Q13, Q17)

**Real-time incremental upload tracking** (Q17)
Designers should upload and mark SKUs ready one at a time as they finish them — not batch at the end. PM needs visibility into partial progress (first 5 of 20 art files ready = can start moving those 5 forward).

**Art Director queue view**
Dedicated view for Liz: all sheets awaiting her review, sorted by age. Current status: pending review / revision sent back / approved.

**Two date fields per SKU** (Q21)
- On-shelf date (when the product must be in stores)
- PPS-requested date (when the buyer wants to see the sample)
These are separate and both drive deadline calculations.

**Change-of-hands history** (Q21)
When a different designer takes over a SKU, the system records who did what and when.

### Should-have

**PM dashboard**
Bottleneck view: where are SKUs stuck and for how long? Designer workload: open assignments per person. Retroactive deadline calculator: given remaining stages and known stage durations, what is the earliest this SKU can reach production approval?

**Multi-buyer conflict detection**
Alert when two active projects select the same design. Trigger at the moment it happens, before the team starts duplicating work.

**Structured revision notes**
Replace Teams messages + Illustrator markups with in-system revision comments attached to the specific submission. Revision history stays on the SKU card.

**Role-specific views**
- Designer: my current assignments, my queue
- Art Director: my review queue
- PM: all projects, bottlenecks, workload
- Sales: buyer-facing status only, no internal stage noise

**Notifications**
When Art Director approves → notify designer + licensing coordinator. When licensor responds → notify PM + licensing manager. When a stage completes → notify the next person in chain.

**List of all projects for a given retailer**
Jessica specifically requested this as an AI query but it's also a basic filter view need.

### Nice-to-have

**Designer productivity metrics**
Designs created vs. buyer picks (pick rate). Revision rate per designer. Average stage completion time. Designer familiarity scores by licensor and retailer (derived from revision rate).

**Natural language queries** (see Section 12 for exact questions requested)

---

## 12. AI Assistant Queries — Verbatim from Jessica

These are the exact questions Jessica said she would use every week (Q20):

1. *"How many SKUs have a licensing sheet but the art director hasn't sent it to the licensing team?"*
2. *"How many SKUs have techpacks for factory but the art director hasn't confirmed which factory to send to?"*
3. *"List of all projects for the same retailer (client)"*
4. *"Which designer created more designs (preliminary or art files) this week?"*
5. *"Which designer has the least picks from buyers in the last month?"*
6. *"Summary of this project"* → expected response format: *"Total SKUs 27, 20 are sample requested, 3 concept approved, 4 concept submitted, next action: send the three approved concepts to the factory and wait for the 4 not approved."*

---

## 13. Open Questions

1. **Other interviews needed** — Jessica (PM) and Liz (Art Director) are covered. Candidates: a creative designer, a technical designer, the licensing coordinator, someone from Sales. Each would add their perspective on the pipeline.

2. **Spruce Line specifics** — All interview data is POP Creations-focused. Does Spruce Line use the same pipeline, a shorter version, or something entirely different?

3. **Is time tracking used at all?** — Enabled in ClickUp, 0 entries in the API. Are estimates entered anywhere? Is any time being logged?

4. **Factory and retailer master lists** — Custom fields reference factories and retailers. Is there a maintained master list, or is it ad hoc per card? The new system will need this as a first-class entity.

5. **What does a "project brief" look like today?** — Jessica says the project card contains buyer, retailer, season, product types, license restrictions. Is this free-form text or structured fields?

6. **Costing sheet format** — Jessica says designers need access to costing sheet constraints at design time. Where do costing sheets live today? Are they ClickUp attachments, a shared drive, a separate system?

7. **On-shelf date vs. PPS-requested date** — these are now confirmed as two distinct fields. Where does this data come from today — Sales? The buyer directly?
