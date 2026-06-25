import type { BugLanguage } from '@/types'

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

export function normalizeBugFix(code: string, language: BugLanguage): string {
  const normalizedQuotes = normalizeQuotes(code)
  const normalizedLanguage =
    language === 'html-css' ? normalizeHtmlCss(normalizedQuotes) : normalizedQuotes

  return normalizeWhitespace(normalizedLanguage)
}

export function validateBugFix(
  userFix: string,
  expectedFix: string,
  language: BugLanguage,
): boolean {
  return normalizeBugFix(userFix, language) === normalizeBugFix(expectedFix, language)
}
