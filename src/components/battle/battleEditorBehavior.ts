import type { BattleLanguage } from '@/types'

const openingPairs = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
} as const

const closingCharacters = new Set<string>(Object.values(openingPairs))

const indentationByLanguage: Record<BattleLanguage, string> = {
  python: '    ',
  javascript: '  ',
  sql: '  ',
  'html-css': '  ',
}

const htmlVoidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const structuralPairs = {
  '(': ')',
  '[': ']',
  '{': '}',
} as const

const structuralClosings: Record<string, keyof typeof structuralPairs> = {
  ')': '(',
  ']': '[',
  '}': '{',
}

export interface BattleEditorKeyInput {
  value: string
  selectionStart: number
  selectionEnd: number
  key: string
  shiftKey?: boolean
  language: BattleLanguage
}

export interface BattleEditorEdit {
  value: string
  selectionStart: number
  selectionEnd: number
}

export interface BattleBracketMatch {
  openingIndex: number
  closingIndex: number
}

export type BattleEditorShortcutAction = 'block-paste' | 'undo' | 'redo'

interface BattleEditorShortcutInput {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  usesAltGraph: boolean
}

export function getBattleEditorIndentation(language: BattleLanguage): string {
  return indentationByLanguage[language]
}

export function getBattleEditorShortcutAction({
  key,
  ctrlKey,
  metaKey,
  shiftKey,
  usesAltGraph,
}: BattleEditorShortcutInput): BattleEditorShortcutAction | null {
  if ((!ctrlKey && !metaKey) || usesAltGraph) return null

  const lowerKey = key.toLowerCase()

  if (lowerKey === 'v') return 'block-paste'
  if (lowerKey === 'z' && !shiftKey) return 'undo'
  if (lowerKey === 'y' || (lowerKey === 'z' && shiftKey)) return 'redo'

  return null
}

function findClosingBracket(
  value: string,
  openingIndex: number,
  opening: keyof typeof structuralPairs,
): number | undefined {
  const closing = structuralPairs[opening]
  let depth = 0

  for (let index = openingIndex; index < value.length; index += 1) {
    if (value[index] === opening) depth += 1
    if (value[index] === closing) depth -= 1
    if (depth === 0) return index
  }

  return undefined
}

function findOpeningBracket(
  value: string,
  closingIndex: number,
  closing: string,
): number | undefined {
  const opening = structuralClosings[closing]
  if (!opening) return undefined

  let depth = 0

  for (let index = closingIndex; index >= 0; index -= 1) {
    if (value[index] === closing) depth += 1
    if (value[index] === opening) depth -= 1
    if (depth === 0) return index
  }

  return undefined
}

function getAdjacentBracketMatch(
  value: string,
  index: number,
): BattleBracketMatch | undefined {
  const character = value[index]

  if (character in structuralPairs) {
    const opening = character as keyof typeof structuralPairs
    const closingIndex = findClosingBracket(value, index, opening)

    return closingIndex === undefined
      ? undefined
      : { openingIndex: index, closingIndex }
  }

  if (character in structuralClosings) {
    const openingIndex = findOpeningBracket(value, index, character)

    return openingIndex === undefined
      ? undefined
      : { openingIndex, closingIndex: index }
  }

  return undefined
}

export function getBattleBracketMatch(
  value: string,
  cursorPosition: number,
): BattleBracketMatch | null {
  for (const candidateIndex of [cursorPosition, cursorPosition - 1]) {
    if (candidateIndex < 0 || candidateIndex >= value.length) continue

    const adjacentMatch = getAdjacentBracketMatch(value, candidateIndex)
    if (adjacentMatch) return adjacentMatch
  }

  for (let index = cursorPosition - 1; index >= 0; index -= 1) {
    const character = value[index]
    if (!(character in structuralPairs)) continue

    const closingIndex = findClosingBracket(
      value,
      index,
      character as keyof typeof structuralPairs,
    )

    if (closingIndex !== undefined && closingIndex >= cursorPosition) {
      return { openingIndex: index, closingIndex }
    }
  }

  return null
}

