// Copy product cover images from ClickUp's CDN into DigitalOcean Spaces (durable,
// owned storage), and repoint product.cover_url at the Spaces URL.
//
// Why: cover_url currently points at ClickUp's public CDN. The company is
// migrating off ClickUp, so those URLs will eventually die. This downloads each
// working cover and uploads it to the public `poppim` Space, then rewrites
// cover_url to `https://poppim.nyc3.digitaloceanspaces.com/covers/<id>.<ext>`.
//
// Scope: products whose cover_url is a working ClickUp URL (contains
// `clickup-attachments.com` and NOT `_large` — the `_large` form 403s; let
// clickup-images-recover.mjs fix those to working URLs first). Products already
// on Spaces are skipped. Safe to run concurrently with the recovery crawl: the
// two never fight (recovery skips non-empty/non-_large, uploader skips Spaces
// URLs), but a final sweep after recovery finishes catches stragglers.
//
// Resumable via an offset checkpoint. Uses a dependency-free AWS SigV4 signer.
//
// Usage:
//   POPPIM_ENV_FILE=/home/ai/.directus-deploy.env \
//   DX_URL=https://data.designflow.app \
//   node pm-system/migration/spaces-cover-upload.mjs
import { createHash, createHmac } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import sharp from 'sharp'

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
const REGION = process.env.DO_SPACES_REGION, BUCKET = process.env.DO_SPACES_NAME
const SP_KEY = process.env.DO_SPACES_KEY, SP_SECRET = process.env.DO_SPACES_SECRET
const SP_HOST = `${BUCKET}.${REGION}.digitaloceanspaces.com`
const PUBLIC_BASE = `https://${SP_HOST}`
const CHECKPOINT = process.env.CHECKPOINT_FILE || '/tmp/spaces-cover-upload.checkpoint'
const PAGE = 100
const CONCURRENCY = 6
const MAX_DIM = 1000 // longest-side px; board cards are ~280px, this leaves headroom for the detail view
const WEBP_QUALITY = 82
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
async function login() { TOKEN = ''; TOKEN = (await dx('POST', '/auth/login', { email: EMAIL, password: PASSWORD })).access_token }

// Minimal AWS SigV4 PUT to S3-compatible storage with public-read ACL.
async function s3Put(key, body, contentType) {
  const now = new Date()
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const datestamp = amzdate.slice(0, 8)
  const payloadHash = createHash('sha256').update(body).digest('hex')
  const canonHeaders = `host:${SP_HOST}\nx-amz-acl:public-read\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`
  const signedHeaders = 'host;x-amz-acl;x-amz-content-sha256;x-amz-date'
  const canonReq = `PUT\n/${key}\n\n${canonHeaders}\n${signedHeaders}\n${payloadHash}`
  const scope = `${datestamp}/${REGION}/s3/aws4_request`
  const strToSign = `AWS4-HMAC-SHA256\n${amzdate}\n${scope}\n${createHash('sha256').update(canonReq).digest('hex')}`
  const hmac = (k, d) => createHmac('sha256', k).update(d).digest()
  let s = hmac('AWS4' + SP_SECRET, datestamp); s = hmac(s, REGION); s = hmac(s, 's3'); s = hmac(s, 'aws4_request')
  const sig = createHmac('sha256', s).update(strToSign).digest('hex')
  const auth = `AWS4-HMAC-SHA256 Credential=${SP_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`
  const res = await fetch(`${PUBLIC_BASE}/${key}`, {
    method: 'PUT',
    headers: { Authorization: auth, 'x-amz-date': amzdate, 'x-amz-content-sha256': payloadHash, 'x-amz-acl': 'public-read', 'Content-Type': contentType },
    body,
  })
  if (!res.ok) throw new Error(`S3 PUT ${key} -> ${res.status}: ${await res.text()}`)
}

function needsUpload(url) {
  return !!url && url.includes('clickup-attachments.com') && !url.includes('_large')
}

// Download a ClickUp cover, downscale + re-encode to webp, push to Spaces;
// returns the new public URL, or null to leave the product untouched (download
// failed / not a decodable image). Resizing turns multi-MB originals into
// ~30-80KB webp so the board stays fast; every image is still captured.
async function migrateOne(product) {
  let res
  try { res = await fetch(product.cover_url) } catch { return null }
  if (!res.ok) return null
  const src = Buffer.from(await res.arrayBuffer())
  if (src.length === 0) return null

  let webp
  try {
    webp = await sharp(src, { failOn: 'none' })
      .rotate() // honour EXIF orientation
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
  } catch {
    return null // not a decodable image (e.g. a PDF/heic the CDN served)
  }
  if (!webp || webp.length === 0) return null

  const key = `covers/${product.id}.webp`
  await s3Put(key, webp, 'image/webp')
  return `${PUBLIC_BASE}/${key}`
}

function loadCheckpoint() {
  if (existsSync(CHECKPOINT)) { try { return JSON.parse(readFileSync(CHECKPOINT, 'utf8')) } catch { /* ignore */ } }
  return { offset: 0, processed: 0, uploaded: 0, skipped: 0, failed: 0 }
}
function saveCheckpoint(c) { writeFileSync(CHECKPOINT, JSON.stringify(c)) }

// Simple concurrency-limited map.
async function pmap(items, limit, fn) {
  const out = new Array(items.length)
  let idx = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = idx++; if (i >= items.length) break
      out[i] = await fn(items[i], i)
    }
  }))
  return out
}

async function run() {
  await login()
  const c = loadCheckpoint()
  console.log(`[${new Date().toISOString()}] start offset ${c.offset} (uploaded=${c.uploaded} skipped=${c.skipped} failed=${c.failed})`)

  for (;;) {
    let batch
    try {
      await login()
      batch = await dx('GET', `/items/product?filter[external_id][_nnull]=true&fields=id,cover_url&sort=id&limit=${PAGE}&offset=${c.offset}`)
    } catch (e) {
      console.log(`[${new Date().toISOString()}] batch fetch failed (${e.message}); retry in 30s`); await sleep(30000); continue
    }
    if (!batch.length) break

    const todo = batch.filter((p) => needsUpload(p.cover_url))
    c.skipped += batch.length - todo.length

    await pmap(todo, CONCURRENCY, async (p) => {
      let newUrl
      try { newUrl = await migrateOne(p) } catch (e) { console.log(`  ! ${p.id}: ${e.message}`); c.failed++; return }
      if (!newUrl) { c.failed++; return }
      try { await dx('PATCH', `/items/product/${p.id}`, { cover_url: newUrl }); c.uploaded++ }
      catch (e) { console.log(`  ! patch ${p.id}: ${e.message}`); c.failed++ }
      c.processed++
    })

    c.offset += batch.length
    saveCheckpoint(c)
    console.log(`[${new Date().toISOString()}] offset ${c.offset} | uploaded ${c.uploaded} skipped ${c.skipped} failed ${c.failed}`)
    if (batch.length < PAGE) break
  }

  saveCheckpoint(c)
  console.log(`[${new Date().toISOString()}] DONE: uploaded ${c.uploaded} skipped ${c.skipped} failed ${c.failed}`)
}
run().catch((e) => { console.error(e); process.exit(1) })
