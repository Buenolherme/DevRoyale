import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createLoader } from './test-support.mjs'
import { replacementCatalog, replacementTests } from './fixtures/a4-replacements.mjs'

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
const original = read('supabase/migrations/20260814020000_real_multiplayer_battles.sql')
const migration = read('supabase/migrations/20261014000000_replace_untrusted_javascript_challenges.sql')
const jsonBlock = (source, tag) => JSON.parse(source.split(`$${tag}$`)[1])
const catalog = jsonBlock(migration, 'catalog_a4')
const tests = JSON.parse(read('supabase/seeds/a4-demo-tests.json'))
assert(!migration.includes('$tests_a4$'), 'new migrations must not embed reserved test rows')
assert.deepEqual(catalog, replacementCatalog, 'migration catalog must match the exercised fixtures')
assert.deepEqual(tests, replacementTests, 'PUBLIC demo cases must match the independently calculated oracles')
assert.deepEqual(jsonBlock(read('supabase/seeds/demo.sql'), 'demo'), tests, 'local SQL seed matches PUBLIC demo fixtures')
assert.equal(new Set(catalog.map(c => c.id)).size, 3)
assert.equal(tests.filter(t => t.is_public).length, 3)
assert.equal(tests.filter(t => !t.is_public).length, 28)
const effective = [...jsonBlock(original, 'catalog').filter(c => c.is_active && !('harness' in c.judge_config)), ...catalog]
assert.equal(effective.length, 53)
for (const language of ['python', 'javascript', 'sql', 'html-css']) {
  for (const difficulty of ['never', 'basic', 'intermediate', 'advanced']) {
    assert(effective.some(c => c.language === language && c.difficulty === difficulty), `${language}/${difficulty}: missing pool`)
  }
}
assert.deepEqual(effective.filter(c => c.language === 'javascript' && c.difficulty === 'advanced').map(c => c.id).sort(), catalog.map(c => c.id).sort())
for (const challenge of catalog) {
  assert.equal(challenge.validation_type, 'function_tests')
  assert.deepEqual(Object.keys(challenge.judge_config), ['functionName'])
  assert(!/reference|alternative|publicOnly|cases/.test(Object.keys(challenge).join(',')))
  const challengeTests = tests.filter(t => t.challenge_id === challenge.id)
  assert.equal(new Set(challengeTests.map(t => `${t.is_public}:${t.ordinal}`)).size, challengeTests.length)
  assert.deepEqual(challenge.public_examples, [{ input: challengeTests[0].input, output: challengeTests[0].expected }])
  assert(challengeTests.slice(1).some(t => t.expected !== challengeTests[0].expected), 'public constant must fail hidden cases')
}

// Exercise error presentation through real service methods, with a local RPC double.
let rpcError = { message: 'challenge_pool_unavailable' }
const calls = []
const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } }, error: null }) },
  rpc: async (name, params) => { calls.push({ name, params }); return { data: { id: 'fixture-match' }, error: rpcError } },
}
const load = createLoader({}, { '@/lib/supabase': { supabase } })
const battle = load('./src/lib/multiplayer-battle-service.ts')
const queue = load('./src/lib/matchmaking-service.ts')
const room = load('./src/lib/room-service.ts')
const poolError = error => error.code === 'POOL_UNAVAILABLE' && /linguagem e dificuldade/.test(error.message)
await assert.rejects(battle.activateMatch('fixture-room'), poolError)
await assert.rejects(queue.joinQueue({ language: 'javascript', difficulty: 'advanced' }), poolError)
await assert.rejects(queue.pollQueue('fixture-ticket'), poolError)
await assert.rejects(room.setReady('fixture-room', true), poolError)
rpcError = { message: 'challenge_unavailable' }
await assert.rejects(battle.surrender('fixture-match'), error => error.code === 'CHALLENGE_UNAVAILABLE' && /sem vencedor/.test(error.message))
rpcError = null
await battle.cancelUnavailableMatch('fixture-match')
assert.equal(calls.at(-1).name, 'cancel_unavailable_multiplayer_match')
assert.equal(calls.at(-1).params.p_match_id, 'fixture-match')
console.log('A4 catalog checks OK: 53 demo-capable entries, all 16 exact demo pools, 3 advanced JS replacements, 31 disclosed demonstration cases, service unavailability/cancellation UX. No player code executed on host.')
