import { useState } from 'react'
import { Badge, Button } from '@/components/ui'
import type { BattleLanguage } from '@/types'

const languageLabel: Record<BattleLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
  'html-css': 'HTML/CSS',
}

interface BattleReferenceSolutionProps {
  code: string
  language: BattleLanguage
  outcome: 'victory' | 'defeat'
}

export function BattleReferenceSolution({
  code,
  language,
  outcome,
}: BattleReferenceSolutionProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  return (
    <section className="battle-reference" aria-labelledby="battle-reference-title">
      <div className="battle-reference__header">
        <div>
          <span className="battle-reference__eyebrow">Análise pós-batalha</span>
          <h2 id="battle-reference-title">Solução de Referência</h2>
          <p>
            Essa é uma forma limpa de resolver o desafio. Outras soluções corretas também
            podem funcionar.
          </p>
        </div>
        <div className="battle-reference__status">
          <Badge variant={outcome === 'victory' ? 'gold' : 'danger'}>
            {outcome === 'victory' ? 'Vitória' : 'Batalha encerrada'}
          </Badge>
          <Badge variant="default" className="normal-case tracking-normal">
            {languageLabel[language]}
          </Badge>
        </div>
      </div>

      <div className="battle-reference__code">
        <div className="battle-reference__toolbar">
          <span>reference.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'sql' ? 'sql' : 'html'}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            aria-live="polite"
          >
            {copyStatus === 'copied'
              ? 'Código copiado'
              : copyStatus === 'error'
                ? 'Não foi possível copiar'
                : 'Copiar código'}
          </Button>
        </div>
        <pre tabIndex={0} aria-label="Código da solução de referência">
          <code>{code}</code>
        </pre>
      </div>
    </section>
  )
}
