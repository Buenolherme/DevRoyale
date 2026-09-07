import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.3'
import { Judge0Provider } from './_shared/judge0.ts'
import {
  buildExecutionRequest,
  compareExecution,
  validateHtmlCss,
} from './_shared/validators.ts'
import type {
  JudgePayload,
  JudgeSubmissionRequest,
  StoredSubmission,
  ValidationOutcome,
} from './_shared/types.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_SOURCE_BYTES = 20_480
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS })
}

function friendlyError(error: unknown): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : String(error)
  const mappings: Array<[RegExp, string, number]> = [
    [/not_authenticated|Invalid JWT|Auth session missing/i, 'Sua sessão expirou. Entre novamente.', 401],
    [/match_not_found|round_not_active|match_not_active/, 'Esta rodada não está mais disponível.', 409],
    [/submission_rate_limited/, 'Aguarde um instante antes de avaliar novamente.', 429],
    [/source_code_size_invalid/, 'O código deve ter no máximo 20 KB.', 413],
    [/invalid_submission_request/, 'A identificação desta tentativa é inválida.', 400],
  ]
  const match = mappings.find(([pattern]) => pattern.test(raw))
  return match
    ? { message: match[1], status: match[2] }
    : { message: 'Não foi possível enviar a solução para a Arena.', status: 500 }
}

function validRequest(value: unknown): value is JudgeSubmissionRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<JudgeSubmissionRequest>
  return (
    typeof request.matchId === 'string' && UUID_PATTERN.test(request.matchId) &&
    typeof request.roundId === 'string' && UUID_PATTERN.test(request.roundId) &&
    typeof request.requestId === 'string' && UUID_PATTERN.test(request.requestId) &&
    typeof request.sourceCode === 'string' &&
    new TextEncoder().encode(request.sourceCode).byteLength <= MAX_SOURCE_BYTES &&
    (request.mode === 'run' || request.mode === 'submit')
  )
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

async function processSubmission(admin: SupabaseClient, submissionId: string) {
  try {
    const { data, error } = await admin.rpc('get_multiplayer_judge_payload_internal', {
      p_submission_id: submissionId,
    })
    if (error) throw error
    const payload = data as JudgePayload
    if (!Array.isArray(payload.tests) || payload.tests.length === 0) {
      throw new Error('judge_tests_missing')
    }

    if (payload.validationType === 'html_css_structure') {
      await admin.rpc('mark_multiplayer_submission_running_internal', {
        p_submission_id: submissionId,
        p_provider: 'html-css-validator',
        p_provider_token: null,
      })
      for (const test of payload.tests) {
        const outcome = validateHtmlCss(payload.sourceCode, test.validatorConfig)
        if (outcome.status !== 'accepted') {
          await finalize(admin, submissionId, {
            ...outcome,
            message: payload.mode === 'submit' && outcome.status === 'wrong_answer'
              ? 'Alguns testes ocultos ainda falharam.'
              : outcome.message,
          })
          return
        }
      }
      await finalize(admin, submissionId, {
        status: 'accepted',
        message: payload.mode === 'run' ? 'Estrutura pública validada.' : 'Solução aceita.',
      })
      return
    }

    const provider = new Judge0Provider()
    let lastAccepted: ValidationOutcome = { status: 'accepted', message: 'Solução aceita.' }
    for (const test of payload.tests) {
      const providerToken = await provider.submit(buildExecutionRequest(payload, test))
      await admin.rpc('mark_multiplayer_submission_running_internal', {
        p_submission_id: submissionId,
        p_provider: 'judge0',
        p_provider_token: providerToken,
      })
      const execution = await provider.getResult(providerToken)
      const outcome = compareExecution(
        execution,
        test,
        payload.validationType,
        payload.difficulty,
      )
      lastAccepted = outcome
      if (outcome.status !== 'accepted') {
        await finalize(admin, submissionId, {
          ...outcome,
          stdout: payload.mode === 'submit' ? undefined : outcome.stdout,
          message: payload.mode === 'submit' && outcome.status === 'wrong_answer'
            ? outcome.message.includes('muito perto')
              ? outcome.message
              : 'Alguns testes ocultos ainda falharam.'
            : outcome.message,
        })
        return
      }
    }

    await finalize(admin, submissionId, {
      ...lastAccepted,
      stdout: payload.mode === 'submit' ? undefined : lastAccepted.stdout,
      message: payload.mode === 'run' ? 'Testes públicos concluídos.' : 'Solução aceita.',
    })
  } catch {
    try {
      await finalize(admin, submissionId, {
        status: 'internal_error',
        message: 'O avaliador da Arena está temporariamente indisponível. Tente novamente.',
      })
    } catch {
      // A queued/running row remains recoverable if even the database is unavailable.
    }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return response({ error: 'Método não permitido.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
      ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authorization = request.headers.get('Authorization')
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
      return response({ error: 'Sua sessão expirou. Entre novamente.' }, 401)
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const token = authorization.replace(/^Bearer\s+/i, '')
    const { data: authData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !authData.user) {
      return response({ error: 'Sua sessão expirou. Entre novamente.' }, 401)
    }

    const body = await request.json() as unknown
    if (!validRequest(body)) {
      return response({ error: 'Dados da tentativa inválidos ou código acima de 20 KB.' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin.rpc('create_multiplayer_submission_internal', {
      p_user_id: authData.user.id,
      p_match_id: body.matchId,
      p_round_id: body.roundId,
      p_client_request_id: body.requestId,
      p_mode: body.mode,
      p_source_code: body.sourceCode,
    })
    if (error) throw error
    const submission = data as StoredSubmission

    if (submission.status === 'queued' || submission.status === 'running') {
      EdgeRuntime.waitUntil(processSubmission(admin, submission.id))
    }

    return response({
      submissionId: submission.id,
      status: submission.status,
      message: submission.public_message ?? 'Solução recebida para avaliação.',
      stdout: submission.stdout,
    }, submission.status === 'queued' || submission.status === 'running' ? 202 : 200)
  } catch (error) {
    const mapped = friendlyError(error)
    return response({ error: mapped.message }, mapped.status)
  }
})
