// Add the PM workflow model needed by the custom frontend:
// lifecycle ownership fields, submissions, samples, revision requests,
// saved views, and the missing order/status fields.
//
// Additive/idempotent: creates only missing collections, fields, relations,
// and permissions. It never deletes data.
//
// Usage:
//   POPPIM_ENV_FILE=/home/ai/.directus-deploy.env \
//   DX_URL=https://data.designflow.app \
//   node pm-system/add-workflow-model.mjs
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

const pk = () => ({
  field: 'id',
  type: 'uuid',
  schema: { is_primary_key: true, has_auto_increment: false },
  meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] },
})

const field = (type, iface, note, schema = {}, extra = {}) => ({
  type,
  meta: { interface: iface, note, ...extra },
  schema,
})
const string = (note) => field('string', 'input', note)
const text = (note) => field('text', 'input-multiline', note)
const richText = (note) => field('text', 'input-rich-text-md', note)
const timestamp = (note) => field('timestamp', 'datetime', note)
const date = (note) => field('date', 'datetime', note)
const integer = (note) => field('integer', 'input', note)
const bool = (note, defaultValue = false) => field('boolean', 'boolean', note, { default_value: defaultValue })
const json = (note) => field('json', 'input-code', note, {}, { options: { language: 'json' } })
const m2o = (note) => field('uuid', 'select-dropdown-m2o', note, {}, { special: ['m2o'] })
const select = (choices, note) => field('string', 'select-dropdown', note, {}, {
  options: { choices: choices.map((choice) => ({ text: choice, value: choice })) },
})

const BUSINESS_UNITS = ['POP Creations', 'Spruce Line']
const LIFECYCLE_STATES = ['active', 'waiting', 'blocked', 'parked', 'reusable', 'canceled', 'abandoned', 'complete']
const WAITING_ON = ['internal_design', 'technical_design', 'creative_director', 'licensing', 'licensor', 'sales', 'buyer', 'sourcing', 'factory', 'production', 'unknown']
const RISK_LEVELS = ['low', 'medium', 'high', 'critical']

const SUBMISSION_TYPES = ['internal_review', 'licensing_sheet', 'concept', 'packaging', 'pps_sample', 'production']
const RECIPIENT_TYPES = ['internal', 'licensor', 'buyer', 'factory']
const SUBMISSION_STATUSES = ['draft', 'ready', 'submitted', 'waiting', 'changes_requested', 'approved', 'rejected', 'canceled']

const SAMPLE_TYPES = ['pps', 'factory', 'buyer', 'licensor', 'production', 'resample']
const SAMPLE_STATUSES = ['not_required', 'needed', 'requested', 'in_factory', 'received', 'under_internal_review', 'sent_to_buyer', 'sent_to_licensor', 'approved', 'revision_needed', 'canceled']

const REVISION_SOURCES = ['liz', 'jen', 'licensor', 'buyer', 'factory', 'internal']
const REVISION_STATUSES = ['open', 'in_progress', 'resolved', 'accepted', 'rejected', 'canceled']
const ORDER_STATUSES = ['pending', 'received', 'in_production', 'shipped', 'complete', 'canceled']

let collectionSet
let relationSet
const fieldsByCollection = new Map()

async function refreshCollections() {
  collectionSet = new Set((await api('GET', '/collections?limit=-1')).map((c) => c.collection))
}

async function refreshRelations() {
  relationSet = new Set((await api('GET', '/relations?limit=-1')).map((r) => `${r.collection}.${r.field}`))
}

async function fieldsOf(collection) {
  if (!fieldsByCollection.has(collection)) {
    fieldsByCollection.set(collection, new Set((await api('GET', `/fields/${collection}`)).map((f) => f.field)))
  }
  return fieldsByCollection.get(collection)
}

async function ensureCollection(collection, icon, note) {
  if (collectionSet.has(collection)) return
  await api('POST', '/collections', {
    collection,
    schema: {},
    meta: { icon, note, hidden: false, sort: null },
    fields: [pk()],
  })
  collectionSet.add(collection)
  fieldsByCollection.set(collection, new Set(['id']))
  console.log(`✓ collection ${collection}`)
}

async function ensureField(collection, name, def) {
  const fields = await fieldsOf(collection)
  if (fields.has(name)) return
  await api('POST', `/fields/${collection}`, { field: name, ...def })
  fields.add(name)
  console.log(`  + ${collection}.${name}`)
}

async function ensureRelation(collection, name, related, onDelete = 'SET NULL') {
  const key = `${collection}.${name}`
  if (relationSet.has(key)) return
  await api('POST', '/relations', {
    collection,
    field: name,
    related_collection: related,
    schema: { on_delete: onDelete },
    meta: {},
  })
  relationSet.add(key)
  console.log(`  ~ ${collection}.${name} -> ${related}`)
}

