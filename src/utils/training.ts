import { studyLearningPaths, studyLevelOptions, studyTopicOptions } from '@/data/studyLearningPaths'
import { lessonPractice } from '@/data/trainingCatalog'
import type { StudyLearningPath, StudyLesson, StudyLevelId } from '@/types'
import { getStudyCompletionKey } from './studyHistory'

export interface TrainingVisit { pathId: string; lessonId: string }
export interface TrainingWorkspace {
  visited: TrainingVisit | null
  favorites: string[]
  projectChecks: string[]
  failure: { lessonId: string; source: 'bug' | 'battle' } | null
}
export type TrainingFilter = 'all' | 'progress' | 'completed' | 'new' | 'favorites'
export const trainingLessons = studyLearningPaths.flatMap((path) => path.lessons.map((lesson) => ({ path, lesson })))
export function lessonKey(path: StudyLearningPath, lesson: StudyLesson) {
  return getStudyCompletionKey({ topicId: path.topicId, levelId: path.levelId, lessonId: lesson.id })
}
export function trainingProgress(paths: StudyLearningPath[], completed: ReadonlySet<string>) {
  const keys = new Set(paths.flatMap((path) => path.lessons.map((lesson) => lessonKey(path, lesson))))
  const done = [...keys].filter((key) => completed.has(key)).length
  return { done, total: keys.size, percent: keys.size ? Math.min(100, Math.round(done / keys.size * 100)) : 0 }
}
export function modulePrerequisite(path: StudyLearningPath) {
  const index = studyLevelOptions.findIndex((level) => level.id === path.levelId)
  return studyLearningPaths.find((entry) => entry.topicId === path.topicId && entry.levelId === studyLevelOptions[index - 1]?.id) ?? null
}
export function normalizeTrainingSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
export function searchTraining(query: string, completed: ReadonlySet<string>, filter: TrainingFilter = 'all', favorites: string[] = [], level?: StudyLevelId) {
  const terms = normalizeTrainingSearch(query).split(/\s+/).filter(Boolean)
  return trainingLessons.filter(({ path, lesson }) => {
    if (level && path.levelId !== level) return false
    const progress = trainingProgress([path], completed)
    if (filter === 'completed' && !completed.has(lessonKey(path, lesson))) return false
    if (filter === 'new' && progress.done !== 0) return false
    if (filter === 'progress' && !(progress.done > 0 && progress.done < progress.total)) return false
    if (filter === 'favorites' && !favorites.includes(lesson.id)) return false
    const text = normalizeTrainingSearch([path.title, studyTopicOptions.find((t) => t.id === path.topicId)?.label, lesson.title, lesson.lessonTheme, lesson.explanation, lesson.codeExample.code].join(' '))
    return terms.every((term) => text.includes(term))
  })
}
export function continueTraining(visited: TrainingVisit | null, completed: ReadonlySet<string>, fallbackPathId?: string) {
  const path = studyLearningPaths.find((p) => p.id === visited?.pathId || (!visited && p.id === fallbackPathId))
  if (path) {
    const lesson = path.lessons.find((l) => l.id === visited?.lessonId && !completed.has(lessonKey(path, l)))
      ?? path.lessons.find((l) => !completed.has(lessonKey(path, l)))
    if (lesson) return { path, lesson }
    const ordered = studyLearningPaths.filter((p) => p.topicId === path.topicId).sort((a, b) => studyLevelOptions.findIndex((l) => l.id === a.levelId) - studyLevelOptions.findIndex((l) => l.id === b.levelId))
    for (const module of ordered) {
      const next = module.lessons.find((l) => !completed.has(lessonKey(module, l)))
      if (next) return { path: module, lesson: next }
    }
  }
  return null
}
export function recommendTraining(workspace: TrainingWorkspace, completed: ReadonlySet<string>, level: StudyLevelId = 'never-coded') {
  const review = trainingLessons.find(({ lesson }) => lesson.id === workspace.failure?.lessonId)
  if (review) return { ...review, reason: `Revisão sugerida após uma tentativa incorreta na ${workspace.failure?.source === 'bug' ? 'Bug Arena' : 'Batalha Casual'}. Regra local, sem IA.` }
  const next = continueTraining(workspace.visited, completed)
  if (next) return { ...next, reason: 'Próxima aula não concluída do curso que você visitou.' }
  const pending = trainingLessons.find(({ path, lesson }) => path.levelId === level && !completed.has(lessonKey(path, lesson)))
    ?? trainingLessons.find(({ path, lesson }) => !completed.has(lessonKey(path, lesson)))
  return pending ? { ...pending, reason: 'Conteúdo não concluído, considerando o nível declarado quando disponível.' } : null
}
function workspaceKey(userId?: string | null) { return `devroyale_training_workspace_v2:${userId || 'guest'}` }
export function readTrainingWorkspace(userId?: string | null): TrainingWorkspace {
  const empty: TrainingWorkspace = { visited: null, favorites: [], projectChecks: [], failure: null }
  try {
    const raw = JSON.parse(localStorage.getItem(workspaceKey(userId)) || 'null') as Partial<TrainingWorkspace> | null
    if (!raw || typeof raw !== 'object') return empty
    const visited = trainingLessons.find(({ path, lesson }) => path.id === raw.visited?.pathId && lesson.id === raw.visited?.lessonId)
    const failure = trainingLessons.some(({ lesson }) => lesson.id === raw.failure?.lessonId) && ['bug', 'battle'].includes(raw.failure?.source ?? '') ? raw.failure! : null
    return {
      visited: visited ? { pathId: visited.path.id, lessonId: visited.lesson.id } : null,
      favorites: Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter((id) => trainingLessons.some(({ lesson }) => lesson.id === id)))] : [],
      projectChecks: Array.isArray(raw.projectChecks) ? [...new Set(raw.projectChecks.filter((id): id is string => typeof id === 'string'))] : [],
      failure,
    }
  } catch { return empty }
}
export function saveTrainingWorkspace(userId: string | null | undefined, value: TrainingWorkspace): boolean {
  try { localStorage.setItem(workspaceKey(userId), JSON.stringify(value)); return true } catch { return false }
}
export function recordPracticeFailure(userId: string | null | undefined, source: 'bug' | 'battle', id: string) {
  const match = Object.entries(lessonPractice).find(([, practice]) => (source === 'bug' ? practice.bugId : practice.battleId) === id)
  if (match) saveTrainingWorkspace(userId, { ...readTrainingWorkspace(userId), failure: { lessonId: match[0], source } })
}
export function trainingUrl(path: StudyLearningPath, lesson?: StudyLesson) {
  return `/area-estudos?topic=${path.topicId}&level=${path.levelId}${lesson ? `&lesson=${encodeURIComponent(lesson.id)}` : ''}`
}
