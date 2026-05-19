# Future Session Start Here

**Purpose:** This file is the fastest accurate starting point for a new AI session with no prior knowledge of this project.

**Date:** 2026-05-19  
**Scope:** Designing a replacement for the company's current ClickUp workflow using Plane, based on direct analysis of the ClickUp imports in Cloudflare D1 plus employee interviews.

---

## What We Are Trying To Accomplish

The company currently runs product development and approval work in ClickUp. The goal is to replace that with a system that is materially better aligned to the real business flow:

- licensed home decor products under POP Creations
- generic / non-licensed products under Spruce Line
- buyer/project intake
- design execution
- licensor approval
- sample / PPS approval
- production handoff

The replacement system must not just mimic ClickUp boards. It needs to model the actual business objects and their relationships.

---

## Most Important Truths Learned So Far

### 1. The current data is not one flat list of "products"

The raw ClickUp import contains at least two distinct business object types:

- **Project cards**: buyer + retailer + season + brief + collection/presentation context
- **SKU execution tasks**: individual picked or developed products that move through design, licensor approval, sampling, and production

This is not a guess. It is visible in the parent/child structure of the raw `tasks` table:

- `Customer Refresh`: `264` parent cards, `2446` child tasks
- `Customer Category Expansion`: `78` parent cards, `428` child tasks
- `New Prod Development`: `199` parent cards, `457` child tasks
- `Licensing Management`: `7281` parent cards, `4280` child tasks

The new system must explicitly model this hierarchy instead of flattening everything into one issue type.

### 2. POP Creations and Spruce Line are genuinely different workflows

**POP Creations** is licensed and approval-heavy:

- concept / design approval
- internal gate through Liz
- licensor concept approval
- sample / PPS approval
- pre-production approval
- production approval

**Spruce Line** appears simpler and more collection/presentation-oriented, but it is still not fully understood because Jen has not answered her interview round yet.

### 3. The interview answers are as important as the database

The D1 data is enough to infer structure, but the interviews explain why the structure exists and what the work means.

Key examples:

- Jessica confirms that many ClickUp cards represent buyer-season projects, not individual SKUs.
- Jessica confirms that selected buyer picks become SKU-level execution work.
- Jessica confirms that preliminary designs get lost and reused manually today.
- Liz confirms that her review queue is a real internal gate and that revision feedback is mostly off-system.

### 4. The D1 dataset is useful but incomplete

Some important surfaces are sparse or empty:

- `task_comments`: `244` rows, but only `23` with meaningful content
- `task_attachments`: `0`
- `task_links`: `0`
- `time_entries`: `0`
- `custom_field_definitions`: `0`

Field population is also sparse:

- `licensor`: `5615 / 9051`
- `retailer`: `200 / 9051`
- `product_category`: `57 / 9051`
- `buyer`: `17 / 9051`
- `due_date`: `370 / 9051`

This means the database reveals the process structure better than it reveals complete business metadata.

### 5. Most historical status transitions are estimated, not true live transitions

`status_transitions` currently contains `17979` rows, but:

- `17765` are `source='estimated'`
- only `214` have a real `from_status` from webhook capture

Do not over-trust transition analytics as if they were full historical truth.

### 6. "Open" and "active" are not the same thing

There are many records with non-closed status that are not actively moving now.

Example:

- `Licensing Management`: `7281` total, `5106` non-closed, but only `8` marked active

This is a major domain-design implication. The new system needs clearer lifecycle states such as:

- active
- waiting on buyer
- parked
- canceled
- complete

instead of relying only on stage/status.

---

## Current Best Working Model Of The Business

### Intake layer

Most work starts in one of these parent-card streams:

- `Customer Refresh`
- `Customer Category Expansion`
- `New Prod Development`

These are usually buyer/project/presentation level records.

### Execution layer

SKU-level execution work lives in:

- child tasks under those parent cards
- much of `Licensing Management`

This is where the detailed approval and production workflow happens.

### Support layer

Additional lists exist for support and coordination:

- `Licensing Administration Tasks`
- `Licensor's projects`
- freelancer lists
- presentation lists

