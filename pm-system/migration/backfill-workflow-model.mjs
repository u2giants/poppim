// Infer first-pass workflow records from imported ClickUp/Directus product data.
//
// This script is intentionally conservative:
// - idempotent by external_source/external_id
// - only patches empty lifecycle fields
// - creates workflow records as inferred evidence, not as human-confirmed facts
//
// Usage:
//   DRY_RUN=1 POPPIM_ENV_FILE=/home/ai/.directus-deploy.env DX_URL=https://data.designflow.app node pm-system/migration/backfill-workflow-model.mjs
//   APPLY=1   POPPIM_ENV_FILE=/home/ai/.directus-deploy.env DX_URL=https://data.designflow.app node pm-system/migration/backfill-workflow-model.mjs
import { readFileSync } from 'node:fs'

if (process.env.POPPIM_ENV_FILE) {
  for (const line of readFileSync(process.env.POPPIM_ENV_FILE, 'utf8').split('\n')) {
    const s = line.trim()
    if (!s || s.startsWith('#') || !s.includes('=')) continue
    const i = s.indexOf('=')
    const k = s.slice(0, i).trim()
    let v = s.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const BASE = process.env.DX_URL || 'https://data.designflow.app'
const EMAIL = process.env.DX_ADMIN_EMAIL
const PASSWORD = process.env.DX_ADMIN_PASSWORD
const APPLY = process.env.APPLY === '1'
const SOURCE = 'workflow_backfill_v1'
const PAGE = Number(process.env.PAGE_SIZE || 500)
let TOKEN = ''

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json?.errors?.[0]?.message || text}`)
  return json?.data ?? json
}

async function login() {
  TOKEN = (await api('POST', '/auth/login', { email: EMAIL, password: PASSWORD })).access_token
}

function params(obj) {
  const out = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out.set(k, String(v))
  }
  return out.toString()
}

async function readAll(collection, query = {}) {
  const out = []
  let page = 1
  while (true) {
    const rows = await api('GET', `/items/${collection}?${params({ ...query, limit: PAGE, page })}`)
    out.push(...rows)
    if (rows.length < PAGE) break
    page += 1
  }
  return out
}

async function existingExternalIds(collection) {
  const rows = await readAll(collection, {
    'filter[external_source][_eq]': SOURCE,
    fields: 'id,external_id',
  })
  return new Set(rows.map((row) => row.external_id).filter(Boolean))
}

function relationId(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.id || null
}

function stageName(product) {
  return typeof product.stage === 'object' && product.stage ? product.stage.name || '' : ''
}

function lowerStage(product) {
  return stageName(product).toLowerCase()
}

function businessUnit(product) {
  const raw = product.business_unit || product.project?.business_unit || ''
  if (raw === 'POP') return 'POP Creations'
  if (raw === 'Spruce') return 'Spruce Line'
  return raw || null
}

function nowIso() {
  return new Date().toISOString()
}

function dueDate(product) {
  return product.pps_requested_date || product.clickup_due_at || product.on_shelf_date || null
}

function isPast(iso) {
  return iso && new Date(iso).getTime() < Date.now()
}

function withinDays(iso, days) {
  if (!iso) return false
  const diff = new Date(iso).getTime() - Date.now()
  return diff >= 0 && diff <= days * 86_400_000
}

function inferLifecycle(product) {
  const s = lowerStage(product)
  const due = dueDate(product)
  const closed = product.clickup_closed_at || product.closure_reason
  let lifecycle_state = 'active'
  let waiting_on = null
  let next_action = null
  let blocker_reason = null

  if (closed) lifecycle_state = product.closure_reason === 'abandoned' ? 'abandoned' : 'complete'
  else if (/on hold|future orders|approved for future/.test(s)) lifecycle_state = /future/.test(s) ? 'reusable' : 'parked'
  else if (/revision|resample|changes/.test(s)) lifecycle_state = 'blocked'
  else if (/waiting|with buyer|submitted|approval|licensor|factory|price requested/.test(s)) lifecycle_state = 'waiting'

  if (/licensor|brand assurance|concept submitted|pps/.test(s)) waiting_on = 'licensor'
  else if (/buyer|price requested|selections/.test(s)) waiting_on = 'buyer'
  else if (/factory|sample requested|resample/.test(s)) waiting_on = 'factory'
  else if (/licensing sheet review|ready to submit/.test(s)) waiting_on = 'licensing'
  else if (/art|design|in work|upcoming/.test(s)) waiting_on = 'internal_design'

  if (/licensing sheet creation/.test(s)) next_action = 'Create or finish the licensing sheet.'
  else if (/licensing sheet review/.test(s)) next_action = 'Review licensing sheet and clear it for submission.'
  else if (/ready to submit/.test(s)) next_action = 'Submit concept package to the recipient.'
  else if (/concept submitted/.test(s)) next_action = 'Wait for licensor/buyer response and record the result.'
  else if (/revision/.test(s)) next_action = 'Resolve requested revision and resubmit or approve.'
  else if (/sample requested/.test(s)) next_action = 'Track factory sample and expected receipt.'
  else if (/sample received/.test(s)) next_action = 'Review sample and route to buyer/licensor if needed.'
  else if (/sample sent to licensor|pps/.test(s)) next_action = 'Wait for PPS/licensor approval response.'
  else if (/production approved/.test(s)) next_action = 'Confirm production/order artifacts are complete.'
  else if (/with buyer/.test(s)) next_action = 'Follow up with buyer for approval/selection.'
  else if (/waiting for factory/.test(s)) next_action = 'Follow up with factory for price/sample response.'
  else if (/price requested/.test(s)) next_action = 'Track pricing response and buyer approval.'
  else if (/send out art/.test(s)) next_action = 'Send art for PO or mark future-order eligibility.'

  if (lifecycle_state === 'blocked') blocker_reason = `Inferred from stage: ${stageName(product)}`

  let risk_level = null
  if (!closed && isPast(due)) risk_level = 'high'
  else if (!closed && withinDays(due, 7)) risk_level = 'medium'

  return {
    lifecycle_state,
    waiting_on,
    next_action,
    blocker_reason,
    risk_level,
    blocked_since: ['blocked', 'waiting'].includes(lifecycle_state) ? product.clickup_updated_at || null : null,
    last_meaningful_update_at: product.clickup_updated_at || product.clickup_created_at || null,
    closed_at: product.clickup_closed_at || null,
  }
}

function patchIfEmpty(product, inferred) {
  const patch = {}
  for (const field of ['lifecycle_state', 'next_action', 'waiting_on', 'blocker_reason', 'risk_level', 'blocked_since', 'last_meaningful_update_at', 'closed_at']) {
    if (product[field] == null && inferred[field] != null) patch[field] = inferred[field]
  }
  return patch
}

function submissionFor(product) {
  const s = lowerStage(product)
  if (!product.brand_assurance_number && !product.pi_status && !/submit|licensor|licensing sheet|concept approved|production approved|pre-production|with buyer/.test(s)) return null
  const type =
    /pps|sample sent to licensor/.test(s) ? 'pps_sample' :
    /production|pre-production/.test(s) ? 'production' :
    /licensing sheet/.test(s) ? 'licensing_sheet' :
    /with buyer/.test(s) ? 'concept' :
    'concept'
  const recipient =
    /buyer/.test(s) ? 'buyer' :
    /factory|production/.test(s) ? 'factory' :
    /internal|review|licensing sheet review/.test(s) ? 'internal' :
    'licensor'
  const status =
    /approved|completed|production approved|pre-production approved/.test(s) || product.pi_status === 'Completed' ? 'approved' :
    /revision|changes/.test(s) ? 'changes_requested' :
    /submitted|with buyer|licensor/.test(s) ? 'waiting' :
    /ready/.test(s) ? 'ready' :
    'submitted'
  return {
    external_id: `${product.id}:submission:${type}:${relationId(product.stage) || 'none'}`,
    external_source: SOURCE,
    product: product.id,
    project: relationId(product.project),
    business_unit: businessUnit(product),
    submission_type: type,
    recipient_type: recipient,
    licensor: relationId(product.licensor),
    submitted_at: product.clickup_start_at || product.clickup_created_at || null,
    expected_response_at: dueDate(product),
    status,
    response_at: /approved|completed/.test(s) ? product.clickup_updated_at : null,
    response_summary: `Inferred from imported stage "${stageName(product)}".`,
    brand_assurance_number: product.brand_assurance_number || null,
    revision_required: /revision|changes/.test(s),
    notes: `Backfilled from imported product/stage evidence. Original ClickUp list: ${product.clickup_list_name || 'unknown'}.`,
  }
}

function sampleFor(product) {
  const s = lowerStage(product)
  if (!/sample|factory|price requested|resample/.test(s)) return null
  const type =
    /pps|licensor/.test(s) ? 'pps' :
    /resample/.test(s) ? 'resample' :
    /buyer/.test(s) ? 'buyer' :
    /production/.test(s) ? 'production' :
    'factory'
  const status =
    /received/.test(s) ? 'received' :
    /sent to buyer/.test(s) ? 'sent_to_buyer' :
    /sent to licensor|pps/.test(s) ? 'sent_to_licensor' :
    /resample|revision/.test(s) ? 'revision_needed' :
    /waiting for factory|factory/.test(s) ? 'in_factory' :
    /requested|price requested/.test(s) ? 'requested' :
    'needed'
  return {
    external_id: `${product.id}:sample:${type}:${relationId(product.stage) || 'none'}`,
    external_source: SOURCE,
    product: product.id,
    project: relationId(product.project),
    factory: relationId(product.factory),
    sample_type: type,
    requested_at: product.clickup_start_at || product.clickup_created_at || null,
    expected_at: dueDate(product),
    received_at: /received/.test(s) ? product.clickup_updated_at : null,
    sent_to_buyer_at: /sent to buyer/.test(s) ? product.clickup_updated_at : null,
    sent_to_licensor_at: /sent to licensor|pps/.test(s) ? product.clickup_updated_at : null,
    status,
    notes: `Backfilled from imported product/stage evidence. Original ClickUp list: ${product.clickup_list_name || 'unknown'}.`,
    revision_required: /resample|revision/.test(s),
    revision_reason: /resample|revision/.test(s) ? `Inferred from stage "${stageName(product)}".` : null,
  }
}

function revisionFor(product) {
  const s = lowerStage(product)
  if (!/revision|resample|changes/.test(s)) return null
  const source = /licensor|pps/.test(s) ? 'licensor' : /buyer/.test(s) ? 'buyer' : /factory|resample/.test(s) ? 'factory' : 'internal'
  return {
    external_id: `${product.id}:revision:${relationId(product.stage) || 'none'}`,
    external_source: SOURCE,
    object_collection: 'product',
    object_id: product.id,
    product: product.id,
    project: relationId(product.project),
    design: relationId(product.design),
    source,
    requested_at: product.clickup_start_at || product.clickup_created_at || null,
    due_at: dueDate(product),
    status: /approved|completed/.test(s) ? 'resolved' : 'open',
    body: `Revision inferred from imported stage "${stageName(product)}".`,
  }
}

async function createIfMissing(collection, existing, payload, stats) {
  if (!payload || existing.has(payload.external_id)) return
  stats[collection].planned += 1
  if (!APPLY) return
  await api('POST', `/items/${collection}`, payload)
  existing.add(payload.external_id)
  stats[collection].created += 1
}

async function main() {
  await login()
  const roles = await api('GET', '/roles?fields=id,name&limit=-1')
  console.log(`Backfill mode: ${APPLY ? 'APPLY' : 'DRY RUN'}; roles available: ${roles.map((r) => r.name).join(', ')}`)

  const existing = {
    product_submission: await existingExternalIds('product_submission'),
    product_sample: await existingExternalIds('product_sample'),
    revision_request: await existingExternalIds('revision_request'),
  }
  const stats = {
    products: { seen: 0, patched: 0, planned: 0 },
    product_submission: { planned: 0, created: 0 },
    product_sample: { planned: 0, created: 0 },
    revision_request: { planned: 0, created: 0 },
  }

  let page = 1
  while (true) {
    const products = await api('GET', `/items/product?${params({
      fields: [
        'id', 'code', 'name', 'business_unit', 'brand_assurance_number', 'pi_status', 'closure_reason',
        'pps_requested_date', 'on_shelf_date', 'clickup_list_name', 'clickup_created_at', 'clickup_updated_at',
        'clickup_closed_at', 'clickup_start_at', 'clickup_due_at',
        'lifecycle_state', 'next_action', 'waiting_on', 'blocker_reason', 'risk_level', 'blocked_since',
        'last_meaningful_update_at', 'closed_at',
        'stage.id', 'stage.name', 'project.id', 'project.business_unit', 'licensor.id', 'factory.id', 'design.id',
      ].join(','),
      sort: 'id',
      limit: PAGE,
      page,
    })}`)
    if (!products.length) break
    for (const product of products) {
      stats.products.seen += 1
      const inferred = inferLifecycle(product)
      const patch = patchIfEmpty(product, inferred)
      if (Object.keys(patch).length) {
        stats.products.planned += 1
        if (APPLY) {
          await api('PATCH', `/items/product/${product.id}`, patch)
          stats.products.patched += 1
        }
      }
      await createIfMissing('product_submission', existing.product_submission, submissionFor(product), stats)
      await createIfMissing('product_sample', existing.product_sample, sampleFor(product), stats)
      await createIfMissing('revision_request', existing.revision_request, revisionFor(product), stats)
    }
    console.log(`  processed ${stats.products.seen}`)
    if (products.length < PAGE) break
    page += 1
  }

  console.log(JSON.stringify(stats, null, 2))
  if (!APPLY) console.log('Dry run only. Re-run with APPLY=1 to write.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
