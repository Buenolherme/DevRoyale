import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createLoader } from './test-support.mjs'
import { queueCases, memoCases, queueTest, memoTest, legacyRequest } from './fixtures/judge-adversarial.mjs'
import { replacements, replacementTests, expectedFor } from './fixtures/a4-replacements.mjs'

const host = process.platform === 'win32' ? 'npipe:////./pipe/dockerDesktopLinuxEngine' : 'unix:///var/run/docker.sock'
const image = 'node:22-alpine'
const validators = createLoader()('./supabase/functions/judge-submission/_shared/validators.ts')
function docker(args, input) {
  return execFileSync('docker', ['--host', host, ...args], {
    input, encoding: 'utf8', timeout: 15_000, windowsHide: true,
    maxBuffer: 64 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}
function execute(source) {
  // No host source, filesystem, credentials, Docker socket or network is exposed.
  const id = docker(['create', '-i', '--pull=never', '--network=none', '--read-only',
    '--user', '65534:65534', '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--memory=128m', '--memory-swap=128m', '--cpus=0.5', '--pids-limit=16',
    '--label', 'devroyale.test=judge-isolation', image, 'node', '--input-type=commonjs'])
  assert.match(id, /^[a-f0-9]{64}$/)
  try {
    const stdout = docker(['start', '--attach', '--interactive', id], source)
    assert.equal(docker(['inspect', '--format', '{{.State.ExitCode}}', id]), '0', 'Fixture execution must exit successfully')
    return stdout
  } finally {
    docker(['rm', '--force', id])
  }
}
function result(stdout) { return { statusId: 3, stdout, time: null, memory: null } }

try {
  docker(['image', 'inspect', image, '--format', '{{.Id}}'])
  for (const [harness, functionName, cases, test] of [
    ['javascript_concurrency_queue', 'executar', queueCases, queueTest],
    ['javascript_memoization', 'memoizar', memoCases, memoTest],
  ]) {
    for (const candidate of cases) {
      const stdout = execute(legacyRequest(candidate.source, harness, test))
      const outcome = validators.compareExecution(result(stdout), test, 'function_tests', 'advanced')
      assert.equal(outcome.status, candidate.legacyStatus, candidate.name)
      for (const mode of ['run', 'submit']) {
        assert.equal(validators.sanitizeSubmissionOutcome(outcome, mode).status, candidate.legacyStatus)
        assert.throws(() => validators.buildExecutionRequest({ mode, language: 'javascript',
          validationType: 'function_tests', sourceCode: candidate.source,
          judgeConfig: { harness, functionName } }, test), /trusted_instrumentation_unavailable/)
      }
      console.log(`PASS: ${candidate.name}: legacy=${outcome.status}${candidate.attack ? ' (forged)' : ''}; current=unavailable in run/submit`)
    }
  }

  // Valid alternatives of unaffected JS challenges must continue to work.
  const test = { input: { args: [7] }, expected: 14 }
  for (const [name, source, expected] of [
    ['normal-function', 'function dobrar(x) { return x * 2; }', 'accepted'],
    ['alternative-arrow', 'const dobrar = x => x + x;', 'accepted'],
    ['alternative-async', 'async function dobrar(x) { return x * 2; }', 'accepted'],
    ['wrong-function', 'function dobrar(x) { return x; }', 'wrong_answer'],
  ]) {
    const request = validators.buildExecutionRequest({ language: 'javascript', validationType: 'function_tests',
      sourceCode: source, judgeConfig: { functionName: 'dobrar' } }, test)
    const execution = result(execute(request.sourceCode))
    for (const mode of ['run', 'submit']) {
      const outcome = validators.sanitizeSubmissionOutcome(validators.compareExecution(execution, test, 'function_tests', 'basic'), mode)
      assert.equal(outcome.status, expected, name)
      if (mode === 'submit') assert.equal(outcome.stdout, undefined)
    }
    console.log(`PASS: ${name}: current=${expected}`)
  }
  let replacementExecutions = 0
  for (const challenge of replacements) {
    const catalogTests = replacementTests.filter(test => test.challenge_id === challenge.id)
    // Additional deterministic property cases are independent of the catalog fixtures.
    let seed = 4004
    const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n }
    const extraTests = Array.from({ length: 24 }, () => {
      let args
      if (challenge.functionName === 'menorCusto') {
        const n = 2 + random(7)
        args = [n, Array.from({ length: random(25) }, () => [random(n), random(n), random(20)]), random(n), random(n)]
      } else if (challenge.functionName === 'lucroMaximo') {
        args = [Array.from({ length: random(12) }, () => { const start = random(15); return [start, start + 1 + random(5), random(30)] }), random(6)]
      } else {
        const n = 1 + random(9), edges = new Map()
        for (let i = 0; i < 15; i++) { const u = random(n), v = random(n); edges.set(`${u}:${v}`, [u, v]) }
        args = [Array.from({ length: n }, () => random(20)), [...edges.values()]]
      }
      return { input: { args }, expected: expectedFor(challenge, args), is_public: false }
    })
    const tests = [...catalogTests, ...extraTests]
    for (const variant of ['reference', 'alternative', 'wrong', 'publicOnly', 'forgedOutput']) {
      const sourceCode = variant === 'forgedOutput'
        ? `function ${challenge.functionName}() { globalThis.__devroyaleActive=1; globalThis.__devroyaleMaxActive=1; return -999; }
           JSON.stringify=()=>${JSON.stringify(String(catalogTests[0].expected))};`
        : challenge[variant]
      const requests = tests.map(test => validators.buildExecutionRequest({
        language: 'javascript', validationType: 'function_tests', sourceCode,
        judgeConfig: { functionName: challenge.functionName },
      }, test).sourceCode)
      // Every untrusted program runs in a fresh process INSIDE the restricted container.
      // Only source+input are sent; expected outputs stay with the host-side comparator.
      const output = execute(`const {spawnSync}=require('node:child_process');
        const sources=${JSON.stringify(requests)};
        const results=sources.map(source=>{const r=spawnSync(process.execPath,['-e',source],{encoding:'utf8',timeout:2000,maxBuffer:8192});
          return {status:r.status,stdout:r.stdout,error:Boolean(r.error)};});
        process.stdout.write(JSON.stringify(results));`)
      const executions = JSON.parse(output)
      const outcomes = executions.map((execution, i) => {
        assert.equal(execution.status, 0, `${challenge.slug}/${variant}: runtime exit`)
        assert.equal(execution.error, false)
        return validators.compareExecution(result(execution.stdout), tests[i], 'function_tests', 'advanced')
      })
      replacementExecutions += outcomes.length
      if (variant === 'reference' || variant === 'alternative') {
        assert(outcomes.every(outcome => outcome.status === 'accepted'), `${challenge.slug}/${variant}`)
      } else {
        assert(outcomes.slice(1, catalogTests.length).some(outcome => outcome.status === 'wrong_answer'), `${challenge.slug}/${variant}: hidden tests must reject`)
        if (variant === 'publicOnly') assert.equal(outcomes[0].status, 'accepted', 'run is only public examples, never a match victory')
      }
      for (const outcome of outcomes) {
        assert.equal(validators.sanitizeSubmissionOutcome(outcome, 'submit').stdout, undefined)
      }
      // Feed actual isolated execution outputs through the complete worker.
      // Only the transport/DB are doubled, never the comparison or policy.
      for (const mode of ['run', 'submit']) {
        let position = 0
        const calls = []
        const payload = { mode, language: 'javascript', difficulty: 'advanced', validationType: 'function_tests',
          sourceCode, judgeConfig: { functionName: challenge.functionName },
          tests: catalogTests.filter(test => mode === 'submit' || test.is_public) }
        const { processSubmission } = createLoader({}, { './judge0.ts': { Judge0Provider: class {
          async submit() { return String(position++) }
          async getResult(token) { return result(executions[Number(token)].stdout) }
        } } })('./supabase/functions/judge-submission/_shared/process-submission.ts')
        const admin = { rpc: async (name, params) => {
          calls.push({ name, params })
          return { data: name === 'get_multiplayer_judge_payload_internal' ? payload : null, error: null }
        } }
        assert.equal(await processSubmission(admin, 'fixture', { workerId: 'fixture-worker',
          acquiredLease: { provider: '', providerToken: null, testPosition: 0 } }), 'processed')
        const expectedStatus = mode === 'run' ? outcomes[0].status
          : ['reference', 'alternative'].includes(variant) ? 'accepted' : 'wrong_answer'
        assert.equal(calls.at(-1).params.p_status, expectedStatus, `${challenge.slug}/${variant}/${mode}: worker outcome`)
        if (mode === 'submit') assert.equal(calls.at(-1).params.p_stdout, null, 'hidden stdout never returned')
        if (expectedStatus === 'accepted') assert.equal(position, payload.tests.length, 'worker evaluates every required case')
      }
      console.log(`PASS: ${challenge.slug}/${variant}: ${outcomes.length} isolated cases; hidden output sanitized`)
    }
  }
  console.log(`PASS: ${replacementExecutions} replacement executions plus legacy adversarial/compatibility checks; all disposable containers removed.`)
} catch (error) {
  console.error('Isolated judge checks FAILED or could not run; not a passing isolation check.')
  console.error('Requires local Docker and an existing node:22-alpine image; no automatic download or host execution fallback.')
  console.error(error.stderr?.toString().trim() || error.message)
  process.exitCode = 1
}
