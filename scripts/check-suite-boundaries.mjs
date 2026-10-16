import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLoader } from './test-support.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(p => p.endsWith('.sql') && p >= '20261014000000')
for (const file of migrations) {
  const content = read(`supabase/migrations/${file}`)
  assert(!/"is_public"\s*:\s*false/.test(content), `${file}: reserved data literal in migration`)
  assert(!/\$tests(?:_a4)?\$|referenceSolution|expectedFor\(/.test(content), `${file}: fixture/reference code in migration`)
}
const seed = read('supabase/seeds/demo.sql')
assert(seed.includes('PUBLIC DEMONSTRATION DATA ONLY'))
assert(!/update\s+devroyale_private\.judge_policy/i.test(seed), 'seed must not enable demonstrations in production')
assert(!/'competitive'|'private_provisioning'/.test(seed), 'seed installs no competitive suite')
const fixture = read('scripts/fixtures/a4-replacements.mjs')
assert(fixture.includes('PUBLIC DEMONSTRATION DATA'))
const generator = read('scripts/generate-multiplayer-challenge-seed.mjs')
assert(!generator.includes('writeFileSync(migration'), 'legacy generator must never rewrite applied migrations')
assert(generator.includes("classification: 'public_demo'"))
const config = read('supabase/config.toml')
assert.match(config, /schemas = \["public", "graphql_public"\]/)
assert.match(config, /sql_paths = \["\.\/seeds\/demo\.sql"\]/)

function filesAt(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
}
for (const file of [...filesAt('src'), ...filesAt('supabase/functions')].filter(p => /\.[cm]?[jt]sx?$/.test(p))) {
  assert(!/fixtures\/|seeds\/|a4-replacements|a4-demo-tests|legacy-demo-export/.test(read(file)), `${file}: data fixture import into runtime`)
}
const validators = createLoader()('./supabase/functions/judge-submission/_shared/validators.ts')
const outcome = validators.sanitizeSubmissionOutcome({ status: 'wrong_answer', message: 'PUBLIC-sentinel', stdout: 'PUBLIC-sentinel', executionTime: 31415, memoryUsed: 27182 }, 'submit')
assert.deepEqual(Object.keys(outcome).sort(), ['message', 'status'], 'submit cannot expose raw output or resource measurements')

// Even a DB/transport error carrying a hypothetical private payload must not reach
// the worker diagnostic store. Synthetic sentinels only; no player code executed.
const calls = []
const { processSubmission } = createLoader()('./supabase/functions/judge-submission/_shared/process-submission.ts')
await processSubmission({ rpc: async (name, params) => {
  calls.push({ name, params })
  return { data: null, error: name === 'record_multiplayer_submission_job_error_internal' ? null : { message: 'PUBLIC-sentinel-input-expected' } }
} }, 'fixture', { workerId: 'fixture-worker', acquiredLease: { provider: '', providerToken: null, testPosition: 0 } })
assert.equal(calls.at(-1).name, 'record_multiplayer_submission_job_error_internal')
assert.equal(calls.at(-1).params.p_last_error, 'judge_worker_failed')
assert(!JSON.stringify(calls).includes('PUBLIC-sentinel'))

if (process.argv.includes('--build')) {
  const bundles = filesAt('dist').filter(p => /\.(js|map|html)$/.test(p)).map(read).join('\n')
  for (const marker of ['a4000000-0000-4000-8000-000000000001', 'menorCusto', 'lucroMaximo', 'tempoProjeto', 'PUBLIC-sentinel-input-expected', 'private_provisioning']) {
    assert(!bundles.includes(marker), 'server/demo fixture marker in public build')
  }
}
console.log('Suite boundary checks OK: migrations without reserved literals, explicit public demo seed, no runtime fixture imports, sanitized worker diagnostics and submit metrics.')
