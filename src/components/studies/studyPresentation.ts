import type { StudyLevelId, StudyTopicId } from '@/types'

export const topicMarks: Record<StudyTopicId, string> = {
  python: 'PY',
  javascript: 'JS',
  'html-css': '</>',
  sql: 'SQL',
  'git-github': 'GIT',
  logic: '01',
  frontend: 'UI',
  backend: 'API',
}

export const levelPaces: Record<StudyLevelId, string> = {
  'never-coded': 'Começo guiado',
  basic: 'Fundamentos + prática',
  intermediate: 'Aplicação e decisões',
  advanced: 'Profundidade e arquitetura',
}

export const levelFocus: Record<StudyLevelId, string> = {
  'never-coded': 'Entenda cada termo e teste uma ideia por vez, sem pressa.',
  basic: 'Conecte os fundamentos e explique o motivo de cada decisão.',
  intermediate: 'Compare alternativas e pratique organização e legibilidade.',
  advanced: 'Analise trade-offs, manutenção, desempenho e impacto no sistema.',
}