These should not be confused with the core SKU execution objects.

### POP Creations workflow

The most defensible model today is:

1. project brief or internal concept source
2. preliminary design / buyer presentation
3. buyer pick or internal SKU creation
4. art files
5. licensing sheet / packaging / tech design
6. Liz review
7. licensor concept submission
8. concept revision loop if needed
9. sample / PPS request and review
10. sample revision loop if needed
11. pre-production approval
12. production approval
13. PO / factory / fulfillment handoff

### Spruce Line workflow

The current best guess is:

1. idea or collection creation
2. internal design work
3. internal approval
4. buyer presentation / buyer approval
5. factory or production work
6. completion

This is still provisional until Jen answers her interview round.

---

## Interview Status

As of 2026-05-19:

- `Jessica`: `21` answered, `11` pending
- `Liz`: `15` answered, `0` pending
- `Jen`: `0` answered, `12` pending

### New questions added on 2026-05-19

The following were inserted into `interview_questions` to tighten the future domain model:

- `56` `jessica` `sku_creation_trigger`
- `57` `jessica` `reuse_and_derivatives`
- `58` `jen` `spruce_reuse_model`
- `59` `jen` `spruce_selection_split`

These questions matter because the hardest unresolved modeling problem is the relationship between:

- project brief
- preliminary design
- reusable concept
- buyer selection
- SKU
- derivative SKU for another buyer

---

## Highest-Value Unknowns Still Open

These are the questions that block a strong source-of-truth domain model.

### Jessica

- What exactly triggers creation of a child SKU under a project?
- How should reuse and derivative designs be modeled?
- What does `PI approval` mean?
- What does `Brand Assurance` mean?
- What should happen to dormant `Concept Approved` work?
- How should old open records be closed or canceled?
- How does the costing-sheet / factory-constraint workflow really work?
- What does the `for adam` tag mean in practice?

### Jen

- What does one Spruce Line task actually represent?
- Is Spruce primarily tracked as projects, collections, presentations, or SKUs?
- What happens when only part of a collection is selected by a buyer?
- How should reuse across buyers be modeled?
- What are the actual approval gates before buyer and before production?

---

## What Has Been Done

- Repo inspected and markdown docs reviewed
- Live D1 access verified directly via Cloudflare REST
- Raw schema and counts checked directly against D1
- Parent/child ClickUp task structure analyzed
- Product/list/stage distributions analyzed
- Interview table queried directly
- Latest interview response status verified
- Additional high-value interview questions inserted for Jessica and Jen

---

## What Still Needs To Be Done

### Before final domain modeling

- get answers from Jessica on the open POP workflow questions
- get first full response set from Jen for Spruce Line

### For the source-of-truth model

- define explicit business entities
- separate project briefs from SKU execution records
- define whether preliminary designs are first-class records
- define reuse / derivative relationships
- define parked / dormant / canceled lifecycle states
- define approval checkpoints and ownership clearly

### For implementation planning

- decide how Plane should map project vs SKU vs sub-issue
- decide which requirements fit Plane natively and which require customization
- decide what metadata belongs to project, design, SKU, submission, sample, and production objects

---

## Recommended Rule For Future AI Sessions

Do not treat any single markdown file in this repo as full source of truth on its own.

Use this order:

1. `FUTURE_SESSION_START_HERE.md`
2. `BUSINESS_INTELLIGENCE.md`
3. `HANDOFF.md`
4. live D1 validation
5. interview answers in `interview_questions`

When the docs and the raw data disagree, prefer the live D1 results unless there is a clear reason not to.

---

## Fast Facts

- D1 `products` non-internal: `9051`
- D1 `tasks`: `17751`
- D1 `status_transitions`: `17979`
- D1 `events`: `1255`
- D1 `interview_questions`: `59`
- webhook window currently visible in D1: `2026-03-30 21:39:30` through `2026-05-19 14:32:47`

---

## Bottom Line

The core design problem is not "how do we copy ClickUp into Plane."

It is:

**How do we build a domain model that explicitly represents project briefs, reusable designs, buyer selections, SKU execution, approvals, samples, and production handoff in a way ClickUp never did?**
