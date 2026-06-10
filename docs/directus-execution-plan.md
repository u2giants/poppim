# Directus Execution Plan — How We Build It

**Date:** 2026-06-09
**Companion to:** `platform-decision-report.md` (the *why*). This doc is the *how*.
**Status:** agreed direction; captures the decisions and refinements from the planning conversation so they survive across sessions.

---

## 0. Who is building this (the optimization that drives everything)

There is **no engineering team**. The builder is **one non-programmer directing AI coding agents (Claude Max + Codex Pro)**. AI compute is effectively unlimited; the **real cost is debugging the AI's "rewiring mistakes."**

Therefore every choice optimizes for **the fewest breakable moving parts on the most standard, best-documented path** — because AI agents are most reliable on mainstream, "on-rails" patterns and least reliable on niche custom integration glue. Concretely:
- **Never hand-roll the "plumbing"** (auth, login/SSO, permission-aware UI, CRUD screens, navigation). It's ~half of an app's code and the part most likely to break in subtle, security-relevant ways (e.g., leaking pricing to a designer). Let the platform or a framework own it.
- **Prefer configuration + no-code automation over custom code.** Configuring a documented platform produces far fewer AI mistakes than gluing custom pieces.
- **Fewest moving parts wins**, even at some cost to polish.

---

## 1. Platform decision (recap)

**Backbone = Directus** (self-hosted, source-available). We were **awarded the Open Innovation Grant (OIG)**, so it is free with no caps (unlimited seats/collections/Flows + SSO + custom/field-level access policies) for our size (9 employees, <$5M). Full rationale and the rejected options (Plane, OpenProject, NocoDB, Baserow, Teable, Huly, and de-forked Twenty as the fallback) are in `platform-decision-report.md`.

**Residual dependency to watch:** the OIG is revocable and eligibility-bound (<$5M / <50 employees). Confirm activation/renewal mechanics; if we ever cross the thresholds, a commercial license applies.

---

## 2. Build principles

1. **Directus is the backend ("the engine"); we keep it 100% stock and upgradable.** All customization lives in **drop-in extensions, Flows, and external services** — never by forking core.
2. **Never hand-roll auth / permissions / CRUD / navigation.** Either Directus's own **Data Studio** owns it (zero code), or a React framework (**Refine**) owns it (the AI writes screens, not plumbing).
3. **Configuration + Flows first; custom code last.** Most of the PM system is *configuring* collections, fields, states, views, and field-level policies, plus **Flows** for automation — not writing a front-end.
4. **One source of truth = one Directus backend.** The unification that matters is the **shared data/backend**, not a shared front-end framework. Apps that share Directus don't need to share a UI framework.

---

## 3. Front-end strategy

**Data-Studio-first, then one React app only where needed.**

- **Data Studio is a finished UI that ships with Directus** (configured, not coded; it's Vue but we use it as-is). It gives, out of the box: record lists + auto-generated forms, **Kanban / Calendar / Table / Cards** layouts, **field-level permissions enforced in the UI**, search/filter, saved per-role views, bulk edit, user/role management, and file/asset management.
- **Phase 1 uses Data Studio as the actual app.** A large fraction of `pm-system-design.md` (design-library search, stage boards, role-based views, hide-pricing-from-designers, bulk stage changes) is **Data Studio configuration**, and the custom logic (time-in-stage, multi-buyer detection, seasonal planner) is **Flows/Hooks or the existing analytics service** — i.e., backend, not UI.
- **A bespoke front-end is a Phase-2 polish layer, built incrementally per role** — only for the adoption-critical roles (sales, designers) if Data Studio's admin-shaped UX isn't friendly enough. When we build it:
  - **One external React app**, assembled from open-source, using **Refine** (gives the AI a Directus data provider + auth + CRUD + permission hooks, so it writes mostly screens, not plumbing). React is the stack the AI agents are most reliable on.
  - Open-source building blocks: `@directus/sdk`, Refine, **shadcn/ui** + Tailwind, **TanStack Table** (grids), **dnd-kit** (kanban), **FullCalendar** (calendar/gantt), React Hook Form + Zod (forms), Recharts/ECharts (dashboards).
  - **We are NOT reusing PopDAM's front-end** (it's not pretty and the AI rebuilds React cheaply). PopDAM stays its own app; only the **Directus backend** is shared.
- **Vue:** we touch it only if we choose to write a small Data Studio **Interface/Layout** extension (optional, rare). We are **not** maintaining "two frameworks" — Data Studio is a product, not our codebase.

**Open items to verify before relying on Phase 2:** health/maintenance of the **Refine ↔ Directus** data provider; **WeChat SSO** path (Microsoft + Google are straightforward; WeChat likely needs the generic OAuth2 driver or a small custom extension).

