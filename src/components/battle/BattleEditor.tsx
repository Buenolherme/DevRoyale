import { memo, type ChangeEvent } from 'react'
import { Badge, Card } from '@/components/ui'
import type { BattleLanguage } from '@/types'
import {
  BattleOutcomeOverlay,
  type BattleOutcomeOverlayState,
} from './BattleOutcomeOverlay'

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
  onCodeChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
}

export const BattleEditor = memo(function BattleEditor({
  language,
  code,
  challengeIndex,
  challengeCount,
  outcome,
  isLocked,
  onCodeChange,
}: BattleEditorProps) {
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
        <textarea
          id="battle-code"
          className={`battle-code-editor ${isLocked ? 'battle-code-editor--locked' : ''}`}
          value={code}
          onChange={onCodeChange}
          placeholder="DIGITE SEU CÓDIGO AQUI"
          spellCheck={false}
          readOnly={isLocked}
          aria-readonly={isLocked}
          aria-describedby="battle-editor-note"
        />
        {outcome && (
          <BattleOutcomeOverlay outcome={outcome} visible animate />
        )}
      </div>

      <div className="battle-editor-footer">
        <div>
          <span className="battle-editor-footer__signal" aria-hidden="true" />
          <p id="battle-editor-note">Editor central da arena</p>
        </div>
        <span>
          Desafio {Math.max(challengeIndex + 1, 1)} de {challengeCount}
        </span>
      </div>
    </Card>
  )
})
