import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { createLoader } from './test-support.mjs'
import { queueCases, memoCases, queueTest, memoTest } from './fixtures/judge-adversarial.mjs'
import { replacementCatalog, replacementTests } from './fixtures/a4-replacements.mjs'

// Only trusted application code executes here. Player code remains inert strings.
const validators = createLoader()('./supabase/functions/judge-submission/_shared/validators.ts')
let providerCalls = 0
const { processSubmission } = createLoader({ crypto: webcrypto }, {
  './judge0.ts': { Judge0Provider: class {
    constructor() { providerCalls++ }
    async submit() { providerCalls++; return 'fixture-token' }
    async getResult() { providerCalls++; return { statusId: 3, stdout: '4', time: 1, memory: 1 } }
  } },
})('./supabase/functions/judge-submission/_shared/process-submission.ts')

const base = { submissionId: 'fixture', mode: 'submit', language: 'javascript', difficulty: 'advanced', validationType: 'function_tests' }
const lease = { submissionId: 'fixture', provider: '', providerToken: null, testPosition: 0, attempts: 1, exhausted: false }
let checked = 0
for (const [harness, functionName, cases, test] of [
  ['javascript_concurrency_queue', 'executar', queueCases, queueTest],
  ['javascript_memoization', 'memoizar', memoCases, memoTest],
  ['future_unverified_harness', 'future', [{ name: 'unknown', source: 'function future() {}' }], queueTest],
]) {
  for (const candidate of cases) for (const mode of ['run', 'submit']) {
    const payload = { ...base, mode, sourceCode: candidate.source, judgeConfig: { harness, functionName }, tests: [test] }
    assert.throws(() => validators.buildExecutionRequest(payload, test), /trusted_instrumentation_unavailable/)
    for (const acquiredLease of [undefined, { ...lease, provider: 'judge0', providerToken: 'forged-result-token', testPosition: 1 },
      { ...lease, provider: 'judge0', providerToken: 'past-end-token', testPosition: 999 }]) {
      const calls = []
      const admin = { rpc: async (name, params) => {
        calls.push({ name, params })
        return { data: name === 'acquire_multiplayer_submission_lease_internal' ? lease
          : name === 'get_multiplayer_judge_payload_internal' ? payload : null, error: null }
      } }
      providerCalls = 0
      assert.equal(await processSubmission(admin, 'fixture', { workerId: 'worker-fixture', acquiredLease }), 'failed')
      assert.equal(providerCalls, 0, 'Neither new nor resumed instrumentation may contact Judge0')
      assert(!calls.some(call => call.name === 'mark_multiplayer_submission_running_internal'))
      const final = calls.filter(call => call.name === 'finalize_multiplayer_submission_internal')
      assert.equal(final.length, 1)
      assert.equal(final[0].params.p_status, 'internal_error', 'Suspension must not blame the solution or award acceptance')
      assert.equal(final[0].params.p_stdout, null)
      assert.equal(final[0].params.p_worker_id, 'worker-fixture')
      assert(!JSON.stringify(final).includes('fixture-a'), 'No test input in public result')
      assert(!JSON.stringify(final).includes('withinLimit'), 'No instrumentation details in public result')
      checked++
    }
  }
}

// Normal function results still go through the existing provider/comparator.
for (const mode of ['run', 'submit']) {
  const payload = { ...base, mode, sourceCode: 'function dobrar(x) { return x * 2; }',
    judgeConfig: { functionName: 'dobrar' }, tests: [{ input: { args: [2] }, expected: 4 }] }
  const calls = []
  const admin = { rpc: async (name, params) => {
    calls.push({ name, params })
    return { data: name === 'acquire_multiplayer_submission_lease_internal' ? lease
      : name === 'get_multiplayer_judge_payload_internal' ? payload : null, error: null }
  } }
  providerCalls = 0
  assert.equal(await processSubmission(admin, 'fixture', { workerId: 'worker-fixture' }), 'processed')
  assert.equal(providerCalls, 3)
  assert.equal(calls.at(-1).params.p_status, 'accepted')
  assert.equal(calls.at(-1).params.p_stdout, mode === 'submit' ? null : '4')
}

const secret = 'SYNTHETIC-PRIVATE-EXPECTED'
const request = validators.buildExecutionRequest({ ...base, sourceCode: 'function f(x) { return x; }',
  judgeConfig: { functionName: 'f' } }, { input: { args: [1] }, expected: secret })
assert(!request.sourceCode.includes(secret), 'Expected values remain outside submitted code')
const sanitized = validators.sanitizeSubmissionOutcome({ status: 'accepted', message: secret, stdout: secret }, 'submit')
assert(!JSON.stringify(sanitized).includes(secret), 'Submit does not expose hidden output')
console.log(`Judge policy checks OK: ${checked} blocked new/resumed run/submit cases, unknown harness denied, normal JS allowed, private output sanitized. No player code executed on host.`)

let outageChecks = 0
for (const challenge of replacementCatalog) for (const mode of ['run', 'submit']) {
  for (const fault of ['submit', 'poll', 'provider_internal']) {
    const payload = { ...base, mode, sourceCode: challenge.starter_code, judgeConfig: challenge.judge_config,
      tests: replacementTests.filter(test => test.challenge_id === challenge.id && (mode === 'submit' || test.is_public)) }
    const { processSubmission: processOutage } = createLoader({}, { './judge0.ts': { Judge0Provider: class {
      async submit() { if (fault === 'submit') throw new Error('synthetic-private-provider-detail'); return 'fixture-token' }
      async getResult() {
        if (fault === 'poll') throw new Error('synthetic-private-provider-detail')
        return { statusId: 13, stdout: 'synthetic-private-provider-detail' }
      }
    } } })('./supabase/functions/judge-submission/_shared/process-submission.ts')
    const calls = []
    const admin = { rpc: async (name, params) => {
      calls.push({ name, params })
      return { data: name === 'get_multiplayer_judge_payload_internal' ? payload : null, error: null }
    } }
    await processOutage(admin, 'fixture', { workerId: 'fixture-worker', acquiredLease: lease })
    const final = calls.at(-1)
    assert.equal(final.name, 'finalize_multiplayer_submission_internal')
    assert.equal(final.params.p_status, 'internal_error')
    assert.equal(final.params.p_stdout, null)
    assert(!JSON.stringify(final).includes('synthetic-private-provider-detail'))
    outageChecks++
  }
}
console.log(`Judge outage checks OK: ${outageChecks} replacement run/submit failures remain internal_error with no private output.`)