async function ensureM2O(collection, name, related, note, onDelete) {
  await ensureField(collection, name, m2o(note))
  await ensureRelation(collection, name, related, onDelete)
}

async function addLifecycleFields(collection) {
  await ensureField(collection, 'lifecycle_state', select(LIFECYCLE_STATES, 'Business lifecycle state separate from pipeline stage'))
  await ensureField(collection, 'next_action', text('Human-readable next action needed'))
  await ensureM2O(collection, 'next_owner_user', 'directus_users', 'Specific user who owns the next action')
  await ensureM2O(collection, 'next_owner_role', 'directus_roles', 'Role/team that owns the next action')
  await ensureField(collection, 'waiting_on', select(WAITING_ON, 'External/internal party blocking progress'))
  await ensureField(collection, 'blocker_reason', text('Why this item is blocked or waiting'))
  await ensureField(collection, 'blocked_since', timestamp('When the item became blocked/waiting'))
  await ensureField(collection, 'risk_level', select(RISK_LEVELS, 'Current business risk'))
  await ensureField(collection, 'last_meaningful_update_at', timestamp('Last substantive status/evidence update'))
  await ensureField(collection, 'closure_reason', select(['cost', 'licensing', 'sampling', 'buyer', 'abandoned', 'completed', 'duplicate', 'other'], 'Why this item closed or stopped'))
  await ensureField(collection, 'closed_at', timestamp('When this item closed'))
  await ensureM2O(collection, 'closed_by', 'directus_users', 'User who closed this item')
}

async function ensureProductSubmission() {
  await ensureCollection('product_submission', 'outgoing_mail', 'Internal, licensor, buyer, PPS, packaging, and production submissions')
  await ensureField('product_submission', 'external_id', string('Stable source id for migrations/sync/backfill'))
  await ensureField('product_submission', 'external_source', string('Source system for external_id'))
  await ensureM2O('product_submission', 'product', 'product', 'Submitted product/SKU/style', 'CASCADE')
  await ensureM2O('product_submission', 'project', 'project', 'Project/offer context', 'SET NULL')
  await ensureField('product_submission', 'business_unit', select(BUSINESS_UNITS, 'POP or Spruce workflow line'))
  await ensureField('product_submission', 'submission_type', select(SUBMISSION_TYPES, 'What kind of submission this is'))
  await ensureField('product_submission', 'recipient_type', select(RECIPIENT_TYPES, 'Who receives the submission'))
  await ensureM2O('product_submission', 'licensor', 'licensor', 'Licensor for POP submissions', 'SET NULL')
  await ensureM2O('product_submission', 'submitted_by', 'directus_users', 'User who sent/submitted it', 'SET NULL')
  await ensureField('product_submission', 'submitted_at', timestamp('When sent/submitted'))
  await ensureField('product_submission', 'expected_response_at', timestamp('Expected answer/approval date'))
  await ensureField('product_submission', 'status', select(SUBMISSION_STATUSES, 'Current submission status'))
  await ensureField('product_submission', 'response_at', timestamp('When response came back'))
  await ensureField('product_submission', 'response_summary', richText('Approval, rejection, or change-request details'))
  await ensureField('product_submission', 'brand_assurance_number', string('Brand Assurance or portal reference number'))
  await ensureM2O('product_submission', 'brand_assurance_file', 'directus_files', 'Brand Assurance / submission proof file', 'SET NULL')
  await ensureField('product_submission', 'portal_url', string('External portal URL'))
  await ensureField('product_submission', 'portal_reference', string('External portal/reference id'))
  await ensureField('product_submission', 'revision_required', bool('Whether the response requires revision'))
  await ensureField('product_submission', 'notes', richText('Submission notes'))
}

