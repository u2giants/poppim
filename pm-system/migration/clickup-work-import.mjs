// Import ClickUp task work data into active Poppim collections.
//
// This fills the live work areas added by add-clickup-work-model.mjs:
// product_file, product_update, product_tag, product_field, product_activity,
// plus ClickUp metadata fields on product. It is idempotent per product by
// replacing that product's ClickUp-origin rows before inserting fresh rows.
//
// Usage:
//   POPPIM_ENV_FILE=/home/ai/.directus-deploy.env \
//   DX_URL=https://data.designflow.app \
//   node pm-system/migration/clickup-work-import.mjs
//
// Optional:
//   LIMIT=100
//   CHECKPOINT_FILE=/tmp/clickup-work-import.checkpoint
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

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
const CU_TOKEN = process.env.CLICKUP_TOKEN
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity
const CHECKPOINT = process.env.CHECKPOINT_FILE || '/tmp/clickup-work-import.checkpoint'
const PAGE = 500
const CU_MIN_INTERVAL = Number(process.env.CU_MIN_INTERVAL || 800)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let TOKEN = ''
let cuLast = 0

function stableId(...parts) {
  return createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex')
}

function msToIso(ms) {
  if (!ms) return null
  const n = Number(ms)
  if (!Number.isFinite(n)) return null
  return new Date(n).toISOString()
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

async function login() {
  TOKEN = ''
  TOKEN = (await dx('POST', '/auth/login', { email: EMAIL, password: PASSWORD })).access_token
}

async function cu(path) {
  const wait = CU_MIN_INTERVAL - (Date.now() - cuLast)
  if (wait > 0) await sleep(wait)
  cuLast = Date.now()
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, { headers: { Authorization: CU_TOKEN } })
  if (res.status === 429) { await sleep(60000); return cu(path) }
  if (!res.ok) return null
  return res.json()
}

function priorityName(task) {
  const p = task.priority
  if (!p) return null
  return p.priority || p.name || String(p)
}

