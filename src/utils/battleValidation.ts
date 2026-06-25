import type { BattleLanguage } from '@/types'

function normalizeQuotes(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/["']/g, '"')
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .trim()
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeHtmlCss(value: string): string {
  return value
    .replace(/>\s+</g, '><')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .replace(/<\s+/g, '<')
    .replace(/\s+>/g, '>')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
}

export function normalizeBattleAnswer(answer: string, language: BattleLanguage): string {
  const withNormalizedQuotes = normalizeQuotes(answer)
  const languageNormalized =
    language === 'html-css' ? normalizeHtmlCss(withNormalizedQuotes) : withNormalizedQuotes

  return normalizeWhitespace(languageNormalized)
}

export function validateBattleAnswer(
  answer: string,
  expectedAnswer: string,
  language: BattleLanguage,
): boolean {
  return (
    normalizeBattleAnswer(answer, language) ===
    normalizeBattleAnswer(expectedAnswer, language)
  )
}
