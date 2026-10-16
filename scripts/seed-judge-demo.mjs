// Explicit local-only opt-in. No URL/password/env-file or remote Docker context.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const host = process.platform === 'win32' ? 'npipe:////./pipe/dockerDesktopLinuxEngine' : 'unix:///var/run/docker.sock'
const container = 'supabase_db_DevRoyale'
function docker(args, input) {
  return execFileSync('docker', ['--host', host, ...args], {
    input, encoding: 'utf8', timeout: 30_000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}
try {
  if (!process.argv.includes('--confirm-local-demo')) throw new Error('confirmation_required')
  // Read only the project label, never inspect container environment/secrets.
  const project = docker(['inspect', '--format', '{{ index .Config.Labels "com.supabase.cli.project" }}', container])
  if (project !== 'DevRoyale') throw new Error('local_project_mismatch')
  const seed = readFileSync(fileURLToPath(new URL('../supabase/seeds/demo.sql', import.meta.url)), 'utf8')
  docker(['exec', '-i', container, 'psql', '-X', '--no-password', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-f', '-'], seed)
  docker(['exec', '-i', container, 'psql', '-X', '--no-password', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-f', '-'], "update devroyale_private.judge_policy set environment='local', mode='demo' where singleton;")
  console.log('Local DevRoyale database enabled for PUBLIC demonstration suites. No competitive data installed.')
} catch {
  // Database/CLI errors can include SQL parameters; never print raw stderr here.
  console.error('Local demo setup failed. Requires the running local Supabase project DevRoyale and current migrations. No remote connection attempted.')
  process.exitCode = 1
}