function customFieldValue(field) {
  const value = field.value
  if (value === undefined || value === null || value === '') return null
  const options = field.type_config?.options || []
  const optionName = (id) => {
    const option = options.find((o) => String(o.id) === String(id) || String(o.orderindex) === String(id))
    return option?.name || option?.label || null
  }
  if (field.type === 'drop_down') return optionName(value) || String(value)
  if (field.type === 'labels' && Array.isArray(value)) return value.map(optionName).filter(Boolean).join(', ')
  if (Array.isArray(value)) return value.map((v) => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function clearRows(collection, productId) {
  const rows = await dx('GET', `/items/${collection}?filter[product][_eq]=${productId}&filter[source_system][_eq]=clickup&fields=id&limit=-1`)
  for (const row of rows) await dx('DELETE', `/items/${collection}/${row.id}`)
}

async function insertMany(collection, rows) {
  for (const row of rows) await dx('POST', `/items/${collection}`, row)
}

async function comments(taskId) {
  const first = await cu(`/task/${taskId}/comment?start=0`)
  return first?.comments || []
}

async function importProduct(product) {
  const task = await cu(`/task/${product.external_id}?include_subtasks=false`)
  if (!task) return { failed: true }

  await dx('PATCH', `/items/product/${product.id}`, {
    description: task.description || task.text_content || null,
    priority: priorityName(task),
    clickup_url: task.url || null,
    clickup_list_id: task.list?.id || product.clickup_list_id || null,
    clickup_list_name: task.list?.name || product.clickup_list_name || null,
    clickup_created_at: msToIso(task.date_created),
    clickup_updated_at: msToIso(task.date_updated),
    clickup_closed_at: msToIso(task.date_closed),
    clickup_start_at: msToIso(task.start_date),
    clickup_due_at: msToIso(task.due_date),
    clickup_raw: task,
  })

  for (const collection of ['product_file', 'product_update', 'product_tag', 'product_field', 'product_activity', 'checklist_item']) {
    await clearRows(collection, product.id)
  }

  await insertMany('product_file', (task.attachments || []).map((a) => ({
    product: product.id,
    title: a.title || a.name || a.filename || 'Untitled file',
    file_type: a.extension || null,
    mime_type: a.mimetype || null,
    size: a.size || a.filesize || null,
    source_url: a.url || null,
    thumbnail_url: a.thumbnail_large || a.thumbnail_small || null,
    uploaded_at: msToIso(a.date || a.date_uploaded),
    source_id: a.id || stableId(product.external_id, a.url, a.title),
    source_system: 'clickup',
    raw: a,
  })))

  await insertMany('product_tag', (task.tags || []).map((tag) => ({
    product: product.id,
    name: tag.name || null,
    color: tag.tag_bg || tag.tag_fg || null,
    source_id: tag.name || stableId(product.external_id, tag.name),
    source_system: 'clickup',
  })))

  await insertMany('product_field', (task.custom_fields || [])
    .filter((field) => field.value !== undefined && field.value !== null && field.value !== '')
    .map((field) => ({
      product: product.id,
      name: field.name || field.id || 'Custom field',
      field_type: field.type || null,
      value_text: customFieldValue(field),
      value_json: field.value,
      source_id: field.id || stableId(product.external_id, field.name),
      source_system: 'clickup',
      raw: field,
    })))

  const checklistRows = []
  for (const checklist of task.checklists || []) {
    for (const item of checklist.items || []) {
      checklistRows.push({
        product: product.id,
        label: item.name || item.title || '',
        done: Boolean(item.resolved),
        sort: Number(item.orderindex || 0),
        group_name: checklist.name || null,
        source_id: item.id || stableId(product.external_id, checklist.id, item.name),
        source_system: 'clickup',
      })
    }
  }
  await insertMany('checklist_item', checklistRows)

  const taskComments = await comments(product.external_id)
  await insertMany('product_update', taskComments.map((comment) => ({
    product: product.id,
    body: comment.text_content || comment.comment_text || '',
    author_name: comment.user?.username || comment.user?.email || null,
    author_email: comment.user?.email || null,
    happened_at: msToIso(comment.date),
    kind: 'comment',
    source_id: comment.id || stableId(product.external_id, comment.date, comment.text_content),
    source_system: 'clickup',
    raw: comment,
  })).filter((row) => row.body))

  return {
    files: task.attachments?.length || 0,
    tags: task.tags?.length || 0,
    fields: (task.custom_fields || []).filter((f) => f.value !== undefined && f.value !== null && f.value !== '').length,
    checklist: checklistRows.length,
    comments: taskComments.length,
  }
}

function loadCheckpoint() {
  if (existsSync(CHECKPOINT)) { try { return JSON.parse(readFileSync(CHECKPOINT, 'utf8')) } catch { /* ignore */ } }
  return { index: 0, processed: 0, failed: 0, files: 0, tags: 0, fields: 0, checklist: 0, comments: 0 }
}
function saveCheckpoint(c) { writeFileSync(CHECKPOINT, JSON.stringify(c)) }

async function fetchProducts() {
  const rows = []
  for (let offset = 0;; offset += PAGE) {
    await login()
    const batch = await dx('GET', `/items/product?filter[external_id][_nnull]=true&fields=id,external_id,clickup_list_id,clickup_list_name&sort=id&limit=${PAGE}&offset=${offset}`)
    rows.push(...batch)
    if (batch.length < PAGE || rows.length >= LIMIT) break
  }
  return rows.slice(0, LIMIT)
}

async function run() {
  await login()
  const products = await fetchProducts()
  const c = loadCheckpoint()
  console.log(`[${new Date().toISOString()}] products ${products.length}; start index ${c.index}`)
  for (; c.index < products.length; c.index++) {
    await login()
    try {
      const result = await importProduct(products[c.index])
      if (result.failed) c.failed++
      else {
        c.files += result.files
        c.tags += result.tags
        c.fields += result.fields
        c.checklist += result.checklist
        c.comments += result.comments
      }
    } catch (e) {
      c.failed++
      console.log(`  ! ${products[c.index].id}: ${e.message}`)
    }
    c.processed++
    if (c.processed % 25 === 0) {
      saveCheckpoint(c)
      console.log(`[${new Date().toISOString()}] index ${c.index + 1}/${products.length} | files ${c.files} tags ${c.tags} fields ${c.fields} checklist ${c.checklist} comments ${c.comments} failed ${c.failed}`)
    }
  }
  saveCheckpoint(c)
  console.log(`[${new Date().toISOString()}] DONE | files ${c.files} tags ${c.tags} fields ${c.fields} checklist ${c.checklist} comments ${c.comments} failed ${c.failed}`)
}

run().catch((e) => { console.error(e); process.exit(1) })