async function ensureProductSample() {
  await ensureCollection('product_sample', 'science', 'Factory, buyer, licensor, PPS, and production sample tracking')
  await ensureField('product_sample', 'external_id', string('Stable source id for migrations/sync/backfill'))
  await ensureField('product_sample', 'external_source', string('Source system for external_id'))
  await ensureM2O('product_sample', 'product', 'product', 'Sampled product/SKU/style', 'CASCADE')
  await ensureM2O('product_sample', 'project', 'project', 'Project/offer context', 'SET NULL')
  await ensureM2O('product_sample', 'factory', 'factory', 'Factory producing the sample', 'SET NULL')
  await ensureField('product_sample', 'sample_type', select(SAMPLE_TYPES, 'What kind of sample this is'))
  await ensureM2O('product_sample', 'requested_by', 'directus_users', 'User who requested the sample', 'SET NULL')
  await ensureField('product_sample', 'requested_at', timestamp('When requested'))
  await ensureField('product_sample', 'expected_at', timestamp('Expected receipt date'))
  await ensureField('product_sample', 'received_at', timestamp('When sample arrived'))
  await ensureField('product_sample', 'sent_to_buyer_at', timestamp('When sample was sent to buyer'))
  await ensureField('product_sample', 'sent_to_licensor_at', timestamp('When sample was sent to licensor'))
  await ensureField('product_sample', 'status', select(SAMPLE_STATUSES, 'Current sample status'))
  await ensureM2O('product_sample', 'primary_photo', 'directus_files', 'Primary sample photo/proof file', 'SET NULL')
  await ensureField('product_sample', 'photo_urls', text('Additional sample photo URLs or NAS paths'))
  await ensureField('product_sample', 'notes', richText('Sample notes and review context'))
  await ensureField('product_sample', 'revision_required', bool('Whether a resample/revision is required'))
  await ensureField('product_sample', 'revision_reason', text('Why sample revision/resample is required'))
}

async function ensureRevisionRequest() {
  await ensureCollection('revision_request', 'rate_review', 'Revision/change requests from internal review, buyers, licensors, or factories')
  await ensureField('revision_request', 'external_id', string('Stable source id for migrations/sync/backfill'))
  await ensureField('revision_request', 'external_source', string('Source system for external_id'))
  await ensureField('revision_request', 'object_collection', string('Collection this revision applies to'))
  await ensureField('revision_request', 'object_id', string('Item id in object_collection'))
  await ensureM2O('revision_request', 'product', 'product', 'Product context', 'CASCADE')
  await ensureM2O('revision_request', 'project', 'project', 'Project context', 'SET NULL')
  await ensureM2O('revision_request', 'design', 'design', 'Design context', 'SET NULL')
  await ensureM2O('revision_request', 'submission', 'product_submission', 'Submission that generated the revision', 'SET NULL')
  await ensureField('revision_request', 'source', select(REVISION_SOURCES, 'Who requested the revision'))
  await ensureM2O('revision_request', 'requested_by_user', 'directus_users', 'Internal requester', 'SET NULL')
  await ensureField('revision_request', 'requested_by_external', string('External requester name/email'))
  await ensureField('revision_request', 'requested_at', timestamp('When requested'))
  await ensureM2O('revision_request', 'assigned_to', 'directus_users', 'User assigned to resolve it', 'SET NULL')
  await ensureField('revision_request', 'due_at', timestamp('Revision due date'))
  await ensureField('revision_request', 'status', select(REVISION_STATUSES, 'Revision status'))
  await ensureField('revision_request', 'body', richText('Revision instructions'))
  await ensureM2O('revision_request', 'markup_file', 'directus_files', 'Markup/reference file', 'SET NULL')
  await ensureField('revision_request', 'resolved_at', timestamp('When resolved'))
  await ensureField('revision_request', 'resolution_note', richText('How the revision was resolved'))

  await ensureM2O('product_submission', 'revision', 'revision_request', 'Revision created from this submission response', 'SET NULL')
  await ensureM2O('product_sample', 'revision', 'revision_request', 'Revision/resample request created from this sample', 'SET NULL')
}

async function ensureSavedView() {
  await ensureCollection('pm_saved_view', 'view_kanban', 'Saved views/preferences for the custom PM frontend')
  await ensureM2O('pm_saved_view', 'user', 'directus_users', 'User owner', 'CASCADE')
  await ensureM2O('pm_saved_view', 'role', 'directus_roles', 'Role owner/default', 'CASCADE')
  await ensureField('pm_saved_view', 'name', string('Saved view name'))
  await ensureField('pm_saved_view', 'screen', string('Frontend screen id'))
  await ensureField('pm_saved_view', 'business_unit', select(['All', 'POP', 'Spruce', ...BUSINESS_UNITS], 'Business-unit filter/default'))
  await ensureField('pm_saved_view', 'filters_json', json('Serialized filters'))
  await ensureField('pm_saved_view', 'sort_json', json('Serialized sorting'))
  await ensureField('pm_saved_view', 'columns_json', json('Serialized table/board columns'))
  await ensureField('pm_saved_view', 'is_default', bool('Default for this user/role'))
  await ensureM2O('pm_saved_view', 'shared_with_role', 'directus_roles', 'Role this view is shared with', 'SET NULL')
}

async function ensureOrderEnhancements() {
  await ensureM2O('order', 'project', 'project', 'Project/offer this PO belongs to', 'SET NULL')
  await ensureField('order', 'status', select(ORDER_STATUSES, 'Order/PO status'))
  await ensureField('order', 'notes', richText('Order notes'))
}

