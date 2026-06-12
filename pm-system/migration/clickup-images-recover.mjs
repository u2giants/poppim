// Recover product cover images from ClickUp attachments — second pass.
//
// The first pass (clickup-images.mjs) stored ClickUp's `thumbnail_large` URL
// (the `<uuid>_large.jpg` form). ClickUp has since disabled that thumbnail
// endpoint, so ~2,333 of those now 403. The full attachment `url` (the
// `<uuid>/<filename>` form) is still publicly served and works. This pass
// re-fetches each task and stores the working full `url` instead.
//
// Scope: every product with an external_id whose cover_url is NOT already a
// working URL (i.e. empty, or contains `_large`). Products that already have a
// working cover_url are skipped WITHOUT a ClickUp call (cheap). This both
// recovers the broken `_large` covers and re-checks the empties (some of which
// were transient failures in the first pass).
//
// Resumable: a checkpoint file records the last processed offset. Re-running
// resumes from there. Because we only WRITE working URLs, the skip-if-working
// logic also makes a fresh run (offset 0) cheap for already-done products.
//
// Rate-limited to ~85 req/min (under ClickUp's ~100/min cap).
//
// Usage:
//   POPPIM_ENV_FILE=/home/ai/.directus-deploy.env \
//   DX_URL=https://data.designflow.app \
//   node pm-system/migration/clickup-images-recover.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

if (process.env.POPPIM_ENV_FILE) {
  for (const line of readFileSync(process.env.POPPIM_ENV_FILE, 'utf8').split('\n')) {
    const s = line.trim(); if (!s || s.startsWith('#') || !s.includes('=')) continue
    const i = s.indexOf('='); const k = s.slice(0, i).trim(); let v = s.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const BASE = process.env.DX_URL || 'https://data.designflow.app'
const EMAIL = process.env.DX_ADMIN_EMAIL, PASSWORD = process.env.DX_ADMIN_PASSWORD
const CU = process.env.CLICKUP_TOKEN
const CHECKPOINT = process.env.CHECKPOINT_FILE || '/tmp/clickup-images-recover.checkpoint'
const IMG = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const PAGE = 100
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let TOKEN = ''

async function dx(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text(); let json; try { json = text ? JSON.parse(text) : null } catch { json = text }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json?.errors?.[0]?.message || text}`)
  return json?.data ?? json
}
async function login() {
  TOKEN = ''
  TOKEN = (await dx('POST', '/auth/login', { email: EMAIL, password: PASSWORD })).access_token
}

// A cover_url is "working" if it's non-empty and not the disabled _large thumbnail form.
function isWorking(url) {
  return !!url && !url.includes('_large')
}

// Returns the first image attachment's full (working) public URL, or '' if none.
async function clickupImage(taskId) {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=false`, {
    headers: { Authorization: CU },
  })
  if (res.status === 429) { await sleep(60000); return clickupImage(taskId) }
  if (!res.ok) return null // null = task fetch failed (don't overwrite existing value)
  const d = await res.json()
  const img = (d.attachments || []).find((a) => IMG.has((a.extension || '').toLowerCase()) && a.url)
  // Prefer the full, public `url` (works); never the `_large` thumbnail (403).
  return img ? (img.url || '') : ''
}

function loadCheckpoint() {
  if (existsSync(CHECKPOINT)) {
    try { return JSON.parse(readFileSync(CHECKPOINT, 'utf8')) } catch { /* ignore */ }
  }
  return { offset: 0, processed: 0, recovered: 0, skipped: 0, noImage: 0 }
}
function saveCheckpoint(c) { writeFileSync(CHECKPOINT, JSON.stringify(c)) }

async function run() {
  await login()
  const c = loadCheckpoint()
  console.log(`[${new Date().toISOString()}] starting at offset ${c.offset} (processed=${c.processed} recovered=${c.recovered} skipped=${c.skipped} noImage=${c.noImage})`)

  for (;;) {
    let batch
    try {
      await login() // tokens expire ~15min; refresh each page
      batch = await dx('GET', `/items/product?filter[external_id][_nnull]=true&fields=id,external_id,cover_url&sort=id&limit=${PAGE}&offset=${c.offset}`)
    } catch (e) {
      console.log(`[${new Date().toISOString()}] batch fetch failed (${e.message}); retry in 30s`)
      await sleep(30000)
      continue
    }
    if (!batch.length) break

    for (const p of batch) {
      if (isWorking(p.cover_url)) { c.skipped++; continue } // already good — no ClickUp call

      let url
      try { url = await clickupImage(p.external_id) } catch { url = null }
      await sleep(700) // ~85 req/min

      if (url === null) continue // fetch failed — leave as-is, will retry on a future run
      if (url) {
        try { await dx('PATCH', `/items/product/${p.id}`, { cover_url: url }); c.recovered++ } catch { /* skip */ }
      } else {
        // No image attachment on the task. Record '' so the value is consistent.
        if (p.cover_url !== '') { try { await dx('PATCH', `/items/product/${p.id}`, { cover_url: '' }) } catch { /* skip */ } }
        c.noImage++
      }
      c.processed++
    }

    c.offset += batch.length
    saveCheckpoint(c)
    console.log(`[${new Date().toISOString()}] offset ${c.offset} | processed ${c.processed} recovered ${c.recovered} skipped ${c.skipped} noImage ${c.noImage}`)
    if (batch.length < PAGE) break
  }

  saveCheckpoint(c)
  console.log(`[${new Date().toISOString()}] DONE: processed ${c.processed} recovered ${c.recovered} skipped ${c.skipped} noImage ${c.noImage}`)
}
run().catch((e) => { console.error(e); process.exit(1) })
