import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const root = fileURLToPath(new URL('../', import.meta.url))
const migrationDir = path.join(root, 'supabase/migrations')
const testDir = path.join(root, 'supabase/tests/room_host_transfer')
const fix = '20261013000000_fix_leave_room_host_transfer.sql'
const readyFix = '20261013010000_fix_set_room_ready_status_type.sql'
// Explicit local transport: never use the active Docker context or a remote host.
const host = process.platform === 'win32'
  ? 'npipe:////./pipe/dockerDesktopLinuxEngine'
  : 'unix:///var/run/docker.sock'
const image = 'postgres:17'

function docker(args, input) {
  return execFileSync('docker', ['--host', host, ...args], {
    input, encoding: 'utf8', windowsHide: true, timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

let container
try {
  docker(['version', '--format', '{{.Server.Version}}'])
  docker(['image', 'inspect', image, '--format', '{{.Id}}'])
  container = docker([
    'run', '--detach', '--rm', '--pull=never', '--network=none',
    '--label', 'devroyale.test=room-host-transfer',
    '--tmpfs', '/var/lib/postgresql/data',
    '--env', 'POSTGRES_HOST_AUTH_METHOD=trust',
    '--env', 'POSTGRES_DB=devroyale_a1_test', image,
  ])
  assert.match(container, /^[a-f0-9]{64}$/)

  let ready = false
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      // TCP readiness avoids the temporary socket-only initialization server.
      docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'])
      ready = true
      break
    } catch { await delay(500) }
  }
  assert(ready, 'The disposable PostgreSQL server did not become ready')

  function sql(source, variables = []) {
    return docker([
      'exec', '-i', container, 'psql', '-X', '--no-password',
      '-U', 'postgres', '-d', 'devroyale_a1_test',
      '-v', 'ON_ERROR_STOP=1', ...variables, '-f', '-',
    ], source)
  }
  function runFile(file, variables) {
    const result = sql(readFileSync(file, 'utf8'), variables)
    for (const line of result.split(/\r?\n/)) {
      if (line.startsWith('PASS:')) console.log(line)
    }
  }

  runFile(path.join(testDir, 'bootstrap.sql'))
  const migrations = readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort()
  assert(migrations.includes(fix), 'Host-transfer migration is missing')
  assert(migrations.includes(readyFix), 'Ready-status migration is missing')
  for (const name of migrations.filter(name => name < fix)) {
    runFile(path.join(migrationDir, name))
  }
  // Reproduce both the CURRENT_ROLE name collision and the unique-index defect.
  runFile(path.join(testDir, 'regression.sql'), ['-v', 'expect_bug=true'])
  for (const name of migrations.filter(name => name >= fix && name < readyFix)) {
    runFile(path.join(migrationDir, name))
  }
  runFile(path.join(testDir, 'ready.sql'), ['-v', 'expect_bug=true'])
  for (const name of migrations.filter(name => name >= readyFix)) {
    runFile(path.join(migrationDir, name))
  }
  runFile(path.join(testDir, 'ready.sql'), ['-v', 'expect_bug=false'])
  runFile(path.join(testDir, 'regression.sql'), ['-v', 'expect_bug=false'])
  runFile(path.join(testDir, 'concurrency.sql'))
  console.log('PASS: PostgreSQL ready-status and host-transfer regression suites (isolated container)')
} catch (error) {
  console.error('PostgreSQL regression suite FAILED or could not run; this is NOT a passing database check.')
  console.error('Requires a running local Docker engine and an existing postgres:17 image. No image is downloaded automatically.')
  console.error(error.stderr?.toString().trim() || error.message)
  process.exitCode = 1
} finally {
  if (container && /^[a-f0-9]{64}$/.test(container)) {
    try { docker(['rm', '--force', container]) }
    catch (error) {
      console.error(`Could not remove disposable container ${container}: ${error.message}`)
      process.exitCode = 1
    }
  }
}
