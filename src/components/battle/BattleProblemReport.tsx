import { useCallback, useMemo, useRef, useState } from 'react'
import { DEVROYALE_VERSION } from '@/config/appMeta'
import { useDialogFocus } from '@/hooks'
import {
  battleProblemCategories,
  buildBattleProblemReport,
  getBasicBrowserName,
  type BattleProblemCategory,
  type BattleProblemContext,
} from '@/utils/battleProblemReport'
import { Button } from '@/components/ui'

interface BattleProblemReportProps {
  open: boolean
  onClose: () => void
  context: BattleProblemContext
  code: string
}

export function BattleProblemReport({ open, onClose, context, code }: BattleProblemReportProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const [category, setCategory] = useState<BattleProblemCategory>(battleProblemCategories[0])
  const [description, setDescription] = useState('')
  const [includeCode, setIncludeCode] = useState(false)
  const [report, setReport] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  const closeDialog = useCallback(() => {
    setCopyStatus('')
    onClose()
  }, [onClose])

  useDialogFocus({
    open,
    containerRef: dialogRef,
    initialFocusRef: categoryRef,
    onClose: closeDialog,
  })

  const browser = useMemo(
    () => getBasicBrowserName(typeof navigator === 'undefined' ? '' : navigator.userAgent),
    [],
  )

  if (!open) return null

  const generateReport = () => {
    setReport(buildBattleProblemReport({
      context,
      category,
      description,
      browser,
      includeCode,
      code,
    }))
    setCopyStatus('Relatório gerado. Revise antes de copiar.')
  }

  const copyReport = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
      setCopyStatus('Relatório copiado para a área de transferência.')
    } catch {
      setCopyStatus('Não foi possível copiar automaticamente. Selecione o texto abaixo e copie.')
    }
  }

  return (
    <div className="battle-report-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="battle-report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-report-title"
        aria-describedby="battle-report-description"
        tabIndex={-1}
      >
        <header className="battle-report-dialog__header">
          <div>
            <span>Feedback da Arena · {DEVROYALE_VERSION}</span>
            <h2 id="battle-report-title">Reportar problema</h2>
            <p id="battle-report-description">
              Gere um relatório para compartilhar com a equipe durante os testes da Arena.
            </p>
          </div>
          <button
            type="button"
            className="battle-report-dialog__close focus-ring"
            onClick={closeDialog}
            aria-label="Fechar reporte de problema"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="battle-report-dialog__notice">
          <strong>Nada é enviado automaticamente.</strong>
          <span>O DevRoyale ainda não possui backend de feedback.</span>
        </div>

        <div className="battle-report-dialog__form">
          <label htmlFor="battle-report-category">Categoria</label>
          <select
            ref={categoryRef}
            id="battle-report-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as BattleProblemCategory)
              setReport('')
              setCopyStatus('')
            }}
          >
            {battleProblemCategories.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <label htmlFor="battle-report-details">Descrição curta</label>
          <textarea
            id="battle-report-details"
            value={description}
            maxLength={600}
            rows={4}
            placeholder="Explique o que aconteceu e o que você esperava."
            onChange={(event) => {
              setDescription(event.target.value)
              setReport('')
              setCopyStatus('')
            }}
          />
          <small>{description.length}/600 caracteres</small>

          <label className="battle-report-dialog__code-consent">
            <input
              type="checkbox"
              checked={includeCode}
              onChange={(event) => {
                setIncludeCode(event.target.checked)
                setReport('')
                setCopyStatus('')
              }}
            />
            <span>
              <strong>Incluir meu código no relatório</strong>
              <small>Opcional. O código nunca é incluído sem esta autorização.</small>
            </span>
          </label>

          <div className="battle-report-dialog__context" aria-label="Contexto incluído no relatório">
            <span>{context.language}</span>
            <span>{context.difficulty}</span>
            <span>{context.challengeId}</span>
          </div>

          <Button type="button" variant="secondary" onClick={generateReport}>
            Gerar relatório
          </Button>
        </div>

        {report && (
          <div className="battle-report-dialog__result">
            <label htmlFor="battle-report-output">Relatório estruturado</label>
            <textarea
              id="battle-report-output"
              value={report}
              rows={11}
              readOnly
              aria-describedby="battle-report-copy-status"
            />
            <Button type="button" variant="gold" onClick={copyReport}>
              Copiar relatório
            </Button>
          </div>
        )}

        <p id="battle-report-copy-status" className="battle-report-dialog__status" role="status" aria-live="polite">
          {copyStatus}
        </p>
      </section>
    </div>
  )
}
