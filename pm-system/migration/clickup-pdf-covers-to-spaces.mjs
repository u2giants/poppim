// Backfill product covers from ClickUp PDF attachments.
//
// The image migration only imported raster attachments. Many ClickUp product
// cards have their visible product artwork inside a tech-pack/licensing-sheet
// PDF instead. This script renders page 1 of the first PDF attachment to a
// JPEG cover, uploads it to Spaces, creates the normal card thumbnail, and
// repoints product.cover_url at the generated JPEG.
//
// Prerequisite on the host:
//   apt-get install -y poppler-utils
//
// Usage:
//   POPPIM_ENV_FILE=/home/ai/.directus-deploy.env \
//   DX_URL=https://data.designflow.app \
//   node pm-system/migration/clickup-pdf-covers-to-spaces.mjs
import { createHash, createHmac } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

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
const REGION = process.env.DO_SPACES_REGION, BUCKET = process.env.DO_SPACES_NAME
const SP_KEY = process.env.DO_SPACES_KEY, SP_SECRET = process.env.DO_SPACES_SECRET
const SP_HOST = `${BUCKET}.${REGION}.digitaloceanspaces.com`
const PUBLIC_BASE = `https://${SP_HOST}`
const CHECKPOINT = process.env.CHECKPOINT_FILE || '/tmp/clickup-pdf-covers-to-spaces.checkpoint'
const PAGE = Number(process.env.PAGE || 500)
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity
const CU_MIN_INTERVAL = Number(process.env.CU_MIN_INTERVAL || 800)
const PDF_DPI = Number(process.env.PDF_DPI || 144)
const COVER_WIDTH = Number(process.env.COVER_WIDTH || 1600)
const COVER_QUALITY = Number(process.env.COVER_QUALITY || 86)
const THUMB_DIM = Number(process.env.THUMB_DIM || 400)
const THUMB_QUALITY = Number(process.env.THUMB_QUALITY || 80)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let TOKEN = ''

for (const [name, value] of Object.entries({ EMAIL, PASSWORD, CU, REGION, BUCKET, SP_KEY, SP_SECRET })) {
  if (!value) throw new Error(`Missing required env: ${name}`)
}

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

let cuLast = 0
async function cuGate() {
  const wait = CU_MIN_INTERVAL - (Date.now() - cuLast)
  if (wait > 0) await sleep(wait)
  cuLast = Date.now()
}

