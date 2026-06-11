// Adds the ClickUp-style collaboration model to the shared Directus backend:
//   - checklist_item  (lightweight todo on a product)
//   - subtask         (child task on a product, with assignee/due/status)
//   - product_assignee (M2M junction product <-> directus_users)
//   - permissions for the app roles (Designer/Sales/Licensing) on the above
//     + directus_users (read, for assignee pickers) + directus_comments (collaborate)
// Comments themselves are NATIVE (directus_comments) — no collection needed.
// Idempotent: skips collections/fields/relations/permissions that already exist.
// Usage: POPPIM_ENV_FILE=/home/ai/.directus-deploy.env DX_URL=https://data.designflow.app node pm-system/add-collaboration-model.mjs
// After running, RESTART Directus once (Coolify) so everything registers cleanly.
import { readFileSync } from 'node:fs'
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
let TOKEN = ''

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text(); let json; try { json = text ? JSON.parse(text) : null } catch { json = text }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json?.errors?.[0]?.message || text}`)
  return json?.data ?? json
}

const pk = () => ({ field: 'id', type: 'uuid', schema: { is_primary_key: true, has_auto_increment: false }, meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] } })

async function ensureCollection(collection, { icon, hidden = false, fields = [] }) {
  const existing = await api('GET', '/collections').then((c) => c.map((x) => x.collection))
  if (existing.includes(collection)) { console.log(`collection ${collection} exists`); return }
  await api('POST', '/collections', { collection, schema: {}, meta: { icon, hidden, sort: null }, fields: [pk(), ...fields] })
  console.log(`✓ created collection ${collection}`)
}

async function ensureField(collection, field, def) {
  const fields = await api('GET', `/fields/${collection}`).then((f) => f.map((x) => x.field))
  if (fields.includes(field)) return
  await api('POST', `/fields/${collection}`, { field, ...def })
  console.log(`  + field ${collection}.${field}`)
}

async function ensureRelation(collection, field, related, onDelete = 'SET NULL') {
  const rels = await api('GET', '/relations')
  if (rels.some((r) => r.collection === collection && r.field === field)) return
  await api('POST', '/relations', { collection, field, related_collection: related, schema: { on_delete: onDelete }, meta: {} })
  console.log(`  ~ relation ${collection}.${field} -> ${related}`)
}

const m2o = { type: 'uuid', meta: { interface: 'select-dropdown-m2o', special: ['m2o'] }, schema: {} }
const boolean = (def = false) => ({ type: 'boolean', meta: { interface: 'boolean' }, schema: { default_value: def } })
const text = { type: 'text', meta: { interface: 'input-multiline' }, schema: {} }
const string = { type: 'string', meta: { interface: 'input' }, schema: {} }
const integer = { type: 'integer', meta: { interface: 'input', hidden: true }, schema: {} }
const date = { type: 'date', meta: { interface: 'datetime' }, schema: {} }

async function run() {
  TOKEN = (await api('POST', '/auth/login', { email: EMAIL, password: PASSWORD })).access_token

  // 1) checklist_item
  await ensureCollection('checklist_item', { icon: 'checklist' })
  await ensureField('checklist_item', 'product', m2o)
  await ensureRelation('checklist_item', 'product', 'product', 'CASCADE')
  await ensureField('checklist_item', 'label', string)
  await ensureField('checklist_item', 'done', boolean(false))
  await ensureField('checklist_item', 'sort', integer)

  // 2) subtask
  await ensureCollection('subtask', { icon: 'subdirectory_arrow_right' })
  await ensureField('subtask', 'product', m2o)
  await ensureRelation('subtask', 'product', 'product', 'CASCADE')
  await ensureField('subtask', 'title', text)
  await ensureField('subtask', 'done', boolean(false))
  await ensureField('subtask', 'assignee', m2o)
  await ensureRelation('subtask', 'assignee', 'directus_users', 'SET NULL')
  await ensureField('subtask', 'due_date', date)
  await ensureField('subtask', 'sort', integer)

  // 3) product_assignee (M2M junction product <-> users)
  await ensureCollection('product_assignee', { icon: 'group', hidden: true })
  await ensureField('product_assignee', 'product', m2o)
  await ensureRelation('product_assignee', 'product', 'product', 'CASCADE')
  await ensureField('product_assignee', 'directus_user', m2o)
  await ensureRelation('product_assignee', 'directus_user', 'directus_users', 'CASCADE')

  // 4) permissions for the app policies
  const roles = await api('GET', '/roles?fields=name,policies.policy.id&limit=-1')
  const policyOf = (name) => roles.find((r) => r.name === name)?.policies?.[0]?.policy?.id
  const APP = ['Designer', 'Sales', 'Licensing'].map(policyOf).filter(Boolean)
  const existingPerms = await api('GET', '/permissions?limit=-1&fields=id,policy,collection,action')
  const has = (policy, collection, action) => existingPerms.some((p) => p.policy === policy && p.collection === collection && p.action === action)
  const grant = async (policy, collection, action, fields = ['*']) => {
    if (has(policy, collection, action)) return
    await api('POST', '/permissions', { policy, collection, action, fields, permissions: {}, validation: {} })
    console.log(`  perm ${collection}.${action} -> policy ${policy.slice(0, 8)}`)
  }
  for (const policy of APP) {
    for (const coll of ['checklist_item', 'subtask', 'product_assignee']) {
      for (const action of ['create', 'read', 'update', 'delete']) await grant(policy, coll, action)
    }
    // read users (for assignee pickers) — limited fields
    await grant(policy, 'directus_users', 'read', ['id', 'first_name', 'last_name', 'email', 'avatar'])
    // collaborate via native comments
    await grant(policy, 'directus_comments', 'read')
    await grant(policy, 'directus_comments', 'create')
    await grant(policy, 'directus_comments', 'update', ['*'])
    await grant(policy, 'directus_comments', 'delete')
  }

  console.log('\nDone. Restart Directus (Coolify) so new collections/relations register cleanly.')
}

run().catch((e) => { console.error(e); process.exit(1) })