export function getLikelySyntaxErrorLine(value: string): number | undefined {
  const stack: Array<{ character: keyof typeof structuralPairs; line: number }> = []
  let activeQuote: '"' | "'" | '`' | null = null
  let quoteLine = 1
  let line = 1

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (character === '\n') {
      line += 1
      continue
    }

    if (activeQuote) {
      if (character === activeQuote && !isEscaped(value, index)) {
        activeQuote = null
      }
      continue
    }

    if (character === '"' || character === "'" || character === '`') {
      activeQuote = character
      quoteLine = line
      continue
    }

    if (character in structuralPairs) {
      stack.push({
        character: character as keyof typeof structuralPairs,
        line,
      })
      continue
    }

    if (character in structuralClosings) {
      const expectedOpening = structuralClosings[character]
      const currentOpening = stack.at(-1)

      if (!currentOpening || currentOpening.character !== expectedOpening) {
        return line
      }

      stack.pop()
    }
  }

  if (activeQuote) return quoteLine
  return stack.at(-1)?.line
}

function isEscaped(value: string, position: number): boolean {
  let backslashCount = 0

  for (let index = position - 1; index >= 0 && value[index] === '\\'; index -= 1) {
    backslashCount += 1
  }

  return backslashCount % 2 === 1
}

function getLineStart(value: string, position: number): number {
  return value.lastIndexOf('\n', position - 1) + 1
}

