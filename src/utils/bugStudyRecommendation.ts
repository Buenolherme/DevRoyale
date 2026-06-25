import type {
  Bug,
  BugDifficulty,
  BugLanguage,
  StudyHistoryRecord,
  StudyLevelId,
  StudyTopicId,
} from '@/types'
import { getStudyHistoryByUser } from './studyHistory'

export type BugTrainingCategory =
  | 'syntax'
  | 'variables'
  | 'strings'
  | 'conditionals'
  | 'loops'
  | 'functions'
  | 'collections'
  | 'logic'
  | 'queries'
  | 'structure'
  | 'styles'

export interface BugStudyRecommendation {
  hasHistory: boolean
  latestStudy: StudyHistoryRecord | null
  latestTopic: StudyTopicId | null
  latestLevel: StudyLevelId | null
  completedLessonIds: string[]
  completedThemes: string[]
  recurringThemes: string[]
  reinforcementPoints: string[]
  bugLanguage: BugLanguage | null
  bugDifficulty: BugDifficulty
  categories: BugTrainingCategory[]
  categoryLabels: string[]
  suggestedLanguage: BugLanguage | null
  suggestedDifficulty: BugDifficulty
  suggestedThemes: string[]
  scoutMessage: string
  reason: string
  message: string
}

const categoryLabels: Record<BugTrainingCategory, string> = {
  syntax: 'sintaxe',
  variables: 'variáveis',
  strings: 'strings',
  conditionals: 'condicionais',
  loops: 'laços de repetição',
  functions: 'funções',
  collections: 'listas e coleções',
  logic: 'lógica simples',
  queries: 'consultas e filtros',
  structure: 'estrutura de página',
  styles: 'estilos e layout',
}

const categoryKeywords: Record<BugTrainingCategory, string[]> = {
  syntax: ['sintaxe', 'syntax', 'print', 'console', 'pontuacao', 'aspas'],
  variables: ['variavel', 'variable', 'atribuicao', 'valor', 'contador'],
  strings: ['string', 'texto', 'frase', 'concaten', 'aspas'],
  conditionals: ['condicional', 'condition', 'if', 'else', 'comparacao', 'boolean'],
  loops: ['loop', 'laco', 'repeticao', 'for', 'while', 'contador'],
  functions: ['funcao', 'function', 'retorno', 'return', 'parametro'],
  collections: ['lista', 'array', 'colecao', 'filter', 'map', 'item'],
  logic: ['logica', 'algoritmo', 'sequencia', 'regra', 'operador'],
  queries: ['sql', 'consulta', 'query', 'select', 'where', 'filtro', 'tabela'],
  structure: ['html', 'estrutura', 'semantica', 'tag', 'elemento'],
  styles: ['css', 'estilo', 'layout', 'flex', 'grid', 'seletor'],
}

const topicLanguage: Partial<Record<StudyTopicId, BugLanguage>> = {
  python: 'python',
  javascript: 'javascript',
  sql: 'sql',
  'html-css': 'html-css',
  frontend: 'html-css',
  backend: 'javascript',
}

const topicDefaults: Record<StudyTopicId, BugTrainingCategory[]> = {
  python: ['syntax', 'variables', 'strings', 'logic'],
  javascript: ['syntax', 'variables', 'functions', 'logic'],
  'html-css': ['structure', 'styles'],
  sql: ['queries', 'logic'],
  'git-github': ['logic'],
  logic: ['variables', 'conditionals', 'logic'],
  frontend: ['structure', 'styles', 'logic'],
  backend: ['functions', 'conditionals', 'logic'],
}

const difficultyOrder: BugDifficulty[] = ['never', 'basic', 'intermediate', 'advanced']

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function getRecurringThemes(history: StudyHistoryRecord[]): string[] {
  const counts = new Map<string, { label: string; count: number; firstIndex: number }>()

  history.forEach((record, index) => {
    const key = normalizeText(record.lessonTheme.trim())
    if (!key) return

    const current = counts.get(key)
    counts.set(key, {
      label: current?.label ?? record.lessonTheme.trim(),
      count: (current?.count ?? 0) + 1,
      firstIndex: current?.firstIndex ?? index,
    })
  })

  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)
    .map((item) => item.label)
}

function inferCategories(history: StudyHistoryRecord[]): BugTrainingCategory[] {
  const recentHistory = history.slice(0, 6)
  const scores = new Map<BugTrainingCategory, number>()

  recentHistory.forEach((record, index) => {
    const recencyWeight = Math.max(1, 3 - Math.floor(index / 2))
    const sources = [
      { text: `${record.lessonTitle} ${record.lessonTheme}`, weight: recencyWeight },
      { text: record.strengths.join(' '), weight: 1 },
      { text: record.reinforcements.join(' '), weight: 4 },
    ]

    ;(Object.keys(categoryKeywords) as BugTrainingCategory[]).forEach((category) => {
      sources.forEach(({ text, weight }) => {
        const normalizedSource = normalizeText(text)
        if (categoryKeywords[category].some((keyword) => normalizedSource.includes(keyword))) {
          scores.set(category, (scores.get(category) ?? 0) + weight)
        }
      })
    })
  })

  const latestTopic = recentHistory[0]?.topicId
  if (latestTopic) {
    topicDefaults[latestTopic].forEach((category) => {
      scores.set(category, (scores.get(category) ?? 0) + 1)
    })
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category]) => category)
    .slice(0, 5)
}

