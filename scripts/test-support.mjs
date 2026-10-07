import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Test-only loader: compile local TS in memory, never write generated files.
const root = fileURLToPath(new URL('../', import.meta.url))
export function createLoader(globals = {}, stubs = {}) {
  const cache = new Map()
  function load(name, parent = root) {
    if (name in stubs) return stubs[name]
    const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(parent, name)
    const file = [base, `${base}.ts`, path.join(base, 'index.ts')].find((p) => fs.existsSync(p) && fs.statSync(p).isFile())
    if (!file) throw new Error(`Test import not found: ${name}`)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const run = vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { console, ...globals }, { filename: file })
    run((specifier) => load(specifier, path.dirname(file)), module, module.exports)
    return module.exports
  }
  return (name) => load(name)
}

export function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), clear: () => values.clear() }
}
