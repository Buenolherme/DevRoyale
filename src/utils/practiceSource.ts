import type { BattleLanguage } from '@/types'

/** Conservative reference comparison, not an interpreter or a competitive judge. */
export function normalizePracticeSource(source: string, language: BattleLanguage): string {
  const code = source.replace(/\r\n?/g, '\n').trim()
  if (language === 'html-css') return code
  const tokens = code.match(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\*[^]*?\*\/|\/\/[^\n]*|#[^\n]*|\n[ \t]*|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|==|!=|<=|>=|=>|\+\+|--|\*\*|&&|\|\||\+=|-=|\*=|\/=|:=|[^\s]/g) ?? []
  return JSON.stringify(tokens.map((token) => {
    // SQL double quotes are identifiers, not string delimiters. Never equate them.
    if (language !== 'sql' && /^(['"])[^\\\n]*\1$/.test(token) && !/^("""|''')/.test(token)) {
      return `literal:${token.slice(1, -1)}`
    }
    if (token.startsWith('\n') && language !== 'python') return '\n'
    return token
  }))
}
