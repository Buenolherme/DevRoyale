import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { processSubmission } from './_shared/process-submission.ts'
import type {
  JudgeSubmissionRequest,
  StoredSubmission,
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
