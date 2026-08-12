import { useRef } from 'react'
import { Button, getButtonClassName } from '@/components/ui'
import { useDialogFocus } from '@/hooks'

interface BattleExitDialogProps {
  open: boolean
  onContinue: () => void
  onExit: () => void
}

export function BattleExitDialog({
  open,
  onContinue,
  onExit,
}: BattleExitDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  useDialogFocus({
    open,
    containerRef: dialogRef,
    initialFocusRef: continueButtonRef,
    onClose: onContinue,
  })

  if (!open) return null

  return (
    <div className="battle-exit-dialog" role="presentation">
      <section
        ref={dialogRef}
        className="battle-exit-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-exit-title"
        aria-describedby="battle-exit-description"
        tabIndex={-1}
      >
        <span className="battle-exit-dialog__eyebrow">Protocolo de integridade</span>
        <h2 id="battle-exit-title">Batalha em andamento</h2>
        <p id="battle-exit-description">
          Sair da Arena agora poderá registrar uma infração de integridade.
        </p>
        <div className="battle-exit-dialog__actions">
          <button
            ref={continueButtonRef}
            type="button"
            className={getButtonClassName({ variant: 'gold' })}
            onClick={onContinue}
          >
            Continuar batalhando
          </button>
          <Button type="button" variant="secondary" onClick={onExit}>
            Sair da Arena
          </Button>
        </div>
      </section>
    </div>
  )
}
