import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Badge, Card } from '@/components/ui'
import type { BattleLanguage } from '@/types'
import {
  BattleOutcomeOverlay,
  type BattleOutcomeOverlayState,
} from './BattleOutcomeOverlay'
import {
  getBattleBracketMatch,
  getBattleEditorEdit,
  getBattleEditorShortcutAction,
  getLikelySyntaxErrorLine,
  type BattleEditorEdit,
} from './battleEditorBehavior'

const editorFilename: Record<BattleLanguage, string> = {
  python: 'solucao.py',
  javascript: 'solucao.js',
  sql: 'consulta.sql',
  'html-css': 'index.html',
}

const languageLabel: Record<BattleLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
  'html-css': 'HTML/CSS',
}

interface BattleEditorProps {
  language: BattleLanguage
  code: string
  challengeIndex: number
  challengeCount: number
  outcome: BattleOutcomeOverlayState | null
  isLocked: boolean
  validationMessage?: string
  onCodeChange: (code: string) => void
  onPasteBlocked?: () => void
}

type EditorSnapshot = BattleEditorEdit

const editorHistoryLimit = 300

export const BattleEditor = memo(function BattleEditor({
  language,
  code,
  challengeIndex,
  challengeCount,
  outcome,
  isLocked,
  validationMessage,
  onCodeChange,
  onPasteBlocked,
}: BattleEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const pendingSelectionRef = useRef<Pick<
    BattleEditorEdit,
    'selectionStart' | 'selectionEnd'
  > | null>(null)
  const historyRef = useRef<EditorSnapshot[]>([
    { value: code, selectionStart: 0, selectionEnd: 0 },
  ])
  const historyIndexRef = useRef(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [scrollOffset, setScrollOffset] = useState({ top: 0, left: 0 })
  const [editorMetrics, setEditorMetrics] = useState({
    lineHeight: 27.8,
    paddingTop: 24.8,
  })
  const lineCount = Math.max(code.split('\n').length, 1)
  const currentLine = code.slice(0, cursorPosition).split('\n').length
  const currentLineStart = code.lastIndexOf('\n', cursorPosition - 1) + 1
  const currentColumn = cursorPosition - currentLineStart + 1
  const bracketMatch = useMemo(
    () => getBattleBracketMatch(code, cursorPosition),
    [code, cursorPosition],
  )
  const errorLine = useMemo(
    () => validationMessage ? getLikelySyntaxErrorLine(code) : undefined,
    [code, validationMessage],
  )
  const mirroredCode = useMemo(() => {
    if (!bracketMatch) return code || ' '

    const { openingIndex, closingIndex } = bracketMatch

    return (
      <>
        {code.slice(0, openingIndex)}
        <mark>{code[openingIndex]}</mark>
        {code.slice(openingIndex + 1, closingIndex)}
        <mark>{code[closingIndex]}</mark>
        {code.slice(closingIndex + 1)}
      </>
    )
  }, [bracketMatch, code])

  useLayoutEffect(() => {
    const pendingSelection = pendingSelectionRef.current
    const editor = editorRef.current

    if (!editor) return

    if (pendingSelection) {
      editor.setSelectionRange(
        pendingSelection.selectionStart,
        pendingSelection.selectionEnd,
      )
      pendingSelectionRef.current = null
    }

    setCursorPosition(Math.min(editor.selectionStart, code.length))
    const computedStyle = window.getComputedStyle(editor)
    setEditorMetrics({
      lineHeight: Number.parseFloat(computedStyle.lineHeight) || 27.8,
      paddingTop: Number.parseFloat(computedStyle.paddingTop) || 24.8,
    })
  }, [code])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || typeof ResizeObserver === 'undefined') return

    const updateMetrics = () => {
      const computedStyle = window.getComputedStyle(editor)
      setEditorMetrics({
        lineHeight: Number.parseFloat(computedStyle.lineHeight) || 27.8,
        paddingTop: Number.parseFloat(computedStyle.paddingTop) || 24.8,
      })
    }
    const resizeObserver = new ResizeObserver(updateMetrics)
    resizeObserver.observe(editor)

    return () => resizeObserver.disconnect()
  }, [])

  const recordEditorSnapshot = (snapshot: EditorSnapshot) => {
    const history = historyRef.current.slice(0, historyIndexRef.current + 1)
    const currentSnapshot = history.at(-1)

    if (currentSnapshot?.value === snapshot.value) {
      history[history.length - 1] = snapshot
    } else {
      history.push(snapshot)
    }

    if (history.length > editorHistoryLimit) {
      history.shift()
    }

    historyRef.current = history
    historyIndexRef.current = history.length - 1
  }

  const applyEditorEdit = (
    editor: HTMLTextAreaElement,
    edit: BattleEditorEdit,
  ) => {
    if (edit.value === editor.value) {
      editor.setSelectionRange(edit.selectionStart, edit.selectionEnd)
      setCursorPosition(edit.selectionStart)
      return
    }

    pendingSelectionRef.current = {
      selectionStart: edit.selectionStart,
      selectionEnd: edit.selectionEnd,
    }
    recordEditorSnapshot(edit)
    onCodeChange(edit.value)
  }

  const restoreEditorHistory = (
    editor: HTMLTextAreaElement,
    direction: -1 | 1,
  ) => {
    const nextIndex = Math.min(
      Math.max(historyIndexRef.current + direction, 0),
      historyRef.current.length - 1,
    )
    const snapshot = historyRef.current[nextIndex]

    if (!snapshot) return

    historyIndexRef.current = nextIndex

    if (snapshot.value === editor.value) {
      editor.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd)
      setCursorPosition(snapshot.selectionStart)
      return
    }

    pendingSelectionRef.current = {
      selectionStart: snapshot.selectionStart,
      selectionEnd: snapshot.selectionEnd,
    }
    onCodeChange(snapshot.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLocked || event.nativeEvent.isComposing) return

    const usesAltGraph = event.getModifierState('AltGraph')
    const usesShortcutModifier = (event.ctrlKey || event.metaKey) && !usesAltGraph
    const shortcutAction = getBattleEditorShortcutAction({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      usesAltGraph,
    })

    if (usesShortcutModifier) {
      if (shortcutAction === 'block-paste') {
        event.preventDefault()
        onPasteBlocked?.()
        return
      }

      if (shortcutAction === 'undo' || shortcutAction === 'redo') {
        event.preventDefault()
        restoreEditorHistory(
          event.currentTarget,
          shortcutAction === 'undo' ? -1 : 1,
        )
      }

      return
    }

    if (event.altKey && !usesAltGraph) return

    const editor = event.currentTarget
    const edit = getBattleEditorEdit({
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
      key: event.key,
      shiftKey: event.shiftKey,
      language,
    })

    if (!edit) return

    event.preventDefault()
    applyEditorEdit(editor, edit)
  }

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const editor = event.currentTarget

    recordEditorSnapshot({
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
    })
    setCursorPosition(editor.selectionStart)
    onCodeChange(editor.value)
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!isLocked) {
      event.preventDefault()
      onPasteBlocked?.()
    }
  }

  const handleBeforeInput = (event: FormEvent<HTMLTextAreaElement>) => {
    const inputEvent = event.nativeEvent as InputEvent

    if (!isLocked && inputEvent.inputType === 'insertFromPaste') {
      event.preventDefault()
      onPasteBlocked?.()
    }
  }

  const handleCursorActivity = (event: FormEvent<HTMLTextAreaElement>) => {
    setCursorPosition(event.currentTarget.selectionStart)
  }

  const handleScroll = (event: FormEvent<HTMLTextAreaElement>) => {
    setScrollOffset({
      top: event.currentTarget.scrollTop,
      left: event.currentTarget.scrollLeft,
    })
  }

  return (
    <Card variant="premium" className="battle-editor-card p-0">
      <div className="battle-editor-card__crown" aria-hidden="true" />
      <div className="battle-editor-toolbar">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="battle-editor-dot battle-editor-dot--red" />
          <span className="battle-editor-dot battle-editor-dot--gold" />
          <span className="battle-editor-dot battle-editor-dot--muted" />
        </div>
        <div className="battle-editor-file">
          <span>Battle IDE</span>
          <strong className="battle-editor-filename">{editorFilename[language]}</strong>
        </div>
        <div className="battle-editor-toolbar__status">
          <span><i aria-hidden="true" /> Workspace ativo</span>
          <Badge variant="gold" className="normal-case tracking-normal">
            {languageLabel[language]}
          </Badge>
        </div>
      </div>

      <div className="battle-editor-stage">
        <label htmlFor="battle-code" className="sr-only">
          Código da solução
        </label>
        <div className="battle-code-shell">
          <div className="battle-editor-gutter" aria-hidden="true">
            <div
              className="battle-editor-gutter__content"
              style={{ transform: `translateY(-${scrollOffset.top}px)` }}
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <span
                  key={index}
                  className={index + 1 === currentLine ? 'battle-editor-gutter__line battle-editor-gutter__line--active' : 'battle-editor-gutter__line'}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>

          <div className="battle-code-editor-layer">
            <span
              className="battle-code-editor__current-line"
              style={{
                top: editorMetrics.paddingTop +
                  (currentLine - 1) * editorMetrics.lineHeight -
                  scrollOffset.top,
                height: editorMetrics.lineHeight,
              }}
              aria-hidden="true"
            />
            {errorLine && (
              <span
                className="battle-code-editor__error-line"
                style={{
                  top: editorMetrics.paddingTop +
                    (errorLine - 1) * editorMetrics.lineHeight -
                    scrollOffset.top,
                  height: editorMetrics.lineHeight,
                }}
                aria-hidden="true"
              />
            )}
            <pre
              className="battle-code-editor__mirror"
              style={{
                transform: `translate(${-scrollOffset.left}px, ${-scrollOffset.top}px)`,
              }}
              aria-hidden="true"
            >
              {mirroredCode}
            </pre>
            <textarea
              ref={editorRef}
              id="battle-code"
              className={`battle-code-editor ${isLocked ? 'battle-code-editor--locked' : ''}`}
              value={code}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleCursorActivity}
              onClick={handleCursorActivity}
              onSelect={handleCursorActivity}
              onScroll={handleScroll}
              onPaste={handlePaste}
              onBeforeInput={handleBeforeInput}
              placeholder="DIGITE SEU CÓDIGO AQUI"
              spellCheck={false}
              wrap="off"
              readOnly={isLocked}
              aria-readonly={isLocked}
              aria-describedby={errorLine ? 'battle-editor-note battle-editor-problem' : 'battle-editor-note'}
            />
          </div>
        </div>
        {outcome && (
          <BattleOutcomeOverlay outcome={outcome} visible animate />
        )}
      </div>

      <div className="battle-editor-footer">
        <div>
          <span className="battle-editor-footer__signal" aria-hidden="true" />
          <p id="battle-editor-note">Editor central da arena</p>
        </div>
        {errorLine && (
          <span id="battle-editor-problem" className="battle-editor-problem" role="status">
            Problema detectado próximo da linha {errorLine}
          </span>
        )}
        <span>
          Ln {currentLine}, Col {currentColumn} · Desafio {Math.max(challengeIndex + 1, 1)} de {challengeCount}
        </span>
      </div>
    </Card>
  )
})
