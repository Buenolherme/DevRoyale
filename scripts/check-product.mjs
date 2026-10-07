import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createLoader, memoryStorage } from './test-support.mjs'

const localStorage = memoryStorage()
const load = createLoader({ localStorage, window: { localStorage } })
const { studyLearningPaths: paths } = load('./src/data/studyLearningPaths.ts')
const { mockBugs: bugs } = load('./src/data/mockBugs.ts')
const { mockBattleChallenges: battles } = load('./src/data/mockBattleChallenges.ts')
const { lessonPractice, lessonChecks, trainingCareers } = load('./src/data/trainingCatalog.ts')
const training = load('./src/utils/training.ts')
const { validateBugFix } = load('./src/utils/bugValidation.ts')
const { validateBattleSolution, normalizeBattleAnswer } = load('./src/utils/battleValidation.ts')
const lessons = paths.flatMap((path) => path.lessons)
assert.equal(paths.length, 32)
assert.equal(lessons.length, 102)
assert.equal(bugs.length, 96)
assert.equal(battles.length, 56)
for (const [name, items] of [['modules', paths], ['lessons', lessons], ['bugs', bugs], ['battles', battles]]) {
  assert.equal(new Set(items.map((item) => item.id)).size, items.length, `Duplicate ${name} id`)
}
for (const path of paths) {
  for (const lesson of path.lessons) {
    assert.equal(lesson.topicId, path.topicId)
    assert.equal(lesson.levelId, path.levelId)
    for (const key of ['title', 'shortDescription', 'explanation', 'analogy', 'lessonTheme']) assert(lesson[key]?.trim(), `${lesson.id}: ${key}`)
    assert(lesson.codeExample.code.trim() && lesson.codeExample.lineByLine.length)
    assert(lesson.commonMistakes.length && lesson.miniActivity.instructions.trim() && lesson.miniActivity.successCriteria.length)
    assert(lesson.explanation.length < 2000, `Overlong explanation: ${lesson.id}`)
    for (const resource of [...lesson.trustedResources, ...lesson.recommendedVideos]) assert.equal(new URL(resource.url).protocol, 'https:')
  }
}
for (const bug of bugs) {
  for (const key of ['description', 'hint', 'explanation', 'brokenCode', 'expectedFix']) assert(bug[key]?.trim(), `${bug.id}: ${key}`)
  assert.equal(validateBugFix(bug.expectedFix, bug.expectedFix, bug.language), true, bug.id)
  assert.equal(validateBugFix(bug.brokenCode, bug.expectedFix, bug.language), false, `${bug.id}: broken code accepted`)
  assert.equal(validateBugFix('', bug.expectedFix, bug.language), false)
  assert(bug.bugCount >= 1 && bug.bugCount <= 5 && bug.bugExplanations.length >= bug.bugCount)
  assert(bug.xp > 0 && bug.topics.length && bug.tags.length)
}
for (const battle of battles) {
  assert.equal(validateBattleSolution(battle.referenceSolution ?? battle.expectedAnswer, battle).isValid, true, `Reference rejected: ${battle.id}`)
  assert.equal(validateBattleSolution('', battle).isValid, false)
}
assert.equal(validateBugFix('print("a  b")', 'print("a b")', 'python'), false)
assert.equal(validateBugFix('print(11)', 'print(10)', 'python'), false)
assert.equal(validateBugFix('if True:\n    print(1)\nprint(2)', 'if True:\n    print(1)\n    print(2)', 'python'), false)
assert.equal(validateBugFix('print( "ok" )', "print('ok')", 'python'), true)
assert.notEqual(normalizeBattleAnswer('SELECT "name" FROM t;', 'sql'), normalizeBattleAnswer("SELECT 'name' FROM t;", 'sql'))
for (const difficulty of ['never', 'basic', 'intermediate', 'advanced']) {
  const challenge = { ...battles.find((b) => b.id === 'python-never-hello'), difficulty }
  const reference = challenge.referenceSolution ?? challenge.expectedAnswer
  const near = validateBattleSolution(reference.replace('Hello', 'hello'), challenge)
  assert.equal(near.isValid, false)
  assert.equal(near.issue === 'format-mismatch', ['never', 'basic'].includes(difficulty))
  const semantic = validateBattleSolution('print("Outro resultado")', challenge)
  assert.equal(semantic.isValid, false)
  assert.notEqual(semantic.issue, 'format-mismatch')
  const numeric = { ...challenge, expectedOutput: 'Pontos: 10', statement: 'Exiba Pontos: 10' }
  assert.notEqual(validateBattleSolution('print("Pontos: 11")', numeric).issue, 'format-mismatch')
}

