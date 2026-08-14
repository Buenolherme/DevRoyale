import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEVROYALE_VERSION_LABEL, markDevRoyaleOnboardingSeen } from '@/config/appMeta'
import { useDialogFocus } from '@/hooks'
import { ROUTES } from '@/routes/paths'
import { getButtonClassName, ModeIcon, type ModeIconName } from '@/components/ui'

interface FirstVisitOnboardingProps {
  open: boolean
  onClose: () => void
}

interface OnboardingStep {
  eyebrow: string
  title: string
  description: string
  mode: ModeIconName
}

const onboardingSteps: OnboardingStep[] = [
  {
    eyebrow: 'Passo 1',
    title: 'Entre na Arena',
    description: 'Escolha sua linguagem e dificuldade para enfrentar desafios de programação.',
    mode: 'battle',
  },
  {
    eyebrow: 'Passo 2',
    title: 'Resolva o desafio',
    description: 'Escreva sua solução no editor da Arena e execute o código.',
    mode: 'battle',
  },
  {
    eyebrow: 'Passo 3',
    title: 'Evolua',
    description: 'Vença batalhas, ganhe XP e desbloqueie conquistas.',
    mode: 'battle',
  },
  {
    eyebrow: 'Passo 4',
    title: 'Prepare-se',
    description: 'Use a Bug Arena e o Treinamento de Devs quando quiser reforçar suas habilidades.',
    mode: 'studies',
  },
]

export function FirstVisitOnboarding({ open, onClose }: FirstVisitOnboardingProps) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = onboardingSteps[stepIndex] ?? onboardingSteps[0]
  const isLastStep = stepIndex === onboardingSteps.length - 1

  const dismiss = useCallback(() => {
    markDevRoyaleOnboardingSeen()
    setStepIndex(0)
    onClose()
  }, [onClose])

  useDialogFocus({
    open,
    containerRef: dialogRef,
    initialFocusRef: nextButtonRef,
    onClose: dismiss,
  })

  if (!open) return null

  const handlePrimaryAction = () => {
    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1))
      return
    }

    markDevRoyaleOnboardingSeen()
    setStepIndex(0)
    onClose()
    navigate(ROUTES.BATALHA_DEVS)
  }

  return (
    <div className="onboarding-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        tabIndex={-1}
      >
        <div className="onboarding-dialog__topline">
          <span>DevRoyale {DEVROYALE_VERSION_LABEL}</span>
          <button type="button" onClick={dismiss} className="onboarding-dialog__skip">
            Pular introdução
          </button>
        </div>

        <div className="onboarding-dialog__content">
          <div className="onboarding-dialog__emblem" aria-hidden="true">
            <ModeIcon mode={currentStep.mode} size={32} />
          </div>
          <span className="onboarding-dialog__eyebrow">{currentStep.eyebrow}</span>
          <h2 id="onboarding-title">{currentStep.title}</h2>
          <p id="onboarding-description">{currentStep.description}</p>
        </div>

        <div
          className="onboarding-dialog__progress"
          aria-label={`Passo ${stepIndex + 1} de ${onboardingSteps.length}`}
        >
          {onboardingSteps.map((step, index) => (
            <span
              key={step.title}
              className={
                index <= stepIndex
                  ? 'onboarding-dialog__step onboarding-dialog__step--active'
                  : 'onboarding-dialog__step'
              }
            />
          ))}
        </div>

        <div className="onboarding-dialog__actions">
          {stepIndex > 0 && (
            <button
              type="button"
              className={getButtonClassName({ variant: 'secondary' })}
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            >
              Voltar
            </button>
          )}
          <button
            ref={nextButtonRef}
            type="button"
            className={getButtonClassName({
              variant: isLastStep ? 'gold' : 'primary',
              className: 'onboarding-dialog__primary',
            })}
            onClick={handlePrimaryAction}
          >
            {isLastStep ? 'Entrar na Arena' : 'Continuar'}
          </button>
        </div>
      </section>
    </div>
  )
}
