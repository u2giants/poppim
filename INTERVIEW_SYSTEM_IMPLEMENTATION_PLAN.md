# Implementation Plan — AI Company Interview System

**Goal:** Replace the current round-based interview process with a live, streaming chat interface where an AI interviewer talks directly with each employee, all conversations share a single growing knowledge base, and the AI sounds like the same coherent researcher across every conversation.

---

## Table of Contents

1. [Claude Max vs API — Decision](#1-claude-max-vs-api--decision)
2. [Architecture Overview](#2-architecture-overview)
3. [The Shared Brain — How It Works](#3-the-shared-brain--how-it-works)
4. [Database Schema Changes](#4-database-schema-changes)
5. [System Prompt Design](#5-system-prompt-design)
6. [Cloudflare Worker — New Routes](#6-cloudflare-worker--new-routes)
7. [Chat UI](#7-chat-ui)
8. [Admin Dashboard](#8-admin-dashboard)
9. [Knowledge Extraction Pipeline](#9-knowledge-extraction-pipeline)
10. [Respondent Registry — All 18 People](#10-respondent-registry--all-18-people)
11. [Cost Estimate](#11-cost-estimate)
12. [Deployment Steps](#12-deployment-steps)
13. [User Experience — What Each Person Sees](#13-user-experience--what-each-person-sees)
14. [Future Enhancements](#14-future-enhancements)
15. [Open Questions Before Building](#15-open-questions-before-building)

---

## 1. Claude Max vs API — Decision

**Claude Max ($100/month) cannot be used here.** Max is a personal subscription for using Claude on claude.ai in a browser. It has no programmatic API access — you cannot make HTTP calls to it from a Worker.

**Use OpenRouter.ai.** OpenRouter provides API access to Claude (and dozens of other models) using the standard OpenAI-compatible API format. You pay per token used, not a flat subscription.

**Recommended model:** `anthropic/claude-sonnet-4-5`
- Excellent at nuanced conversation and following complex system prompts
- ~4× cheaper than Opus with 90%+ of the quality for interview-style conversations
- Upgrade to `anthropic/claude-opus-4` if conversations feel shallow — swap one line

**Estimated cost per completed interview:** $0.30–$1.50 depending on length (see Section 11)

**API format:**
```javascript
// OpenRouter uses the OpenAI API format
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://plane-integrations.u2giants.workers.dev',
    'X-Title': 'Company Interview System',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4-5',
    messages: [ /* system + conversation history */ ],
    stream: true,
    max_tokens: 800
  })
})
```

---

## 2. Architecture Overview

```
Employee clicks their personal link
        ↓
  Chat UI (HTML served from Worker)
        ↓
  POST /ai-interview/message
        ↓
  Worker builds system prompt:
    - Company context (BUSINESS_INTELLIGENCE.md summary)
    - Shared knowledge base (facts from all other conversations)
    - This person's role + prior session summaries
    - Role-specific focus topics
        ↓
  OpenRouter API (Claude Sonnet) → streaming response
        ↓
  Message saved to D1 (chat_messages)
        ↓ (every 5 turns, async)
  Knowledge extraction:
    - Send last 5 turns to Claude
    - Extract key facts
    - Store in knowledge_base table
        ↓
  Next employee's conversation
  automatically includes those facts
```

**Everything runs inside the existing Cloudflare Worker.** No new infrastructure. New secrets, new routes, new D1 tables.

---

## 3. The Shared Brain — How It Works

This is the core of the system. Every conversation feels like it comes from the same researcher who has spoken with everyone else.

### How context flows between conversations

1. **After every 5 turns** in any conversation, the Worker makes a background call to Claude:
   > *"Extract 3–5 specific, non-obvious facts from this conversation segment that would be useful when interviewing other employees at this company. Focus on: processes, pain points, tools used, relationships between roles, and gaps in the current system."*
   
   The extracted facts are stored in `knowledge_base` with a tag for who said it and what category it falls into.

2. **At the start of every new conversation**, the system prompt includes the most relevant facts from the knowledge base, filtered by the new employee's role. The AI knows:
   - What other people have said about processes this person is involved in
   - Pain points that were mentioned about their team or role
   - Things other people said about working with them specifically
   - Open questions from other conversations that this person might answer

3. **The AI can reference other conversations naturally:**
   > *"Jessica mentioned that preliminary designs get lost when buyers don't pick them. From your side — as a creative designer — how do you think about those designs once a buyer passes on them? Do you feel like that work is wasted?"*
   
   This makes every employee feel like they're being interviewed by someone who has genuinely done their homework.

### What the shared knowledge base tracks

Each entry has:
- `fact` — the distilled insight (e.g., "The Art Director review is the primary bottleneck in the POP Creations pipeline, with 5 distinct root causes identified")
- `category` — process / pain_point / tool / role / relationship / workflow / data
- `source_respondent` — who said it
- `confidence` — confirmed / mentioned / uncertain
- `relevant_to` — JSON array of respondent keys who would benefit from knowing this

---

## 4. Database Schema Changes

Three new tables. Run as a migration via the existing GitHub Actions migrate-database workflow.

```sql
-- Who can use the system (the 18 people + any future additions)
CREATE TABLE IF NOT EXISTS respondents (
  key             TEXT PRIMARY KEY,          -- 'jessica', 'liz', 'jen', etc.
  name            TEXT NOT NULL,             -- 'Jessica Cortázar'
  role            TEXT NOT NULL,             -- 'Project Manager'
  department      TEXT,                      -- 'POP Creations', 'Spruce Line', 'Production', etc.
  location        TEXT,                      -- 'US', 'China', 'Remote'
  interview_focus TEXT,                      -- what topics to cover with this person
  token           TEXT UNIQUE NOT NULL,      -- their secret auth token (random 32-char hex)
  admin_token     TEXT UNIQUE,               -- set only for Albert
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- One row per conversation session (a person may have multiple sessions)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id              TEXT PRIMARY KEY,          -- UUID
  respondent_key  TEXT NOT NULL REFERENCES respondents(key),
  started_at      TEXT DEFAULT (datetime('now')),
  last_active_at  TEXT,
  status          TEXT DEFAULT 'active',     -- active | completed | abandoned
  turn_count      INTEGER DEFAULT 0,
  summary         TEXT,                      -- AI-generated summary, filled after completion
  total_tokens    INTEGER DEFAULT 0
);

-- Every message in every conversation
CREATE TABLE IF NOT EXISTS chat_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
  role            TEXT NOT NULL,             -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  turn_number     INTEGER NOT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  tokens_used     INTEGER DEFAULT 0
);

-- Facts extracted from conversations — the shared brain
CREATE TABLE IF NOT EXISTS knowledge_base (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  fact            TEXT NOT NULL,
  category        TEXT,                      -- process | pain_point | tool | role | relationship | workflow | data
  source_key      TEXT NOT NULL,             -- who said it
  source_session  TEXT NOT NULL,
  confidence      TEXT DEFAULT 'mentioned',  -- confirmed | mentioned | uncertain
  relevant_to     TEXT,                      -- JSON array: ["jessica","liz","jen"]
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_base(source_key);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_respondent ON chat_sessions(respondent_key);
```

---

## 5. System Prompt Design

The system prompt is assembled dynamically on every request. It has six sections:

### Section 1 — Who you are (fixed)
```
You are conducting in-depth research interviews to understand every aspect of how 
[Company] operates — processes, tools, pain points, informal workflows, and what 
people wish they had but don't. Your findings will directly shape the design of a 
new project management system built specifically for this company.

You already know a lot about this company from data and prior conversations. 
You don't need basic explanations. Push deeper: ask about exceptions, edge cases, 
the informal rules that aren't written anywhere, and the things that frustrate 
people but they've accepted as normal.

Conversation style:
- One focused question at a time
- Follow the most interesting thread, don't just march through a list
- Reference other people by name when relevant: "I was talking to Jessica and she 
  mentioned X — does that match your experience?"
- Surface data observations: "The data shows 1,574 products sitting at Concept 
  Approved with no next step — what's your take on that?"
- Non-technical audience: suggest improvements they may not have thought of, 
  describe them plainly, and ask if they'd find them useful
- After ~25 exchanges, wrap up and ask if there's anything important not covered
- Never mention that you are an AI unless directly asked
```

### Section 2 — Company context (condensed, ~400 words)
```
## What you know about this company
[Condensed version of BUSINESS_INTELLIGENCE.md key facts]
Licensed home decor, manufactured in China, sold to US retail chains.
75% licensed (Disney, Marvel, WB, etc.) — must get design AND sample approval.
25% non-licensed (Spruce Line / Edge brand).
Three work initiation paths: customer request, internal refresh, new product development.
Three sales channels: major retail, wholesale sublicensors (Stallion Art, Iconick), internal dev.
[etc.]
```

### Section 3 — Who you are talking to (dynamic)
```
## You are talking to: {name}, {role}
Department: {department}
Location: {location}

What you want to learn from {name}:
{interview_focus — the specific topics relevant to their role}
```

### Section 4 — Shared knowledge (dynamic, from knowledge_base)
```
## What you've learned from other conversations (use this to go deeper, not to repeat)
[Top 15 most relevant knowledge_base facts for this person's role, formatted as bullets]

• Jessica (PM): The Art Director review creates a backlog with 5 distinct root causes — 
  artwork changes at the LS stage, unfamiliar product types, color preferences, 
  property errors, and competing responsibilities
• Liz (Creative Director): The most common submission error is missing or wrong Pantone 
  codes — templates have reduced most other errors
• [etc.]
```

### Section 5 — What this person has already said (dynamic, from prior sessions)
```
## What {name} has already told you (don't ask again, but do follow up)
[Summaries from any prior sessions with this respondent]
```

### Section 6 — Opening move (dynamic)
```
## How to open this conversation
Start with a warm, specific opening that shows you know their role.
Don't start with "Hello, I'm an AI." Just dive in like a colleague.

Good opening for {name}: "{role-specific opening line}"
```

---

## 6. Cloudflare Worker — New Routes

Add to `integrations/worker/src/index.js`:

### Route map

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/ai-interview` | None | Public landing page (links to chat, explains what it is) |
| GET | `/ai-interview/chat` | Token | Chat UI for an employee |
| POST | `/ai-interview/message` | Token | Send a message, get streaming response |
| POST | `/ai-interview/complete` | Token | Mark session complete, trigger summary |
| GET | `/ai-interview/admin` | Admin token | Dashboard: all sessions, knowledge base |
| GET | `/ai-interview/admin/transcript/:session_id` | Admin token | Full transcript |
| GET | `/ai-interview/admin/knowledge` | Admin token | Full knowledge base |
| GET | `/ai-interview/admin/export` | Admin token | Download all data as JSON |
| POST | `/ai-interview/admin/setup` | Admin token | Initialize respondents (one-time) |

### Auth flow

Every request to `/ai-interview/chat` or `/ai-interview/message` requires a `token` query parameter or cookie. The Worker looks up the token in the `respondents` table to identify the user and load their context.

```javascript
async function getRespondentByToken(token, db) {
  const result = await db.prepare(
    'SELECT * FROM respondents WHERE token = ? AND is_active = 1'
  ).bind(token).first();
  return result;
}
```

No login screen. No password. Just `?token=abc123` in the link. Albert distributes links.

### Message handler (core logic)

```javascript
async function handleMessage(request, env) {
  const { token, message } = await request.json();

  // 1. Authenticate
  const respondent = await getRespondentByToken(token, env.DB);
  if (!respondent) return new Response('Unauthorized', { status: 401 });

  // 2. Get or create session
  let session = await getActiveSession(respondent.key, env.DB);
  if (!session) session = await createSession(respondent, env.DB);

  // 3. Save user message
  await saveMessage(session.id, 'user', message, env.DB);

  // 4. Load conversation history (last 20 turns for context window efficiency)
  const history = await getRecentMessages(session.id, 20, env.DB);

  // 5. Build system prompt
  const systemPrompt = await buildSystemPrompt(respondent, env.DB);

  // 6. Call OpenRouter with streaming
  const stream = await callOpenRouter(systemPrompt, history, env);

  // 7. Stream response back to client, save to DB when complete
  return streamingResponse(stream, session.id, env.DB);

  // 8. Every 5 turns: trigger async knowledge extraction (no await)
  if (session.turn_count % 5 === 0) {
    env.ctx.waitUntil(extractKnowledge(session.id, respondent.key, env));
  }
}
```

### Streaming response

Use `TransformStream` to pipe the OpenRouter SSE response directly to the client while also capturing the full text for storage:

```javascript
async function streamingResponse(openRouterStream, sessionId, db) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  let fullText = '';

  // Process OpenRouter SSE stream
  const reader = openRouterStream.body.getReader();
  const pump = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        await saveMessage(sessionId, 'assistant', fullText, db);
        await writer.close();
        break;
      }
      // Parse SSE chunk, extract content delta
      const chunk = parseSSEChunk(value);
      if (chunk) {
        fullText += chunk;
        await writer.write(new TextEncoder().encode(`data: ${chunk}\n\n`));
      }
    }
  };
  pump(); // don't await — let it run
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## 7. Chat UI

Served directly from the Worker as an HTML string. Single-page, mobile-friendly. No external dependencies — everything inline.

### Visual design

```
┌─────────────────────────────────────────┐
│  Company Interview  [Complete Session]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Hi Jen! I've been learning a lot  │  │
│  │ about how the licensed side works │  │
│  │ from Liz and Jessica — but I      │  │
│  │ really want to understand the     │  │
│  │ Spruce Line from your perspective.│  │
│  │ Let's start simply: walk me       │  │
│  │ through what you're working on    │  │
│  │ this week.                        │  │
│  └───────────────────────────────────┘  │
│                                         │
│              ┌────────────────────────┐ │
│              │ Well right now I'm     │ │
│              │ putting together the   │ │
│              │ fall presentation for  │ │
│              │ Burlington...          │ │
│              └────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ [typing...]                       │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│ [ Type your response...          ] Send │
└─────────────────────────────────────────┘
```

### Key UI behaviors

- **Streaming text** — the AI's response appears word by word as it comes in (SSE)
- **Auto-scroll** — chat scrolls to the bottom as text streams in
- **Enter to send** — shift+enter for newline
- **Session persistence** — token stored in localStorage so closing and reopening the tab continues the same session
- **"Complete Session" button** — shown after 10+ turns; clicking it triggers the summary generation and shows a thank-you screen
- **No progress indicator** — the AI doesn't show "Question 4 of 22" — it feels like a natural conversation, not a form
- **Mobile-first layout** — works on phone (most non-technical users will prefer this)

### HTML structure (served from Worker)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Company Interview</title>
  <style>/* all styles inline */</style>
</head>
<body>
  <div id="chat-container">
    <div id="header">
      <span id="title">Company Interview</span>
      <button id="complete-btn" style="display:none">I'm done</button>
    </div>
    <div id="messages"></div>
    <div id="input-area">
      <textarea id="input" placeholder="Type your response..." rows="2"></textarea>
      <button id="send-btn">Send</button>
    </div>
  </div>
  <script>
    const TOKEN = new URLSearchParams(window.location.search).get('token')
                || localStorage.getItem('interview_token');
    if (TOKEN) localStorage.setItem('interview_token', TOKEN);
    // ... chat logic with fetch + ReadableStream for SSE
  </script>
</body>
</html>
```

---

## 8. Admin Dashboard

Albert accesses via `?token={admin_token}`. Shows the full picture.

### Dashboard sections

**1. Overview cards**
```
18 people registered    11 completed    4 in progress    3 not started
Knowledge base: 847 facts   Last activity: 2 hours ago
```

**2. Respondent status table**

| Name | Role | Sessions | Last Active | Status | Actions |
|------|------|----------|-------------|--------|---------|
| Jessica | PM | 2 sessions | Today | ✅ Done | View / Export |
| Liz | Creative Dir. | 1 session | Yesterday | ✅ Done | View / Export |
| Jen | Spruce CD | 1 session | 3 days ago | 🟡 In progress | View |
| Adam | Sales | 0 sessions | — | ⬜ Not started | Send reminder |

**3. Knowledge base browser**

Searchable, filterable by category and source. Shows all extracted facts with their source and confidence level. This is the accumulated intelligence from all conversations.

**4. Cross-reference view**

Shows connections: *"3 people mentioned the Art Director bottleneck. 2 people mentioned the lost designs problem. 0 people have mentioned the costing sheet workflow."*

**5. Export**

Download full data package: all transcripts + full knowledge base as JSON or CSV.

---

## 9. Knowledge Extraction Pipeline

This runs asynchronously (using `ctx.waitUntil`) so it never delays the user's chat response.

### Trigger
Every 5 turns in a conversation, and again when a session completes.

### Extraction prompt

```
You are analyzing a segment of a research interview at a licensed home decor company.

Company context: [2-sentence summary]
Respondent: {name}, {role}

Interview segment:
{last 5 turns of conversation}

Extract 3–6 specific, non-obvious facts from this segment that would be genuinely 
useful to know when interviewing other employees. 

For each fact:
1. State the fact clearly in one sentence
2. Assign a category: process | pain_point | tool | relationship | workflow | data
3. Rate confidence: confirmed (stated directly) | mentioned (implied) | uncertain (inferred)
4. List which other roles would benefit from knowing this (from this list: 
   jessica, liz, jen, mal, vie, nathalie, marcel, derrick, angie, ale, ilona, 
   laura, adam, yuchen, emma, elise, albert, kelly)

Format as JSON array:
[
  {
    "fact": "...",
    "category": "...",
    "confidence": "...",
    "relevant_to": ["...", "..."]
  }
]
```

### Storage

Each extracted fact is inserted into `knowledge_base` with the source respondent and session ID. When building future system prompts, the Worker queries:

```sql
SELECT fact, category, source_key, confidence 
FROM knowledge_base 
WHERE relevant_to LIKE '%' || ? || '%'
   OR source_key IN (
     SELECT key FROM respondents WHERE department = ?
   )
ORDER BY created_at DESC
LIMIT 20
```

### Session completion summary

When a session is marked complete, generate a 200-word summary:

```
Summarize the key things learned from this interview in 150–200 words. 
Focus on: how they do their work, what frustrates them, what they wish 
they had, and any surprises. This summary will be shown to the company 
owner and used to inform the new system design.
```

Store in `chat_sessions.summary`.

---

## 10. Respondent Registry — All 18 People

Initial data for the `respondents` table. Tokens are 32-char random hex strings generated at setup time.

| Key | Name | Role | Department | Location | Interview Focus |
|-----|------|------|------------|----------|-----------------|
| jen | Jen | Creative Director (Spruce) | Spruce Line | US | Spruce Line process end-to-end; how collections are tracked vs SKUs; buyer presentation workflow; pain points; what tools she'd want |
| mal | Mal | Creative Designer (Spruce) | Spruce Line | US | Day-to-day design workflow; tools used; how work is assigned; what's annoying about the current system; collaboration with Jen |
| vie | Vie | Creative Designer (Spruce) | Spruce Line | US | Same as Mal — independent perspective; file workflow; how they handle feedback |
| nathalie | Nathalie | Junior Creative Designer (Spruce) | Spruce Line | US | Onboarding experience; what's confusing or unclear; how they learn the process; what would have helped to have earlier |
| liz | Liz (Elizabeth Parkin) | Creative Director (Spruce + POP) | Both | US | Review queue workflow; what pre-validation would help; file access needs; how Sarbani's old role has changed; Brand Assurance; designer quality variance |
| marcel | Marcel | Creative Designer (Spruce + POP) | Both | US | Design workflow across both lines; how licensed vs non-licensed work differs from a designer's perspective; file management |
| derrick | Derrick | Creative Designer (Spruce + POP) | Both | US | Same as Marcel — independent perspective |
| jessica | Jessica Cortázar | Project Manager (POP + Spruce) | Both | US | Full pipeline management; stage advancement; bottlenecks; "for adam" tag meaning; PI approval; dormant products; costing sheets |
| angie | Angie | Technical Designer | POP Creations | Remote | Licensing sheet creation process; what information is missing when she receives a brief; Techpack workflow; pain points |
| ale | Ale | Technical Designer | POP Creations | Remote | Same as Angie — independent perspective; collaboration with factory |
| ilona | Ilona | Licensing Manager | POP Creations | US | Licensor portal submission process; which licensors are most demanding; common rejection reasons; how she tracks what's been submitted |
| laura | Laura | Licensing Coordinator | POP Creations | US | Day-to-day licensing admin; downloading assets; submission tracking; what would make her job easier |
| adam | Adam | Sales | Sales | US | How buyer requests are initiated; how he presents preliminary designs; what information he needs from the design team; what's currently unclear or missing |
| yuchen | Yuchen | Production & Logistics Coordinator | Production | US | US-side production flow; how orders move from approved to manufactured; logistics coordination with China; what information gaps exist |
| emma | Emma | Production & Logistics Coordinator | Production | China | China-side production; factory communication; sample coordination; what's hard about coordinating with the US team |
| elise | Elise | Product Developer | Production | China | New product development process from China side; factory capabilities; what constraints designers in the US don't know about |
| albert | Albert | Owner / Sourcing / Production | All | US | High-level: biggest strategic gaps in the current system; what he wishes he could see at a glance; sourcing process; production oversight |
| kelly | Kelly | China Sourcing & Office Manager | Sourcing | China | Factory relationships; sourcing process; what information flows between China and US; what gets lost in translation |

---

## 11. Cost Estimate

Assumptions: 25 turns per interview, ~150 tokens per turn average, 18 people.

| Item | Tokens | Rate (Sonnet) | Cost |
|------|--------|---------------|------|
| Per interview (25 turns × 150 avg) | ~3,750 output | $3/M tokens | ~$0.011 |
| System prompt per turn (~2,000 tokens × 25 turns) | ~50,000 input | $3/M tokens | ~$0.15 |
| Knowledge extraction (5 calls × 500 tokens each) | ~2,500 | $3/M tokens | ~$0.008 |
| **Per interview total** | | | **~$0.17** |
| **All 18 interviews** | | | **~$3.00** |
| Multiple sessions per person (2 avg) | | | **~$6.00 total** |

Even running every person through 3 sessions each, total cost is under $15. This is effectively free at the scale of this project.

---

## 12. Deployment Steps

### Step 1 — Add secrets to Cloudflare Worker

```bash
wrangler secret put OPENROUTER_API_KEY --name plane-integrations
wrangler secret put INTERVIEW_ADMIN_TOKEN --name plane-integrations
```

### Step 2 — Run database migration

Add the 4 new tables to a new migration file (`scripts/migrate_interview_schema.sql`) and trigger via GitHub Actions:

```bash
gh workflow run migrate-database.yml --repo u2giants/plane
```

### Step 3 — Initialize respondents

One-time setup call to the admin endpoint:

```
POST /ai-interview/admin/setup
Authorization: Bearer {admin_token}
```

This inserts all 18 respondents into the `respondents` table and generates a unique token for each. Returns a JSON object with all tokens so Albert can distribute links.

### Step 4 — Deploy updated Worker

```bash
gh workflow run deploy-worker.yml --repo u2giants/plane
```

### Step 5 — Distribute links

Albert sends each person their link:
```
https://plane-integrations.u2giants.workers.dev/ai-interview/chat?token={their_token}
```

Can be sent via Teams, email, or WhatsApp. The link is single-use per person (their token is theirs permanently — they can return to continue later). No expiry.

### Step 6 — Monitor

Albert checks the admin dashboard at:
```
https://plane-integrations.u2giants.workers.dev/ai-interview/admin?token={admin_token}
```

---

## 13. User Experience — What Each Person Sees

1. **They receive a personal link** via Teams or email. No app to install, no account to create.

2. **They click the link** and land on a clean chat interface. The AI greets them by name with a specific, warm opening based on their role and what's already been learned.

3. **They chat naturally.** The AI asks one question at a time, follows up on interesting answers, and occasionally references things others have said: *"I was talking to Ilona about the licensor submission process — she mentioned that [X]. Does that match what you see from your side?"*

4. **No time pressure.** They can close the tab and come back — the conversation continues where it left off. Sessions don't expire.

5. **When they feel done**, they click "I'm done" or just stop. The AI wraps up gracefully and thanks them. The session is marked complete and a summary is generated.

6. **They can always come back.** If they think of something later, they click their link again and start a new session. All prior sessions are preserved.

---

## 14. Future Enhancements

These are out of scope for v1 but worth noting for later:

**v2 — Synthesis view**
After all 18 interviews are complete, a single endpoint generates a comprehensive synthesis across all conversations: what everyone agrees on, where there are contradictions, what topics were mentioned by every role, what was mentioned by only one person.

**v2 — Live updates in admin dashboard**
Admin sees a live feed of new insights being added to the knowledge base as conversations happen.

**v2 — Interviewer "memory" per respondent**
The system prompt includes a structured model of what the AI knows about this specific person (not just facts, but their communication style, areas of expertise, things they seemed uncertain about) to personalize the experience even more.

**v3 — Reusable for any company process**
The system is entirely configurable: company context, respondent list, interview topics, and knowledge extraction prompts are all data, not code. Other companies or other processes at this company (e.g., onboarding new employees, post-project retrospectives) can use the same system with different configuration.

**v3 — Webhook to BUSINESS_INTELLIGENCE.md**
When the knowledge base reaches a certain completeness threshold, automatically regenerate and commit an updated `BUSINESS_INTELLIGENCE.md` incorporating everything learned.

---

## 15. Open Questions Before Building

1. **Link distribution method** — Will you send links via Teams, email, or WhatsApp? This affects whether we add a landing page that explains what the system is.

2. **Language** — Some team members are in China. Should the system detect their preferred language and respond in Chinese if needed? (OpenRouter/Claude handles this natively.)

3. **Confidentiality framing** — Should employees know that Albert can read their responses? Or should it be framed as anonymous? This affects honesty. Recommended: be transparent — they're helping design a better system for everyone, not being evaluated.

4. **Session length limits** — Should there be a hard limit on turns (e.g., max 40 per session) to control costs and keep conversations focused?

5. **Notification when complete** — When a person completes their interview, should Albert get a notification (email or Teams message)?

6. **Company name** — The system prompt currently says "[Company]." What name should it use?

---

## Implementation Effort Estimate

| Component | Effort |
|-----------|--------|
| D1 schema migration (4 tables) | 1–2 hours |
| OpenRouter integration in Worker | 2–3 hours |
| System prompt builder (dynamic assembly) | 3–4 hours |
| Knowledge extraction pipeline | 2–3 hours |
| Chat UI (HTML/CSS/JS, streaming) | 4–6 hours |
| Admin dashboard | 3–4 hours |
| Respondent setup + token generation | 1 hour |
| Testing end-to-end with 2 test users | 2–3 hours |
| **Total** | **~20–26 hours** |

This is a single focused sprint — 3–4 days for one developer (or an AI coding session).