function getSelectedLineRange(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { start: number; end: number } {
  const start = getLineStart(value, selectionStart)
  const effectiveEnd =
    selectionEnd > selectionStart && value[selectionEnd - 1] === '\n'
      ? selectionEnd - 1
      : selectionEnd
  const nextLineBreak = value.indexOf('\n', effectiveEnd)

  return {
    start,
    end: nextLineBreak === -1 ? value.length : nextLineBreak,
  }
}

function getLeadingIndentRemoval(line: string, indentation: string): number {
  if (line.startsWith('\t')) return 1

  const leadingSpaces = line.match(/^ +/)?.[0].length ?? 0
  return Math.min(leadingSpaces, indentation.length)
}

function indentSelection(input: BattleEditorKeyInput): BattleEditorEdit {
  const { value, selectionStart, selectionEnd, language } = input
  const indentation = getBattleEditorIndentation(language)

  if (selectionStart === selectionEnd) {
    return {
      value: `${value.slice(0, selectionStart)}${indentation}${value.slice(selectionEnd)}`,
      selectionStart: selectionStart + indentation.length,
      selectionEnd: selectionStart + indentation.length,
    }
  }

  const range = getSelectedLineRange(value, selectionStart, selectionEnd)
  const selectedLines = value.slice(range.start, range.end).split('\n')
  const indentedBlock = selectedLines
    .map((line) => `${indentation}${line}`)
    .join('\n')
  const insertedCharacters = indentation.length * selectedLines.length

  return {
    value: `${value.slice(0, range.start)}${indentedBlock}${value.slice(range.end)}`,
    selectionStart: selectionStart + indentation.length,
    selectionEnd: selectionEnd + insertedCharacters,
  }
}

function outdentSelection(input: BattleEditorKeyInput): BattleEditorEdit {
  const { value, selectionStart, selectionEnd, language } = input
  const indentation = getBattleEditorIndentation(language)

  if (selectionStart === selectionEnd) {
    const lineStart = getLineStart(value, selectionStart)
    const lineEnd = value.indexOf('\n', lineStart)
    const resolvedLineEnd = lineEnd === -1 ? value.length : lineEnd
    const line = value.slice(lineStart, resolvedLineEnd)
    const removedCharacters = getLeadingIndentRemoval(line, indentation)

    if (removedCharacters === 0) {
      return { value, selectionStart, selectionEnd }
    }

    const nextCursor = Math.max(
      lineStart,
      selectionStart - Math.min(removedCharacters, selectionStart - lineStart),
    )

    return {
      value: `${value.slice(0, lineStart)}${value.slice(lineStart + removedCharacters)}`,
      selectionStart: nextCursor,
      selectionEnd: nextCursor,
    }
  }

  const range = getSelectedLineRange(value, selectionStart, selectionEnd)
  const selectedLines = value.slice(range.start, range.end).split('\n')
  const removals = selectedLines.map((line) => getLeadingIndentRemoval(line, indentation))
  const outdentedBlock = selectedLines
    .map((line, index) => line.slice(removals[index]))
    .join('\n')
  const removedCharacters = removals.reduce((total, count) => total + count, 0)
  const firstLineRemovalBeforeSelection = Math.min(
    removals[0] ?? 0,
    Math.max(selectionStart - range.start, 0),
  )

  return {
    value: `${value.slice(0, range.start)}${outdentedBlock}${value.slice(range.end)}`,
    selectionStart: selectionStart - firstLineRemovalBeforeSelection,
    selectionEnd: Math.max(
      selectionStart - firstLineRemovalBeforeSelection,
      selectionEnd - removedCharacters,
    ),
  }
}

function getHtmlOpeningTag(lineBeforeCursor: string): string | undefined {
  const match = lineBeforeCursor.match(/<([a-z][\w-]*)(?:\s[^<>]*)?>$/i)
  const tagName = match?.[1]?.toLowerCase()

  if (!tagName || htmlVoidElements.has(tagName)) return undefined

  return tagName
}

function insertLineBreak(input: BattleEditorKeyInput): BattleEditorEdit {
  const { value, selectionStart, selectionEnd, language } = input
  const indentation = getBattleEditorIndentation(language)
  const beforeCursor = value.slice(0, selectionStart)
  const afterCursor = value.slice(selectionEnd)
  const lineStart = getLineStart(value, selectionStart)
  const lineBeforeCursor = beforeCursor.slice(lineStart)
  const baseIndentation = lineBeforeCursor.match(/^[\t ]*/)?.[0] ?? ''
  const trimmedLine = lineBeforeCursor.trimEnd()
  const lastCharacter = trimmedLine.at(-1)
  const pairedClosing = lastCharacter
    ? openingPairs[lastCharacter as keyof typeof openingPairs]
    : undefined
  const htmlOpeningTag =
    language === 'html-css' ? getHtmlOpeningTag(trimmedLine) : undefined
  const isBetweenMatchingHtmlTags = Boolean(
    htmlOpeningTag && afterCursor.trimStart().startsWith(`</${htmlOpeningTag}>`),
  )
  const isBetweenPair = Boolean(pairedClosing && afterCursor.startsWith(pairedClosing))
  const opensIndentedBlock =
    (language === 'python' && trimmedLine.endsWith(':')) ||
    lastCharacter === '{' ||
    lastCharacter === '[' ||
    lastCharacter === '(' ||
    Boolean(htmlOpeningTag)
  const innerIndentation = opensIndentedBlock ? indentation : ''

  if (isBetweenPair || isBetweenMatchingHtmlTags) {
    const insertion = `\n${baseIndentation}${innerIndentation}\n${baseIndentation}`
    const cursor = selectionStart + 1 + baseIndentation.length + innerIndentation.length

    return {
      value: `${beforeCursor}${insertion}${afterCursor}`,
      selectionStart: cursor,
      selectionEnd: cursor,
    }
  }

  const insertion = `\n${baseIndentation}${innerIndentation}`
  const cursor = selectionStart + insertion.length

  return {
    value: `${beforeCursor}${insertion}${afterCursor}`,
    selectionStart: cursor,
    selectionEnd: cursor,
  }
}

export function getBattleEditorEdit(
  input: BattleEditorKeyInput,
): BattleEditorEdit | null {
  const { value, selectionStart, selectionEnd, key, shiftKey = false } = input

  if (key === 'Tab') {
    return shiftKey ? outdentSelection(input) : indentSelection(input)
  }

  if (key === 'Enter') {
    return insertLineBreak(input)
  }

  if (key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
    const openingCharacter = value[selectionStart - 1] as keyof typeof openingPairs
    const closingCharacter = value[selectionStart]

    if (openingPairs[openingCharacter] === closingCharacter) {
      const nextCursor = selectionStart - 1

      return {
        value: `${value.slice(0, nextCursor)}${value.slice(selectionStart + 1)}`,
        selectionStart: nextCursor,
        selectionEnd: nextCursor,
      }
    }
  }

  if (key in openingPairs) {
    const closingCharacter = openingPairs[key as keyof typeof openingPairs]

    if (selectionStart !== selectionEnd) {
      return {
        value: `${value.slice(0, selectionStart)}${key}${value.slice(selectionStart, selectionEnd)}${closingCharacter}${value.slice(selectionEnd)}`,
        selectionStart: selectionStart + 1,
        selectionEnd: selectionEnd + 1,
      }
    }

    if (key === closingCharacter && value[selectionStart] === key) {
      return {
        value,
        selectionStart: selectionStart + 1,
        selectionEnd: selectionStart + 1,
      }
    }

    if ((key === '"' || key === "'" || key === '`') && isEscaped(value, selectionStart)) {
      return null
    }

    return {
      value: `${value.slice(0, selectionStart)}${key}${closingCharacter}${value.slice(selectionEnd)}`,
      selectionStart: selectionStart + 1,
      selectionEnd: selectionStart + 1,
    }
  }

  if (
    closingCharacters.has(key) &&
    selectionStart === selectionEnd &&
    value[selectionStart] === key
  ) {
    return {
      value,
      selectionStart: selectionStart + 1,
      selectionEnd: selectionStart + 1,
    }
  }

  return null
}