function inferDifficulty(level: StudyLevelId, categories: BugTrainingCategory[]): BugDifficulty {
  if (level === 'never-coded') {
    return categories.includes('conditionals') || categories.includes('loops') ? 'basic' : 'never'
  }

  if (level === 'basic') return 'basic'
  if (level === 'intermediate') return 'intermediate'
  return 'advanced'
}

export function buildBugStudyRecommendation(
  history: StudyHistoryRecord[],
): BugStudyRecommendation {
  const orderedHistory = [...history].sort(
    (left, right) =>
      new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime(),
  )
  const latestStudy = orderedHistory[0] ?? null

  if (!latestStudy) {
    return {
      hasHistory: false,
      latestStudy: null,
      latestTopic: null,
      latestLevel: null,
      completedLessonIds: [],
      completedThemes: [],
      recurringThemes: [],
      reinforcementPoints: [],
      bugLanguage: null,
      bugDifficulty: 'never',
      categories: [],
      categoryLabels: [],
      suggestedLanguage: null,
      suggestedDifficulty: 'never',
      suggestedThemes: [],
      scoutMessage:
        'Você ainda não tem histórico de estudos. Use os filtros abaixo ou escolha um bug novo aleatório.',
      reason: 'Nenhum histórico de aulas concluídas foi encontrado para este usuário.',
      message:
        'Você ainda não tem histórico de estudos. Use os filtros abaixo ou escolha um bug novo aleatório.',
    }
  }

  const categories = inferCategories(orderedHistory)
  const labels = categories.map((category) => categoryLabels[category])
  const suggestedThemes = labels.slice(0, 4)
  const focus = suggestedThemes.slice(0, 2).join(' e ')
  const recurringThemes = getRecurringThemes(orderedHistory)
  const reinforcementPoints = uniqueValues(
    orderedHistory.flatMap((record) => record.reinforcements),
  )
  const suggestedLanguage = topicLanguage[latestStudy.topicId] ?? null
  const suggestedDifficulty = inferDifficulty(latestStudy.levelId, categories)
  const scoutMessage = `Você estudou ${latestStudy.topicLabel} no nível ${latestStudy.levelLabel}. Quer treinar bugs relacionados a ${focus || latestStudy.lessonTheme}?`
  const reasonDetails = reinforcementPoints.length
    ? ` com prioridade para os pontos a reforçar: ${reinforcementPoints.slice(0, 2).join(' e ')}`
    : ` com foco recorrente em ${recurringThemes.slice(0, 2).join(' e ') || latestStudy.lessonTheme}`

  return {
    hasHistory: true,
    latestStudy,
    latestTopic: latestStudy.topicId,
    latestLevel: latestStudy.levelId,
    completedLessonIds: uniqueValues(orderedHistory.map((record) => record.lessonId)),
    completedThemes: uniqueValues(orderedHistory.map((record) => record.lessonTheme)),
    recurringThemes,
    reinforcementPoints,
    bugLanguage: suggestedLanguage,
    bugDifficulty: suggestedDifficulty,
    categories,
    categoryLabels: labels,
    suggestedLanguage,
    suggestedDifficulty,
    suggestedThemes,
    scoutMessage,
    reason: `Baseada na última aula “${latestStudy.lessonTitle}”, no nível ${latestStudy.levelLabel},${reasonDetails}.`,
    message: scoutMessage,
  }
}

export function getBugStudyRecommendation(userId?: string | null): BugStudyRecommendation {
  return buildBugStudyRecommendation(getStudyHistoryByUser(userId))
}

export function findRecommendedBug(
  bugs: Bug[],
  recommendation: BugStudyRecommendation,
): Bug | null {
  if (!bugs.length) return null

  const sameLanguage = recommendation.bugLanguage
    ? bugs.filter((bug) => bug.language === recommendation.bugLanguage)
    : []
  const candidates = sameLanguage.length ? sameLanguage : bugs

  return candidates
    .map((bug, index) => {
      const searchableText = normalizeText(
        [
          bug.title,
          bug.description,
          bug.hint,
          bug.explanation,
          ...bug.topics,
          ...bug.tags,
          ...bug.bugExplanations,
        ].join(' '),
      )
      const categoryScore = recommendation.categories.reduce(
        (score, category) =>
          score +
          (categoryKeywords[category].some((keyword) => searchableText.includes(keyword)) ? 4 : 0),
        0,
      )
      const difficultyDistance = Math.abs(
        difficultyOrder.indexOf(bug.difficulty) -
          difficultyOrder.indexOf(recommendation.bugDifficulty),
      )

      return {
        bug,
        index,
        score: categoryScore + (difficultyDistance === 0 ? 8 : Math.max(0, 3 - difficultyDistance)),
      }
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.bug ?? null
}
