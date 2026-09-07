import type {
  CodeJudgeProvider,
  JudgeExecutionRequest,
  JudgeExecutionResult,
} from './types.ts'

const DEFAULT_LANGUAGE_IDS = {
  python: 71,
  javascript: 63,
} as const

const POLL_INTERVAL_MS = 500
const MAX_POLL_ATTEMPTS = 24
const CPU_TIME_LIMIT_SECONDS = 2
const WALL_TIME_LIMIT_SECONDS = 4
const MEMORY_LIMIT_KB = 128_000

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export class Judge0Provider implements CodeJudgeProvider {
  private readonly baseUrl: string
  private readonly authHeaders: Record<string, string>
  private readonly languageIds: Record<JudgeExecutionRequest['language'], number>

  constructor() {
    const baseUrl = Deno.env.get('JUDGE0_BASE_URL')?.trim().replace(/\/+$/, '')
    const authMode = Deno.env.get('JUDGE0_AUTH_MODE')?.trim().toLowerCase() || 'judge0'
    if (!baseUrl) throw new Error('judge_not_configured')

    this.baseUrl = baseUrl

    if (authMode === 'judge0') {
      const authToken = Deno.env.get('JUDGE0_AUTH_TOKEN')?.trim()
      if (!authToken) throw new Error('judge_not_configured')
      this.authHeaders = { 'X-Auth-Token': authToken }
    } else if (authMode === 'rapidapi') {
      const apiKey = Deno.env.get('JUDGE0_RAPIDAPI_KEY')?.trim()
      const apiHost = Deno.env.get('JUDGE0_RAPIDAPI_HOST')?.trim()
      if (!apiKey || !apiHost) throw new Error('judge_not_configured')
      this.authHeaders = {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
      }
    } else {
      throw new Error('judge_auth_mode_invalid')
    }

    this.languageIds = {
      python: Number(Deno.env.get('JUDGE0_PYTHON_LANGUAGE_ID')) || DEFAULT_LANGUAGE_IDS.python,
      javascript: Number(Deno.env.get('JUDGE0_JAVASCRIPT_LANGUAGE_ID')) || DEFAULT_LANGUAGE_IDS.javascript,
    }
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      ...this.authHeaders,
    }
  }

  async submit(request: JudgeExecutionRequest): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/submissions?base64_encoded=true&wait=false`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          language_id: this.languageIds[request.language],
          source_code: encodeBase64(request.sourceCode),
          stdin: encodeBase64(request.stdin ?? ''),
          cpu_time_limit: CPU_TIME_LIMIT_SECONDS,
          wall_time_limit: WALL_TIME_LIMIT_SECONDS,
          memory_limit: MEMORY_LIMIT_KB,
          max_file_size: 1024,
          max_processes_and_or_threads: 30,
          enable_network: false,
        }),
      },
    )

    if (!response.ok) throw new Error(`judge_submit_failed:${response.status}`)
    const payload = await response.json() as { token?: unknown }
    if (typeof payload.token !== 'string') throw new Error('judge_token_missing')
    return payload.token
  }

  async getResult(token: string): Promise<JudgeExecutionResult> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const response = await fetch(
        `${this.baseUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=true&fields=token,status,stdout,stderr,compile_output,message,time,memory`,
        { headers: this.headers() },
      )
      if (!response.ok) throw new Error(`judge_status_failed:${response.status}`)

      const payload = await response.json() as {
        token?: unknown
        status?: { id?: unknown; description?: unknown }
        stdout?: unknown
        stderr?: unknown
        compile_output?: unknown
        message?: unknown
        time?: unknown
        memory?: unknown
      }
      const statusId = typeof payload.status?.id === 'number' ? payload.status.id : 13

      if (statusId > 2) {
        return {
          token,
          statusId,
          statusDescription: typeof payload.status?.description === 'string'
            ? payload.status.description
            : 'Internal Error',
          stdout: decodeBase64(payload.stdout),
          stderr: decodeBase64(payload.stderr),
          compileOutput: decodeBase64(payload.compile_output),
          message: decodeBase64(payload.message),
          time: numberOrNull(payload.time),
          memory: numberOrNull(payload.memory),
        }
      }

      await sleep(POLL_INTERVAL_MS)
    }

    return {
      token,
      statusId: 5,
      statusDescription: 'Time Limit Exceeded',
      stdout: '',
      stderr: '',
      compileOutput: '',
      message: '',
      time: null,
      memory: null,
    }
  }
}