---

## 4. Phased plan (do not big-bang)

**Phase 1 — Greenfield PM on Directus (prove it).** Net-new, replaces ClickUp, no working system at risk, highest current pain. Model POP (Project→SKU) and Spruce (Collection→Project→Style) as collections; per-line stage states; custom fields; **field-level policies**; design library as a filtered view; **Flows** for SLA/alerts/notifications; reuse the existing Cloudflare D1/Worker layer (fed by Directus webhooks) for the AI assistant. **Use Data Studio as the UI.** Design the schema from day one to also hold CRM and DAM entities.

**Phase 2 — Consolidate the CRM off the Twenty fork** into the same Directus (companies/people/opportunities + the custom objects). Email-routing/AI logic → Directus Hooks/Flows or kept as external services. This also retires the Twenty fork-upgrade pain by consolidating rather than de-forking in place.

**Phase 3 — Fold in the DAM data layer (last; biggest; most irreplaceable muscle).** See §5.

Throughout: keep DO Spaces/R2 + NAS, keep Microsoft SSO, treat Directus core as stock+upgradable.

---

## 5. PopDAM → Directus mapping (Phase 3 reference)

PopDAM is three layers; only the engine room is *replaced*:

| Layer | Today | On Directus |
|---|---|---|
| **Engine room** (DB, auth, APIs, cron) — the plumbing/backend | Supabase (Postgres + Auth + Edge Functions + pg_cron) | **Replaced by Directus** (Postgres + Auth + auto REST/GraphQL API + Flows/Hooks). **DO Spaces stays.** |
| **The workers** (NAS Bridge Agent, Windows Illustrator render agent, Electron checkout Helper, Railway bulk worker) | Call Supabase edge functions | **Kept, but rewired** to call Directus's API. Edge-function logic (ingest, checkout tokens, style-group rebuilds) → Directus Hooks/Endpoints/Flows or the external Railway worker. |
| **The face** (React/Vite screens) | React, talks to Supabase | **Look kept, data-wiring rebuilt** to Directus's SDK — *or* lean on Data Studio for admin screens and keep React only for the polished gallery/search/checkout. |

The **rewiring** (frontend data calls + agent API calls from Supabase → Directus) is the real work and the main source of bugs to fix. The PSD/AI rendering, NAS scanning, and desktop checkout **muscle is platform-independent and stays ours.**

---

## 6. The Phase-1 Directus spike (runbook — ready to execute any session)

Goal: prove the data model, the relational graph, field-level visibility, the pipeline board, and the SLA foundation — with **zero custom front-end code**.

**Prereqs (yours to provide live):** a Directus instance (Docker on Coolify), the **OIG license/activation**, and **Microsoft Entra SSO** config (Azure tenant/client/redirect).

**Steps (all in Data Studio):**
1. **Stand up Directus** on Coolify; point file storage at R2/Spaces; enable Microsoft SSO.
2. **Model ~6 collections** to prove the relational graph: `Project`, `SKU`, `Design`, `Buyer`, `Licensor`, `Factory`. Relate them so you can click SKU → Design → Project → Buyer → Licensor → Factory.
3. **Add a `stage` status field** on `SKU` (or `Project`) with the **Spruce 11 stages**; open the **Kanban layout** to drag cards between stages.
4. **Add a `pricing` (cost) field** and a few domain fields (on-shelf date, a `PI status` enum, Brand Assurance #).
5. **Create a "Designer" role + policy** that can read specs but **NOT `pricing`**. Log in as that role and **confirm pricing is hidden** (this is the make-or-break requirement).
6. **Build one Flow:** trigger on `stage` change → **Create Item** in a `StageHistory` collection with `{sku, from, to, timestamp}`. This seeds time-in-stage / SLA / dormant alerts.
7. *(Stretch, optional)* one tiny **Vue Interface** extension to prove custom-UI-without-forking (the scoped-picker equivalent). Skip on first pass.

**Pass criteria:** you can navigate the relational graph, move SKUs across a Kanban board, see pricing hidden from the Designer role, and watch StageHistory rows accumulate as stages change — all without a custom front-end.

---

## 7. Immediate next artifacts (not yet done)

- **Re-target `pm-system-design.md`** from Plane to Directus (it currently describes a Plane build).
- **Draft the unified Phase-1 data model** — the concrete collections/fields/relations for PM (POP + Spruce) designed to also host CRM + DAM entities (SKU ↔ Design ↔ DAM asset ↔ Project ↔ Buyer ↔ Licensor ↔ Factory). This is the next focused deliverable.
