import { DEVROYALE_VERSION } from '@/config/appMeta'

export const battleProblemCategories = [
  'Minha solução parece correta, mas foi rejeitada',
  'Enunciado confuso',
  'Dica não ajudou',
  'Problema visual',
  'Problema no editor',
  'Problema de integridade',
  'Outro',
] as const

export type BattleProblemCategory = (typeof battleProblemCategories)[number]

export interface BattleProblemContext {
  challengeId: string
  challengeTitle: string
  language: string
  difficulty: string
}

interface BuildBattleProblemReportOptions {
  context: BattleProblemContext
  category: BattleProblemCategory
  description: string
  browser: string
  includeCode?: boolean
  code?: string
}

export function getBasicBrowserName(userAgent = ''): string {
  if (!userAgent) return 'Não identificado'
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge'
  if (/OPR\//i.test(userAgent)) return 'Opera'
  if (/Firefox\//i.test(userAgent)) return 'Firefox'
  if (/Chrome\//i.test(userAgent)) return 'Google Chrome'
  if (/Safari\//i.test(userAgent)) return 'Safari'
  return 'Outro navegador'
}

export function buildBattleProblemReport({
  context,
  category,
  description,
  browser,
  includeCode = false,
  code = '',
}: BuildBattleProblemReportOptions): string {
  const reportLines = [
    'DEVROYALE — RELATÓRIO DE PROBLEMA',
    '',
    `Desafio: ${context.challengeTitle}`,
    `challengeId: ${context.challengeId}`,
    `Linguagem: ${context.language}`,
    `Dificuldade: ${context.difficulty}`,
    `Categoria: ${category}`,
    `Descrição: ${description.trim() || 'Não informada'}`,
    `Versão: ${DEVROYALE_VERSION}`,
    `Navegador: ${browser}`,
  ]

  if (includeCode) {
    reportLines.push('', 'Código incluído com autorização explícita:', '```', code, '```')
  } else {
    reportLines.push('', 'Código do editor: não incluído')
  }

  return reportLines.join('\n')
}
