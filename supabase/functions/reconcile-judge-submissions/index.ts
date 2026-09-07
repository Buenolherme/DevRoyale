import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import {
  finalizeSubmissionAsInternalError,
  processSubmission,
  type SubmissionLeaseState,
} from '../judge-submission/_shared/process-submission.ts'

const MAX_JOBS_PER_INVOCATION = 2
const STALE_SECONDS = 30
const LEASE_SECONDS = 90

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status })
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  const bearerToken = authorization?.replace(/^Bearer\s+/i, '')

  if (!supabaseUrl || !serviceRoleKey || bearerToken !== serviceRoleKey) {
    return json({ error: 'Não autorizado.' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const results: Array<{ submissionId: string; result: string }> = []

  try {
    for (let index = 0; index < MAX_JOBS_PER_INVOCATION; index += 1) {
      const workerId = crypto.randomUUID()
      const { data, error } = await admin.rpc('claim_stale_multiplayer_submission_internal', {
        p_worker_id: workerId,
        p_stale_seconds: STALE_SECONDS,
        p_lease_seconds: LEASE_SECONDS,
      })
      if (error) throw error

      const lease = data as SubmissionLeaseState | null
      if (!lease) break

      if (lease.exhausted) {
        await finalizeSubmissionAsInternalError(admin, lease.submissionId)
        results.push({ submissionId: lease.submissionId, result: 'recovery_exhausted' })
        continue
      }

      const result = await processSubmission(admin, lease.submissionId, {
        workerId,
        acquiredLease: lease,
      })
      results.push({ submissionId: lease.submissionId, result })
    }

    return json({ processed: results.length, results })
  } catch {
    return json({ error: 'Não foi possível reconciliar as submissions.' }, 500)
  }
})