async function clickupPdfUrl(taskId) {
  await cuGate()
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=false`, { headers: { Authorization: CU } })
  if (res.status === 429) { await sleep(60000); return clickupPdfUrl(taskId) }
  if (!res.ok) return null
  const d = await res.json()
  const pdf = (d.attachments || []).find((a) => (a.extension || '').toLowerCase() === 'pdf' && a.url)
  return pdf ? pdf.url : ''
}

function sigv4(method, key, payloadHash, extraHeaders) {
  const now = new Date()
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const datestamp = amzdate.slice(0, 8)
  const headers = { host: SP_HOST, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzdate, ...extraHeaders }
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort()
  const canonHeaders = names.map((n) => `${n}:${headers[Object.keys(headers).find((k) => k.toLowerCase() === n)]}`).join('\n') + '\n'
  const signedHeaders = names.join(';')
  const canonReq = `${method}\n/${key}\n\n${canonHeaders}\n${signedHeaders}\n${payloadHash}`
  const scope = `${datestamp}/${REGION}/s3/aws4_request`
  const strToSign = `AWS4-HMAC-SHA256\n${amzdate}\n${scope}\n${createHash('sha256').update(canonReq).digest('hex')}`
  const hmac = (k, d) => createHmac('sha256', k).update(d).digest()
  let s = hmac('AWS4' + SP_SECRET, datestamp); s = hmac(s, REGION); s = hmac(s, 's3'); s = hmac(s, 'aws4_request')
  const sig = createHmac('sha256', s).update(strToSign).digest('hex')
  return { Authorization: `AWS4-HMAC-SHA256 Credential=${SP_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`, 'x-amz-date': amzdate, 'x-amz-content-sha256': payloadHash, ...extraHeaders }
}

async function s3Put(key, body, contentType) {
  const payloadHash = createHash('sha256').update(body).digest('hex')
  const headers = sigv4('PUT', key, payloadHash, { 'x-amz-acl': 'public-read' })
  const res = await fetch(`${PUBLIC_BASE}/${key}`, { method: 'PUT', headers: { ...headers, 'Content-Type': contentType }, body })
  if (!res.ok) throw new Error(`S3 PUT ${key} -> ${res.status}: ${await res.text()}`)
}

async function renderPdfCover(pdfBuf) {
  const dir = mkdtempSync(join(tmpdir(), 'poppim-pdf-cover-'))
  try {
    const pdfPath = join(dir, 'source.pdf')
    const prefix = join(dir, 'page')
    writeFileSync(pdfPath, pdfBuf)
    await execFileAsync('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-jpeg', '-r', String(PDF_DPI), pdfPath, prefix], { timeout: 30000 })
    const rendered = await readFile(`${prefix}.jpg`)
    return sharp(rendered)
      .rotate()
      .resize({ width: COVER_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: COVER_QUALITY, mozjpeg: true })
      .toBuffer()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function thumbFromCover(cover) {
  return sharp(cover)
    .rotate()
    .resize({ width: THUMB_DIM, height: THUMB_DIM, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer()
}

function loadCheckpoint() {
  if (existsSync(CHECKPOINT)) { try { return JSON.parse(readFileSync(CHECKPOINT, 'utf8')) } catch { /* ignore */ } }
  return { index: 0, processed: 0, uploaded: 0, noPdf: 0, failed: 0 }
}
function saveCheckpoint(c) { writeFileSync(CHECKPOINT, JSON.stringify(c)) }

async function fetchCandidates() {
  const rows = []
  for (let offset = 0;; offset += PAGE) {
    await login()
    const batch = await dx('GET', `/items/product?filter[external_id][_nnull]=true&filter[cover_url][_empty]=true&fields=id,external_id,cover_url&sort=id&limit=${PAGE}&offset=${offset}`)
    rows.push(...batch)
    if (batch.length < PAGE || rows.length >= LIMIT) break
  }
  return rows.slice(0, LIMIT)
}

async function migrateOne(p, c) {
  const pdfUrl = await clickupPdfUrl(p.external_id)
  if (pdfUrl === null) return
  if (pdfUrl === '') { c.noPdf++; return }

  let res
  try { res = await fetch(pdfUrl) } catch { c.failed++; return }
  if (!res.ok) { c.failed++; return }

  let cover
  try { cover = await renderPdfCover(Buffer.from(await res.arrayBuffer())) }
  catch (e) { console.log(`  ! render ${p.id}: ${e.message}`); c.failed++; return }

  const coverKey = `covers/${p.id}.jpg`
  const thumbKey = `covers/${p.id}_thumb.webp`
  try {
    await s3Put(coverKey, cover, 'image/jpeg')
    await s3Put(thumbKey, await thumbFromCover(cover), 'image/webp')
  } catch (e) {
    console.log(`  ! upload ${p.id}: ${e.message}`); c.failed++; return
  }

  try { await dx('PATCH', `/items/product/${p.id}`, { cover_url: `${PUBLIC_BASE}/${coverKey}` }); c.uploaded++ }
  catch (e) { console.log(`  ! patch ${p.id}: ${e.message}`); c.failed++ }
}

async function run() {
  await login()
  const c = loadCheckpoint()
  const candidates = await fetchCandidates()
  console.log(`[${new Date().toISOString()}] candidates ${candidates.length}; start index ${c.index} (uploaded=${c.uploaded} noPdf=${c.noPdf} failed=${c.failed})`)

  for (; c.index < candidates.length; c.index++) {
    await login()
    await migrateOne(candidates[c.index], c)
    c.processed++
    if (c.processed % 25 === 0) {
      saveCheckpoint(c)
      console.log(`[${new Date().toISOString()}] index ${c.index + 1}/${candidates.length} | uploaded ${c.uploaded} noPdf ${c.noPdf} failed ${c.failed}`)
    }
  }

  saveCheckpoint(c)
  console.log(`[${new Date().toISOString()}] DONE: uploaded ${c.uploaded} noPdf ${c.noPdf} failed ${c.failed}`)
}

run().catch((e) => { console.error(e); process.exit(1) })
