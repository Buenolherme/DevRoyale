import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEVROYALE_VERSION_LABEL, markDevRoyaleOnboardingSeen } from '@/config/appMeta'
import { useDialogFocus } from '@/hooks'
import { ROUTES } from '@/routes/paths'
import { getButtonClassName, ModeIcon, Select, type ModeIconName } from '@/components/ui'

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
    description: 'A Batalha de Devs é o centro do DevRoyale. Treinamento e Bug Arena ajudam você a chegar preparado. Se nunca programou, comece com calma: não há disputa obrigatória.',
    mode: 'battle',
  },
  {
    eyebrow: 'Passo 2',
    title: 'Escolha seu primeiro passo',
    description: 'Estas escolhas apenas sugerem uma rota. Você pode explorar todos os modos e mudar o nível quando quiser.',
    mode: 'studies',
  },
]

export function FirstVisitOnboarding({ open, onClose }: FirstVisitOnboardingProps) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [experience, setExperience] = useState('never-coded')
  const [goal, setGoal] = useState('learn')
  const [language, setLanguage] = useState('python')
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
    const target = experience === 'never-coded' || goal === 'learn'
      ? `${ROUTES.AREA_ESTUDOS}?topic=${language}&level=${experience}`
      : goal === 'bugs' ? ROUTES.BUG_ARENA : ROUTES.BATALHA_DEVS
    navigate(target)
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
          {isLastStep && <div className="onboarding-preferences">
            <Select label="Experiência" value={experience} onChange={(e) => setExperience(e.target.value)} options={[{ value: 'never-coded', label: 'Nunca programei' }, { value: 'basic', label: 'Básico' }, { value: 'intermediate', label: 'Intermediário' }, { value: 'advanced', label: 'Avançado' }]} />
            <Select label="Objetivo inicial" value={goal} onChange={(e) => setGoal(e.target.value)} options={[{ value: 'learn', label: 'Reforçar fundamentos' }, { value: 'bugs', label: 'Praticar correção de bugs' }, { value: 'battle', label: 'Entrar em batalha' }]} />
            <Select label="Linguagem de interesse" value={language} onChange={(e) => setLanguage(e.target.value)} options={[{ value: 'python', label: 'Python' }, { value: 'javascript', label: 'JavaScript' }, { value: 'html-css', label: 'HTML/CSS' }, { value: 'sql', label: 'SQL' }]} />
            <p>{experience === 'never-coded' ? 'Sua primeira rota será o treinamento introdutório, sem pressa ou alertas competitivos.' : 'Abra a rota sugerida e ajuste os filtros ao seu ritmo.'}</p>
          </div>}
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
            {isLastStep ? 'Abrir rota sugerida' : 'Continuar'}
          </button>
        </div>
      </section>
    </div>
  )
}