for (const [lessonId, practice] of Object.entries(lessonPractice)) {
  const lesson = lessons.find((l) => l.id === lessonId)
  assert(lesson, `Missing mapped lesson ${lessonId}`)
  for (const [id, catalog] of [[practice.bugId, bugs], [practice.battleId, battles]]) if (id) {
    const entry = catalog.find((e) => e.id === id)
    assert(entry, `Missing practice ${id}`)
    assert.equal(entry.language, lesson.topicId, `Language mismatch: ${lessonId}`)
  }
}
for (const [id, check] of Object.entries(lessonChecks)) {
  assert(lessons.some((lesson) => lesson.id === id))
  assert(check.answer >= 0 && check.answer < check.options.length && check.explanation.trim())
  assert.equal(new Set(check.options).size, check.options.length)
}
for (const career of trainingCareers) {
  assert.equal(new Set(career.modules).size, career.modules.length)
  assert(career.modules.every((id) => paths.some((p) => p.id === id)))
}
const empty = new Set()
const full = new Set(paths.flatMap((p) => p.lessons.map((l) => training.lessonKey(p, l))))
full.add('obsolete:fake:unknown')
assert.equal(training.trainingProgress(paths, full).percent, 100)
assert.equal(training.trainingProgress([...paths, ...paths], full).total, 102)
assert.equal(training.trainingProgress([], full).percent, 0)
const first = paths[0]
const visited = { pathId: first.id, lessonId: first.lessons[0].id }
assert.equal(training.continueTraining(visited, empty).lesson.id, first.lessons[0].id)
const partial = new Set([training.lessonKey(first, first.lessons[0])])
assert.equal(training.continueTraining(visited, partial).lesson.id, first.lessons[1].id)
assert.equal(training.continueTraining(visited, full), null)
assert(training.searchTraining('SELECT', empty).some(({ path }) => path.topicId === 'sql'))
assert(training.searchTraining('flexbox', empty).length)
assert.equal(training.searchTraining('zznonexistent', empty).length, 0)
assert.equal(training.searchTraining('', partial, 'completed').length, 1)
assert.equal(training.searchTraining('', empty, 'favorites', [first.lessons[0].id]).length, 1)
assert.equal(training.searchTraining('', full, 'new').length, 0)
assert.equal(training.searchTraining('', full, 'progress').length, 0)
const workspace = { visited, favorites: [first.lessons[0].id], projectChecks: [], failure: null }
assert(training.saveTrainingWorkspace('a', workspace))
assert.equal(training.readTrainingWorkspace('a').visited.lessonId, visited.lessonId)
assert.equal(training.readTrainingWorkspace('b').visited, null)
training.recordPracticeFailure('a', 'bug', 'bug-python-basic-counter')
assert.equal(training.recommendTraining(training.readTrainingWorkspace('a'), empty).lesson.id, 'python-basic-loops-v1')
localStorage.setItem('devroyale_training_workspace_v2:a', '{broken')
assert.equal(training.readTrainingWorkspace('a').visited, null)