async function grantCollectionPermissions(collections) {
  const roles = await api('GET', '/roles?fields=name,policies.policy.id&limit=-1')
  const rolePolicies = roles
    .map((role) => ({ name: role.name, policy: role.policies?.[0]?.policy?.id }))
    .filter((role) => role.policy)
  const existing = await api('GET', '/permissions?fields=id,policy,collection,action&limit=-1')
  const allowedActions = {
    Administrator: ['create', 'read', 'update', 'delete'],
    Designer: ['create', 'read', 'update', 'delete'],
    Sales: ['create', 'read', 'update', 'delete'],
    Licensing: ['create', 'read', 'update', 'delete'],
    Viewer: ['read'],
    Vendor: [],
  }

  async function grant(policy, collection, action, fields = ['*']) {
    if (existing.some((p) => p.policy === policy && p.collection === collection && p.action === action)) return
    await api('POST', '/permissions', { policy, collection, action, fields, permissions: {}, validation: {} })
    existing.push({ policy, collection, action })
    console.log(`  perm ${collection}.${action} -> policy ${String(policy).slice(0, 8)}`)
  }

  for (const { name, policy } of rolePolicies) {
    for (const collection of collections) {
      const actions = collection === 'pm_saved_view' && name === 'Viewer'
        ? ['create', 'read', 'update', 'delete']
        : allowedActions[name] ?? ['read']
      for (const perm of existing.filter((p) => p.policy === policy && p.collection === collection)) {
        if (actions.includes(perm.action)) continue
        await api('DELETE', `/permissions/${perm.id}`)
        console.log(`  - perm ${collection}.${perm.action} from ${name}`)
      }
      for (const action of actions) await grant(policy, collection, action)
    }
  }
}

async function extendReadFields(collection, newFields) {
  const perms = await api('GET', `/permissions?filter[collection][_eq]=${collection}&filter[action][_eq]=read&fields=id,fields&limit=-1`)
  for (const perm of perms) {
    if (!Array.isArray(perm.fields) || perm.fields.includes('*')) continue
    const merged = [...new Set([...perm.fields, ...newFields])]
    if (merged.length === perm.fields.length) continue
    await api('PATCH', `/permissions/${perm.id}`, { fields: merged })
    console.log(`  perm ${collection}.read fields +${merged.length - perm.fields.length}`)
  }
}

async function verify() {
  const collections = await api('GET', '/collections?limit=-1')
  const present = new Set(collections.map((c) => c.collection))
  for (const collection of ['product_submission', 'product_sample', 'revision_request', 'pm_saved_view']) {
    if (!present.has(collection)) throw new Error(`verification failed: missing ${collection}`)
  }

  for (const [collection, fieldName] of [
    ['product', 'next_action'],
    ['project', 'next_action'],
    ['design', 'next_action'],
    ['design_collection', 'next_action'],
    ['order', 'status'],
  ]) {
    const fields = await fieldsOf(collection)
    if (!fields.has(fieldName)) throw new Error(`verification failed: missing ${collection}.${fieldName}`)
  }
}

async function main() {
  await login()
  await refreshCollections()
  await refreshRelations()

  for (const collection of ['product', 'project', 'design', 'design_collection']) {
    await addLifecycleFields(collection)
  }

  await ensureProductSubmission()
  await ensureProductSample()
  await ensureRevisionRequest()
  await ensureSavedView()
  await ensureOrderEnhancements()

  await grantCollectionPermissions(['product_submission', 'product_sample', 'revision_request', 'pm_saved_view'])
  await extendReadFields('product', ['lifecycle_state', 'next_action', 'next_owner_user', 'next_owner_role', 'waiting_on', 'blocker_reason', 'blocked_since', 'risk_level', 'last_meaningful_update_at', 'closed_at', 'closed_by'])
  await extendReadFields('project', ['lifecycle_state', 'next_action', 'next_owner_user', 'next_owner_role', 'waiting_on', 'blocker_reason', 'blocked_since', 'risk_level', 'last_meaningful_update_at', 'closure_reason', 'closed_at', 'closed_by'])
  await extendReadFields('design', ['lifecycle_state', 'next_action', 'next_owner_user', 'next_owner_role', 'waiting_on', 'blocker_reason', 'blocked_since', 'risk_level', 'last_meaningful_update_at', 'closure_reason', 'closed_at', 'closed_by'])
  await extendReadFields('design_collection', ['lifecycle_state', 'next_action', 'next_owner_user', 'next_owner_role', 'waiting_on', 'blocker_reason', 'blocked_since', 'risk_level', 'last_meaningful_update_at', 'closure_reason', 'closed_at', 'closed_by'])
  await extendReadFields('order', ['project', 'status', 'notes'])

  await verify()
  console.log('\nWorkflow model complete.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
