import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { createLoader } from './test-support.mjs'

// All keys, responses and requests below are synthetic. No fetch/network call.
let handler
let rpcCalls = []
let rpcError = null
let authenticated = true
const client = {
  auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'user-fixture' } : null }, error: null }) },
  rpc: async (name, params) => { rpcCalls.push({ name, params }); return { data: { id: 'submission-fixture', status: 'accepted', public_message: 'Solução aceita.', stdout: null }, error: rpcError } },
}
const env = { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-server-only' }
const globals = { Request, Response, TextEncoder, crypto: webcrypto, Deno: { env: { get: (key) => env[key] }, serve: (callback) => { handler = callback } }, EdgeRuntime: { waitUntil: () => {} } }
createLoader(globals, { 'npm:@supabase/supabase-js@2.112.3': { createClient: () => client }, './_shared/process-submission.ts': { processSubmission: async () => {} } })('./supabase/functions/judge-submission/index.ts')
const submission = { matchId: '00000000-0000-4000-8000-000000000001', roundId: '00000000-0000-4000-8000-000000000002', requestId: '00000000-0000-4000-8000-000000000003', sourceCode: 'print(1)', mode: 'submit' }
function request(body, auth = true, method = 'POST') {
  return new Request('https://example.invalid/judge-submission', { method, headers: auth ? { Authorization: 'Bearer fixture-user' } : {}, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) })
}
assert.equal((await handler(request(submission, false))).status, 401)
authenticated = false
assert.equal((await handler(request(submission))).status, 401)
authenticated = true
assert.equal((await handler(request('{broken'))).status, 400)
assert.equal((await handler(request({ ...submission, mode: 'invalid' }))).status, 400)
assert.equal((await handler(request({ ...submission, sourceCode: 'x'.repeat(20481) }))).status, 400)
assert.equal(rpcCalls.length, 0)
for (const [message, status] of [['submission_rate_limited', 429], ['round_not_active', 409], ['source_code_size_invalid', 413], ['internal_private_detail', 500]]) {
  rpcError = { message, details: 'private SQL', hint: 'secret' }
  const response = await handler(request(submission))
  assert.equal(response.status, status)
  assert(!/private SQL|secret|internal_private_detail/.test(await response.text()))
}
rpcError = null
const response = await handler(request(submission))
assert.equal(response.status, 200)
assert.equal(rpcCalls.at(-1).params.p_user_id, 'user-fixture')
assert.equal(rpcCalls.at(-1).params.p_client_request_id, submission.requestId)
assert.deepEqual(Object.keys(await response.json()).sort(), ['message', 'status', 'stdout', 'submissionId'])

const processLoad = createLoader({ crypto: webcrypto })
const { processSubmission } = processLoad('./supabase/functions/judge-submission/_shared/process-submission.ts')
const lease = { submissionId: 'fixture', provider: '', providerToken: null, testPosition: 0, attempts: 1, exhausted: false }
let payload = { validationType: 'html_css_structure', sourceCode: '<h1>OK</h1>', mode: 'submit', tests: [{ validatorConfig: { required: [{ anyOf: ['<h1>'], description: 'private-rule' }] } }] }
rpcCalls = []
const admin = { rpc: async (name, params) => {
  rpcCalls.push({ name, params })
  return { data: name === 'acquire_multiplayer_submission_lease_internal' ? lease : name === 'get_multiplayer_judge_payload_internal' ? payload : null, error: null }
} }
const testWorkerId = '00000000-0000-4000-8000-000000000010'
assert.equal(await processSubmission(admin, 'fixture', { workerId: testWorkerId }), 'processed')
const finalized = rpcCalls.find((call) => call.name === 'finalize_multiplayer_submission_internal')
assert.equal(finalized.params.p_status, 'accepted')
assert.equal(finalized.params.p_worker_id, testWorkerId)
assert.equal(finalized.params.p_stdout, null)
assert(!JSON.stringify(finalized.params).includes('private-rule'))
assert.equal(await processSubmission({ rpc: async () => ({ data: null, error: null }) }, 'busy'), 'busy')
payload = { ...payload, tests: [] }
rpcCalls = []
assert.equal(await processSubmission(admin, 'fixture', { workerId: testWorkerId }), 'failed')
assert.equal(rpcCalls.at(-1).params.p_status, 'internal_error')

let jobs = 0
const reconcileClient = { rpc: async () => ({ data: jobs++ < 1 ? { ...lease, exhausted: true } : null, error: null }) }
let exhausted = 0
createLoader(globals, { 'npm:@supabase/supabase-js@2.112.3': { createClient: () => reconcileClient }, '../judge-submission/_shared/process-submission.ts': { processSubmission: async () => 'processed', finalizeSubmissionAsInternalError: async () => { exhausted++ } } })('./supabase/functions/reconcile-judge-submissions/index.ts')
assert.equal((await handler(request({}))).status, 401)
const reconcileRequest = new Request('https://example.invalid/reconcile', { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
assert.equal((await handler(reconcileRequest)).status, 200)
assert.equal(exhausted, 1)
console.log('Edge checks OK: authentication, payload validation, RPC user/idempotency propagation, sanitized errors, rate-limit mapping, worker lease/busy/finalization and restricted reconciliation (offline doubles).')
const validators = createLoader()('./supabase/functions/judge-submission/_shared/validators.ts')
assert.equal(validators.validateHtmlCss('<!-- <h1>fake</h1> -->', { required: [{ anyOf: ['<h1>'], description: 'heading' }] }).status, 'wrong_answer')
for (const statusId of [6, 7, 12, 13]) {
  const outcome = validators.sanitizeSubmissionOutcome(validators.mapExecutionFailure({ statusId, compileOutput: 'secret harness', stderr: 'private stack', message: 'raw provider' }), 'run')
  assert(!/secret|harness|stack|raw provider/.test(JSON.stringify(outcome)))
}
