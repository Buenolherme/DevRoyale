// Synthetic inputs only. Source strings MUST NOT be evaluated on the host.
export const queueTest = {
  input: { tasks: [
    { value: 'fixture-a', delayMs: 25 }, { value: 'fixture-b', delayMs: 5 },
    { value: 'fixture-c', delayMs: 15 }, { value: 'fixture-d', delayMs: 1 },
  ] },
  expected: { results: ['fixture-a', 'fixture-b', 'fixture-c', 'fixture-d'], withinLimit: true },
}
export const memoTest = {
  input: { invocations: [[7, 4], [7, 4], [9, 2], [7, 4]] },
  expected: { results: [11, 11, 11, 11], calls: 2 },
}
export const queueCases = [
  { name: 'worker-pool', legacyStatus: 'accepted', source: `async function executar(tasks) {
    const results = new Array(tasks.length); let next = 0;
    async function worker() { while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); } }
    await Promise.all([worker(), worker()]); return results;
  }` },
  { name: 'alternative-batches', legacyStatus: 'accepted', source: `async function executar(tasks) {
    const results = []; for (let i = 0; i < tasks.length; i += 2) {
      results.push(...await Promise.all(tasks.slice(i, i + 2).map(task => task())));
    } return results;
  }` },
  { name: 'alternative-sequential', legacyStatus: 'accepted', source: `async function executar(tasks) {
    const results = []; for (const task of tasks) results.push(await task()); return results;
  }` },
  { name: 'unbounded-parallel', legacyStatus: 'wrong_answer', source: 'async function executar(tasks) { return Promise.all(tasks.map(task => task())); }' },
  { name: 'wrong-values', legacyStatus: 'wrong_answer', source: 'async function executar() { return []; }' },
  { name: 'forge-max-counter', legacyStatus: 'accepted', attack: true, source: `async function executar(tasks) {
    const results = await Promise.all(tasks.map(task => task())); __devroyaleMaxActive = 0; return results;
  }` },
  { name: 'forge-active-counter', legacyStatus: 'accepted', attack: true, source: `async function executar(tasks) {
    return Promise.all(tasks.map(task => { __devroyaleActive = -100; return task(); }));
  }` },
  { name: 'replace-math-without-counter-names', legacyStatus: 'accepted', attack: true, source: `Math.max = () => 0;
    async function executar(tasks) { return Promise.all(tasks.map(task => task())); }` },
  { name: 'forge-serializer-without-counter-names', legacyStatus: 'accepted', attack: true, source: `const originalStringify = JSON.stringify;
    JSON.stringify = value => originalStringify(value && 'withinLimit' in value ? { ...value, withinLimit: true } : value);
    async function executar(tasks) { return Promise.all(tasks.map(task => task())); }` },
  { name: 'forge-output-without-counter-names', legacyStatus: 'accepted', attack: true, source: `const originalLog = console.log;
    console.log = text => { const data = JSON.parse(text); data.withinLimit = true; originalLog(JSON.stringify(data)); };
    async function executar(tasks) { return Promise.all(tasks.map(task => task())); }` },
]
export const memoCases = [
  { name: 'memo-map', legacyStatus: 'accepted', source: `function memoizar(fn) {
    const cache = new Map(); return (...args) => { const key = JSON.stringify(args);
      if (!cache.has(key)) cache.set(key, fn(...args)); return cache.get(key); };
  }` },
  { name: 'memo-alternative-object', legacyStatus: 'accepted', source: `function memoizar(fn) {
    const cache = Object.create(null); return (...args) => { const key = JSON.stringify(args);
      if (!(key in cache)) cache[key] = fn(...args); return cache[key]; };
  }` },
  { name: 'memo-no-cache', legacyStatus: 'wrong_answer', source: 'function memoizar(fn) { return (...args) => fn(...args); }' },
  { name: 'memo-forge-counter', legacyStatus: 'accepted', attack: true, source: `function memoizar(fn) {
    return (...args) => { const result = fn(...args);
      __devroyaleCalls = new Set(__devroyaleInvocations.map(values => JSON.stringify(values))).size;
      return result; };
  }` },
]

// Frozen reproduction of the two vulnerable wrappers at 651afb1. Building a
// string is safe on the host; executing it is reserved for the Docker runner.
export function legacyRequest(source, harness, test) {
  if (harness === 'javascript_concurrency_queue') {
    return `${source}
const __devroyaleTaskSpecs = ${JSON.stringify(test.input.tasks)};
let __devroyaleActive = 0;
let __devroyaleMaxActive = 0;
const __devroyaleTasks = __devroyaleTaskSpecs.map(({ value, delayMs }) => () => new Promise(resolve => {
  __devroyaleActive += 1;
  __devroyaleMaxActive = Math.max(__devroyaleMaxActive, __devroyaleActive);
  setTimeout(() => { __devroyaleActive -= 1; resolve(value); }, delayMs);
}));
Promise.resolve(executar(__devroyaleTasks))
  .then(results => console.log(JSON.stringify({ results, withinLimit: __devroyaleMaxActive <= 2 })))
  .catch(error => { console.error(error); process.exitCode = 1; });`
  }
  return `${source}
const __devroyaleInvocations = ${JSON.stringify(test.input.invocations)};
let __devroyaleCalls = 0;
const __devroyaleMemoized = memoizar((...values) => {
  __devroyaleCalls += 1; return values.reduce((total, value) => total + value, 0);
});
const __devroyaleResults = __devroyaleInvocations.map(values => __devroyaleMemoized(...values));
console.log(JSON.stringify({ results: __devroyaleResults, calls: __devroyaleCalls }));`
}