const progress = load('./src/utils/userProgress.ts')
const initial = progress.getUserProgress('test-user')
assert.equal(initial.totalXP, 0)
const firstAward = progress.addXP('test-user', 25, 'bug', bugs[0].id)
assert.equal(firstAward.xpAwarded, 25)
assert.equal(progress.addXP('test-user', 25, 'bug', bugs[0].id).xpAwarded, 0)
assert.equal(progress.getUserProgress('test-user').totalXP, 25)
assert.equal(progress.getUserProgress('other-user').totalXP, 0)
assert.equal(progress.addXP(null, 25, 'bug', bugs[0].id).xpAwarded, 0)
assert.equal(progress.checkAchievements('test-user').length, 0)
const reloaded = createLoader({ localStorage, window: { localStorage } })('./src/utils/userProgress.ts')
assert.equal(reloaded.addXP('test-user', 25, 'bug', bugs[0].id).duplicate, true)
assert.equal(new Set(firstAward.progress.unlockedAchievements.map((a) => a.id)).size, firstAward.progress.unlockedAchievements.length)
for (const achievement of progress.PROGRESS_ACHIEVEMENTS) assert(progress.getAchievementProgress(firstAward.progress, achievement).percentage <= 100)
const { findNextTrainingBug } = load('./src/utils/bugTraining.ts')
assert.equal(findNextTrainingBug(bugs.slice(0, 3), bugs[0].id, [bugs[0].id, bugs[1].id]).id, bugs[2].id)

const rules = load('./src/config/battleModeRules.ts')
assert.equal(rules.shouldTrackBattleIntegrity('casual', 'never'), false)
for (const difficulty of ['basic', 'intermediate', 'advanced']) assert(rules.shouldTrackBattleIntegrity('casual', difficulty))
assert.equal(rules.battleModeRules.casual.autoDefeatThreshold, null)
assert.equal(rules.battleModeRules.casual.editorLockDurationMs, 0)
const integrity = createLoader({}, { react: {}, 'react-router-dom': {} })('./src/hooks/useBattleIntegrity.ts')
let snapshot = { warningCount: 0, awaySessionOpen: false }
for (let i = 0; i < 3; i++) {
  snapshot = integrity.reduceBattleIntegritySnapshot(snapshot, 'exit', { active: true, trackingEnabled: true })
  const duplicate = integrity.reduceBattleIntegritySnapshot(snapshot, 'exit', { active: true, trackingEnabled: true })
  assert.equal(duplicate.warningCount, i + 1)
  snapshot = integrity.reduceBattleIntegritySnapshot(snapshot, 'return', { active: true, trackingEnabled: true })
}
assert.equal(snapshot.warningCount, 3)

const route = load('./src/routes/paths.ts')
assert.equal(route.roomPath('A/B'), '/batalha/sala/A%2FB')
assert.equal(route.publicProfilePath('a?b'), '/u/a%3Fb')
const frontendFiles = fs.readdirSync(new URL('../src/lib/', import.meta.url)).filter((name) => name.endsWith('.ts'))
for (const file of frontendFiles) {
  const text = fs.readFileSync(new URL(`../src/lib/${file}`, import.meta.url), 'utf8')
  assert(!/VITE_\w*(?:JUDGE|SERVICE_ROLE|RAPIDAPI)/.test(text), `Server secret in frontend: ${file}`)
}
console.log(`Product checks OK: ${lessons.length} lessons, ${bugs.length} bug references/broken cases, ${battles.length} battle references, ${Object.keys(lessonPractice).length} exact mappings, ${Object.keys(lessonChecks).length} concept checks, progress/search/continue/isolation/XP/achievements/integrity/routes.`)

if (process.argv.includes('--inventory')) {
  for (const path of paths) console.log(`${path.id} | ${path.lessons.map((l) => l.id).join(', ')}`)
  for (const bug of bugs) console.log(`${bug.id} | ${bug.title} | ${bug.difficulty}/${bug.codeSize} | ${bug.bugCount} issues | ${bug.brokenCode.split('\n').length} lines`)
}
