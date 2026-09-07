import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.112.3'
import { Judge0Provider } from './judge0.ts'
import {
  buildExecutionRequest,
  compareExecution,
  sanitizeSubmissionOutcome,
  validateHtmlCss,
} from './validators.ts'
import type {
  JudgePayload,
  ValidationOutcome,
} from './types.ts'

const LEASE_SECONDS = 90

export interface SubmissionLeaseState {
  submissionId: string
  provider: string
  providerToken: string | null
  testPosition: number
  attempts: number
  exhausted: boolean
}

interface ProcessSubmissionOptions {
  workerId?: string
  acquiredLease?: SubmissionLeaseState
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function finalize(
  admin: SupabaseClient,
  submissionId: string,
  outcome: ValidationOutcome,
) {
  const { error } = await admin.rpc('finalize_multiplayer_submission_internal', {
    p_submission_id: submissionId,
    p_status: outcome.status,
    p_public_message: outcome.message,
    p_stdout: outcome.stdout ?? null,
    p_execution_time: outcome.executionTime ?? null,
    p_memory_used: outcome.memoryUsed ?? null,
  })
  if (error) throw error
}

async function markRunning(
  admin: SupabaseClient,
  submissionId: string,
  workerId: string,
  provider: string,
  providerToken: string | null,
  testPosition: number,
) {
  const { error } = await admin.rpc('mark_multiplayer_submission_running_internal', {
    p_submission_id: submissionId,
    p_provider: provider,
    p_provider_token: providerToken,
    p_test_position: testPosition,
    p_worker_id: workerId,
    p_lease_seconds: LEASE_SECONDS,
  })
  if (error) throw error
}

async function acquireLease(
  admin: SupabaseClient,
  submissionId: string,
  workerId: string,
): Promise<SubmissionLeaseState | null> {
  const { data, error } = await admin.rpc('acquire_multiplayer_submission_lease_internal', {
    p_submission_id: submissionId,
    p_worker_id: workerId,
    p_lease_seconds: LEASE_SECONDS,
  })
  if (error) throw error
  return data as SubmissionLeaseState | null
}

async function recordWorkerError(
  admin: SupabaseClient,
  submissionId: string,
  workerId: string,
  error: unknown,
) {
  await admin.rpc('record_multiplayer_submission_job_error_internal', {
    p_submission_id: submissionId,
    p_worker_id: workerId,
    p_last_error: errorMessage(error),
  })
}

export async function finalizeSubmissionAsInternalError(
  admin: SupabaseClient,
  submissionId: string,
) {
  await finalize(admin, submissionId, {
    status: 'internal_error',
    message: 'O avaliador da Arena está temporariamente indisponível.',
  })
}

export async function processSubmission(
  admin: SupabaseClient,
  submissionId: string,
  options: ProcessSubmissionOptions = {},
) {
  const workerId = options.workerId ?? crypto.randomUUID()
  let lease = options.acquiredLease ?? null

  try {
    if (!lease) lease = await acquireLease(admin, submissionId, workerId)
    if (!lease) return 'busy' as const

    const { data, error } = await admin.rpc('get_multiplayer_judge_payload_internal', {
      p_submission_id: submissionId,
    })
    if (error) throw error
    const payload = data as JudgePayload
    if (!Array.isArray(payload.tests) || payload.tests.length === 0) {
      throw new Error('judge_tests_missing')
    }

    if (payload.validationType === 'html_css_structure') {
      for (let index = 0; index < payload.tests.length; index += 1) {
        const test = payload.tests[index]
        await markRunning(
          admin,
          submissionId,
          workerId,
          'html-css-validator',
          null,
          index + 1,
        )
        const outcome = sanitizeSubmissionOutcome(
          validateHtmlCss(payload.sourceCode, test.validatorConfig),
          payload.mode,
        )
        if (outcome.status !== 'accepted') {
          await finalize(admin, submissionId, outcome)
          return 'processed' as const
        }
      }
      await finalize(admin, submissionId, sanitizeSubmissionOutcome({
        status: 'accepted',
        message: payload.mode === 'run' ? 'Estrutura pública validada.' : 'Solução aceita.',
      }, payload.mode))
      return 'processed' as const
    }

    const provider = new Judge0Provider()
    const resumePosition = lease.provider === 'judge0' && lease.providerToken
      ? Math.max(1, lease.testPosition)
      : 1
    let resumeToken = lease.provider === 'judge0' ? lease.providerToken : null
    let lastAccepted: ValidationOutcome = { status: 'accepted', message: 'Solução aceita.' }

    for (let index = resumePosition - 1; index < payload.tests.length; index += 1) {
      const test = payload.tests[index]
      const providerToken = resumeToken
        ?? await provider.submit(buildExecutionRequest(payload, test))
      await markRunning(
        admin,
        submissionId,
        workerId,
        'judge0',
        providerToken,
        index + 1,
      )
      const execution = await provider.getResult(providerToken)
      const outcome = sanitizeSubmissionOutcome(compareExecution(
        execution,
        test,
        payload.validationType,
        payload.difficulty,
      ), payload.mode)
      lastAccepted = outcome
      resumeToken = null

      if (outcome.status !== 'accepted') {
        await finalize(admin, submissionId, outcome)
        return 'processed' as const
      }
    }

    await finalize(admin, submissionId, {
      ...lastAccepted,
      message: payload.mode === 'run' ? 'Testes públicos concluídos.' : 'Solução aceita.',
    })
    return 'processed' as const
  } catch (processingError) {
    try {
      await finalizeSubmissionAsInternalError(admin, submissionId)
    } catch (finalizationError) {
      try {
        await recordWorkerError(
          admin,
          submissionId,
          workerId,
          `${errorMessage(processingError)}; finalize:${errorMessage(finalizationError)}`,
        )
      } catch {
        // The persisted lease expires, allowing a later reconciliation attempt.
      }
    }
    return 'failed' as const
  }
}
