import type { ProgressAchievementDefinition, StudyLevelId } from '@/types'

export const STUDY_LESSON_XP_BY_LEVEL: Record<StudyLevelId, number> = {
  'never-coded': 10,
  basic: 15,
  intermediate: 25,
  advanced: 35,
}

export const PROGRESS_ACHIEVEMENTS: ProgressAchievementDefinition[] = [
  {
    id: 'first-code',
    name: 'Primeiro Código',
    description: 'Conclua sua primeira aula, bug ou batalha.',
    rarity: 'common',
    condition: {
      metric: 'total-completions',
      target: 1,
      label: 'Concluir 1 atividade',
    },
  },
  {
    id: 'arena-student',
    name: 'Estudante da Arena',
    description: 'Conclua 3 aulas na Área dos Estudos.',
    rarity: 'rare',
    condition: {
      metric: 'completed-lessons',
      target: 3,
      label: 'Concluir 3 aulas',
    },
  },
  {
    id: 'bug-hunter',
    name: 'Caçador de Bugs',
    description: 'Corrija 5 desafios diferentes na Bug Arena.',
    rarity: 'rare',
    condition: {
      metric: 'completed-bugs',
      target: 5,
      label: 'Corrigir 5 bugs',
    },
  },
  {
    id: 'dev-gladiator',
    name: 'Gladiador Dev',
    description: 'Vença 5 desafios diferentes na Batalha de Devs.',
    rarity: 'epic',
    condition: {
      metric: 'won-battles',
      target: 5,
      label: 'Vencer 5 batalhas',
    },
  },
  {
    id: 'persistent',
    name: 'Persistente',
    description: 'Acumule 500 XP no progresso central.',
    rarity: 'epic',
    condition: {
      metric: 'total-xp',
      target: 500,
      label: 'Acumular 500 XP',
    },
  },
  {
    id: 'king-in-training',
    name: 'Rei em Treinamento',
    description: 'Alcance o nível 5 no DevRoyale.',
    rarity: 'legendary',
    condition: {
      metric: 'level',
      target: 5,
      label: 'Alcançar o nível 5',
    },
  },
]
