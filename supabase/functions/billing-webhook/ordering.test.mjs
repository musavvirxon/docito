// Run with: node --test supabase/functions/billing-webhook/ordering.test.mjs  (Node 22.18+ / 24; no Deno or install needed)
// Loads the Deno handler as-is, with its remote imports and Deno.env stubbed.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

const stubs = {
  'https://deno.land/std@0.190.0/http/server.ts': 'export const serve = (h) => { globalThis.__handler = h }',
  'https://esm.sh/stripe@14.25.0?target=deno': 'export default class Stripe { webhooks = { constructEvent: (raw) => JSON.parse(new TextDecoder().decode(raw)) } }',
  'https://esm.sh/@supabase/supabase-js@2': 'export const createClient = () => globalThis.__db',
}
registerHooks({
  resolve(spec, ctx, next) {
    return stubs[spec] ? { url: 'stub:' + spec, shortCircuit: true } : next(spec, ctx)
  },
  load(url, ctx, next) {
    return url.startsWith('stub:')
      ? { format: 'module', source: stubs[url.slice(5)], shortCircuit: true }
      : next(url, ctx)
  },
})
const env = { STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_test', SUPABASE_URL: 'http://localhost', SUPABASE_SERVICE_ROLE_KEY: 'k' }
globalThis.Deno = { env: { get: (k) => env[k] } }
await import('./index.ts')

// In-memory stand-in for the two tables the subscription branch touches.
let subs
function makeDb() {
  return {
    from(table) {
      if (table === 'billing_plans') {
        const q = { select: () => q, or: () => q, maybeSingle: async () => ({ data: null, error: null }) }
        return q
      }
      assert.equal(table, 'billing_subscriptions')
      return {
        select() {
          const f = []
          const q = {
            eq: (c, v) => (f.push([c, v]), q),
            maybeSingle: async () => ({ data: subs.find((r) => f.every(([c, v]) => r[c] === v)) ?? null, error: null }),
          }
          return q
        },
        async upsert(values) {
          const row = subs.find((r) => r.entity_type === values.entity_type && r.entity_id === values.entity_id)
          row ? Object.assign(row, values) : subs.push({ ...values })
          return { data: null, error: null }
        },
      }
    },
  }
}

beforeEach(() => {
  subs = []
  globalThis.__db = makeDb()
})

let n = 0
function send(type, created, status) {
  const event = {
    id: 'evt_' + ++n, type, created,
    data: { object: { id: 'sub_1', customer: 'cus_1', status, metadata: { entity_type: 'clinic', entity_id: 'c1' }, items: { data: [] } } },
  }
  return globalThis.__handler(new Request('http://localhost/', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=x' }, body: JSON.stringify(event) }))
}

test('a delayed older update does not undo a newer cancellation', async () => {
  await send('customer.subscription.deleted', 200, 'canceled')
  await send('customer.subscription.updated', 100, 'active') // arrives late
  assert.equal(subs[0].status, 'canceled')
})

test('events delivered in order are still applied', async () => {
  await send('customer.subscription.updated', 100, 'active')
  assert.equal(subs[0].status, 'active')
  await send('customer.subscription.deleted', 200, 'canceled')
  assert.equal(subs[0].status, 'canceled')
})
