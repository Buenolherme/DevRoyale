import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  BattleCountdown,
  BattleEditor,
  BattleFilters,
  BattleResultFeedback,
} from '@/components/battle'
import { AuthBanner, ScoutMascot } from '@/components/layout'
import scoutHomeImage from '@/assets/scout/scout-home.png'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ModeIcon,
} from '@/components/ui'
import { mockBattleChallenges } from '@/data/mockBattleChallenges'
import { useAuth } from '@/hooks'
import type { BattleDifficulty, BattleLanguage } from '@/types'
import { addXP, validateBattleSolution } from '@/utils'

const languageLabel: Record<BattleLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
  'html-css': 'HTML/CSS',
}

const difficultyLabel: Record<BattleDifficulty, string> = {
  never: 'Nunca programei',
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

const difficultyVariant: Record<
  BattleDifficulty,
  'default' | 'success' | 'warning' | 'primary'
> = {
  never: 'default',
  basic: 'warning',
  intermediate: 'primary',
  advanced: 'primary',
}

const battleXpByDifficulty: Record<BattleDifficulty, number> = {
  never: 15,
  basic: 25,
  intermediate: 40,
  advanced: 60,
}

const legacyBeginnerChallengeIds = new Set([
  'python-beginner-reverse',
  'python-beginner-sum',
  'javascript-beginner-double',
  'javascript-beginner-greeting',
  'sql-beginner-active-users',
  'sql-beginner-products',
  'html-css-beginner-button',
  'html-css-beginner-card',
])

function getBattleXp(challengeId: string, difficulty: BattleDifficulty): number {
  return legacyBeginnerChallengeIds.has(challengeId)
    ? 25
    : battleXpByDifficulty[difficulty]
}

const initialLanguage: BattleLanguage = 'python'
const initialDifficulty: BattleDifficulty = 'never'
const initialChallenge =
  mockBattleChallenges.find(
    (challenge) =>
      challenge.language === initialLanguage && challenge.difficulty === initialDifficulty,
  ) ?? mockBattleChallenges[0]

const rivalNames = ['CodeGhost', 'BugSlayer', 'NullHunter', 'SyntaxWolf', 'StackNinja']

const rivalDurationByDifficulty: Record<BattleDifficulty, number> = {
  never: 90,
  basic: 60,
  intermediate: 45,
  advanced: 35,
}

const rivalStatusSteps = [
  { progress: 85, label: 'Finalizando...' },
  { progress: 60, label: 'Testando solução...' },
  { progress: 25, label: 'Codificando...' },
  { progress: 0, label: 'Analisando...' },
]

type BattleResultStatus = 'correct' | 'incorrect'
type BattleOutcome = 'active' | 'victory' | 'defeat'
type BattlePhase = 'preparing' | 'countdown' | 'starting' | 'active'

interface BattleResult {
  status: BattleResultStatus
  message: string
  xpAwarded?: number
  leveledUp?: boolean
  newAchievements?: string[]
}

interface BattleRace {
  elapsedMilliseconds: number
  outcome: BattleOutcome
}

const scoutMessage: Record<BattleResultStatus | 'idle', string> = {
  idle: 'Leia o desafio com calma. Todo dev vence uma linha por vez.',
  correct: 'Excelente trabalho.',
  incorrect: 'Continue tentando, Dev.',
}

const battleScoutMessage: Record<Exclude<BattleOutcome, 'active'>, string> = {
  victory: 'Excelente trabalho. Vitória conquistada.',
  defeat: 'Todo desenvolvedor perde algumas batalhas.',
}

function getRandomRivalName(currentName?: string): string {
  const availableNames = rivalNames.filter((name) => name !== currentName)
  const randomIndex = Math.floor(Math.random() * availableNames.length)
  return availableNames[randomIndex] ?? rivalNames[0]
}

function formatBattleTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getRivalStatus(progress: number): string {
  return rivalStatusSteps.find((step) => progress >= step.progress)?.label ?? 'Analisando...'
}

export function BatalhaDevsPage() {
  const { user } = useAuth()
  const [language, setLanguage] = useState<BattleLanguage>(initialLanguage)
  const [difficulty, setDifficulty] = useState<BattleDifficulty>(initialDifficulty)
  const [challengeId, setChallengeId] = useState(initialChallenge.id)
  const [code, setCode] = useState('')
  const codeRef = useRef('')
  const [result, setResult] = useState<BattleResult | null>(null)
  const [isHintVisible, setIsHintVisible] = useState(false)
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('preparing')
  const [countdownValue, setCountdownValue] = useState<number | null>(null)
  const [rivalName, setRivalName] = useState(() => getRandomRivalName())
  const [battleRace, setBattleRace] = useState<BattleRace>({
    elapsedMilliseconds: 0,
    outcome: 'active',
  })
  const [battleDuration, setBattleDuration] = useState(
    rivalDurationByDifficulty[initialChallenge.difficulty],
  )
  const [battleRunId, setBattleRunId] = useState(0)

  const compatibleChallenges = useMemo(
    () =>
      mockBattleChallenges.filter(
        (challenge) =>
          challenge.language === language && challenge.difficulty === difficulty,
      ),
    [difficulty, language],
  )
  const currentChallenge =
    compatibleChallenges.find((challenge) => challenge.id === challengeId) ??
    compatibleChallenges[0] ??
    initialChallenge
  const currentCompatibleIndex = compatibleChallenges.findIndex(
    (challenge) => challenge.id === currentChallenge.id,
  )
  const challengeNumber = useMemo(
    () =>
      mockBattleChallenges.findIndex(
        (challenge) => challenge.id === currentChallenge.id,
      ),
    [currentChallenge.id],
  )
  const battleOutcome = battleRace.outcome
  const elapsedSeconds = Math.min(
    Math.floor(battleRace.elapsedMilliseconds / 1000),
    battleDuration,
  )
  const rivalProgress = Math.min(
    (battleRace.elapsedMilliseconds / (battleDuration * 1000)) * 100,
    100,
  )
  const rivalStatus = getRivalStatus(rivalProgress)
  const scoutText =
    battleOutcome === 'active'
      ? scoutMessage[result?.status ?? 'idle']
      : battleScoutMessage[battleOutcome]
  const battleStatusLabel =
    battlePhase === 'preparing' || battlePhase === 'countdown' || battlePhase === 'starting'
      ? 'Preparando'
      : battleOutcome === 'victory'
        ? 'Vitória'
        : battleOutcome === 'defeat'
          ? 'Derrota'
          : 'Em batalha'
  const battleStatusVariant =
    battleStatusLabel === 'Vitória'
      ? 'gold'
      : battleStatusLabel === 'Derrota'
        ? 'danger'
        : battleStatusLabel === 'Em batalha'
          ? 'online'
          : 'primary'

  useEffect(() => {
    if (battlePhase !== 'active' || battleOutcome !== 'active') return

    const tickMilliseconds = 1000
    const battleDurationMilliseconds = battleDuration * 1000
    const battleStartedAt = Date.now()
    const updateBattle = () => {
      setBattleRace((currentRace) => {
        if (currentRace.outcome !== 'active') return currentRace

        const nextElapsedMilliseconds = Math.min(
          Date.now() - battleStartedAt,
          battleDurationMilliseconds,
        )

        return {
          elapsedMilliseconds: nextElapsedMilliseconds,
          outcome:
            nextElapsedMilliseconds >= battleDurationMilliseconds ? 'defeat' : 'active',
        }
      })
    }

    updateBattle()
    const intervalId = window.setInterval(updateBattle, tickMilliseconds)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [battleDuration, battleOutcome, battlePhase, battleRunId])

  useEffect(() => {
    if (battlePhase === 'countdown' && countdownValue !== null) {
      const countdownTimeout = window.setTimeout(() => {
        if (countdownValue > 1) {
          setCountdownValue((value) => (value === null ? null : value - 1))
          return
        }

        setCountdownValue(null)
        setBattlePhase('starting')
      }, 700)

      return () => window.clearTimeout(countdownTimeout)
    }

    if (battlePhase === 'starting') {
      const startTimeout = window.setTimeout(() => {
        setBattlePhase('active')
        setBattleRunId((runId) => runId + 1)
      }, 750)

      return () => window.clearTimeout(startTimeout)
    }
  }, [battlePhase, countdownValue])

  const resetBattleState = (nextDifficulty: BattleDifficulty) => {
    codeRef.current = ''
    setCode('')
    setResult(null)
    setIsHintVisible(false)
    setRivalName((currentName) => getRandomRivalName(currentName))
    setBattleRace({
      elapsedMilliseconds: 0,
      outcome: 'active',
    })
    setBattleDuration(rivalDurationByDifficulty[nextDifficulty])
    setBattlePhase('preparing')
    setCountdownValue(null)
  }

  const loadFirstChallenge = (
    nextLanguage: BattleLanguage,
    nextDifficulty: BattleDifficulty,
  ) => {
    const nextChallenge = mockBattleChallenges.find(
      (challenge) =>
        challenge.language === nextLanguage && challenge.difficulty === nextDifficulty,
    )

    if (!nextChallenge) return

    setChallengeId(nextChallenge.id)
    resetBattleState(nextChallenge.difficulty)
  }

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value as BattleLanguage
    setLanguage(nextLanguage)
    loadFirstChallenge(nextLanguage, difficulty)
  }

  const handleDifficultyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDifficulty = event.target.value as BattleDifficulty
    setDifficulty(nextDifficulty)
    loadFirstChallenge(language, nextDifficulty)
  }

  const handlePrepareNewBattle = () => {
    const nextIndex = compatibleChallenges.length > 1
      ? (currentCompatibleIndex + 1) % compatibleChallenges.length
      : currentCompatibleIndex
    const nextChallenge = compatibleChallenges[nextIndex] ?? currentChallenge

    setChallengeId(nextChallenge.id)
    resetBattleState(nextChallenge.difficulty)
  }

  const handleStartBattle = () => {
    setResult(null)
    setIsHintVisible(false)
    setBattleRace({
      elapsedMilliseconds: 0,
      outcome: 'active',
    })
    setCountdownValue(3)
    setBattlePhase('countdown')
  }

  const handleExecute = () => {
    if (battleOutcome !== 'active') return

    const validation = validateBattleSolution(codeRef.current, currentChallenge)

    if (!validation.isValid) {
      setResult({
        status: 'incorrect',
        message: validation.message ?? 'Revise sua resposta e tente novamente.',
      })
      return
    }

    const xpResult = user
      ? addXP(user.id, getBattleXp(currentChallenge.id, currentChallenge.difficulty), 'battle', currentChallenge.id, {
          language: currentChallenge.language,
          difficulty: currentChallenge.difficulty,
          title: currentChallenge.title,
          outcome: 'victory',
        })
      : null

    setBattleRace((currentRace) => {
      return currentRace.outcome === 'active'
        ? { ...currentRace, outcome: 'victory' }
        : currentRace
    })

    setResult({
      status: 'correct',
      message: !user
        ? 'Missão concluída nesta sessão! Entre para salvar XP, nível e conquistas.'
        : xpResult && !xpResult.persisted
          ? 'Missão concluída, mas o progresso não pôde ser salvo neste dispositivo.'
        : xpResult?.duplicate
          ? 'Missão concluída novamente. Este desafio não concede XP repetido.'
          : 'Missão concluída!',
      xpAwarded: xpResult?.xpAwarded,
      leveledUp: xpResult?.leveledUp,
      newAchievements: xpResult?.newAchievements.map((achievement) => achievement.name),
    })
  }

  const handleCodeChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextCode = event.target.value
    codeRef.current = nextCode
    setCode(nextCode)
    setResult(null)
  }, [])

  return (
    <div className="page-container arena-page-container battle-page">
      <AuthBanner />

      <header className="battle-command-header">
        <div className="battle-command-header__main">
          <div className="battle-command-header__identity">
            <span className="battle-command-header__eyebrow">DevRoyale Competitive Arena</span>
            <h1>
              <span className="battle-command-header__icon" aria-hidden="true">
                <ModeIcon mode="battle" />
              </span>
              Arena de Código
            </h1>
            <p>Analise o desafio, assuma o editor e vença o duelo com uma solução precisa.</p>
          </div>

          <div className="battle-command-header__status" role="status">
            <span>Status da arena</span>
            <Badge
              variant={battleStatusVariant}
              className="battle-command-header__status-badge normal-case tracking-normal"
            >
              <i
                className={`battle-command-header__signal battle-command-header__signal--${battleStatusLabel
                  .toLowerCase()
                  .replace(' ', '-')}`}
                aria-hidden="true"
              />
              {battleStatusLabel}
            </Badge>
          </div>
        </div>

        <div className="battle-command-header__telemetry" aria-label="Configuração da arena">
          <div>
            <span>Linguagem</span>
            <strong>{languageLabel[currentChallenge.language]}</strong>
          </div>
          <div>
            <span>Dificuldade</span>
            <strong>{difficultyLabel[currentChallenge.difficulty]}</strong>
          </div>
          <div>
            <span>Formato</span>
            <strong>Duelo de código</strong>
          </div>
          <div className="battle-command-header__ranked">
            <span>Ranked online</span>
            <strong>Em breve</strong>
          </div>
        </div>
      </header>

      {battlePhase === 'preparing' && (
        <BattleFilters
          language={language}
          difficulty={difficulty}
          onStartBattle={handleStartBattle}
          onLanguageChange={handleLanguageChange}
          onDifficultyChange={handleDifficultyChange}
        />
      )}

      {(battlePhase === 'countdown' || battlePhase === 'starting') && (
        <BattleCountdown
          key={battlePhase === 'starting' ? 'started' : countdownValue}
          value={battlePhase === 'starting' ? 'started' : (countdownValue ?? 1)}
        />
      )}

      {battlePhase === 'active' && <div className="battle-workspace">
        <section className="min-w-0 space-y-6" aria-label="Área de resolução do desafio">
          <div className="battle-live-brief" role="status">
            <div className="battle-live-brief__state">
              <span className="battle-active-dot" aria-hidden="true" />
              <strong>Em batalha</strong>
            </div>
            <p>Editor liberado. Resolva o objetivo antes do rival.</p>
            <span className="battle-live-brief__mode">Duelo 1v1</span>
          </div>
          <Card variant="premium" className="battle-challenge-card">
            <CardHeader>
              <div className="battle-challenge-card__topline">
                <span>Objetivo do duelo</span>
                <div className="battle-challenge-number" aria-hidden="true">
                  {String(challengeNumber + 1).padStart(2, '0')}
                </div>
              </div>

              <CardTitle className="battle-challenge-card__title">
                {currentChallenge.title}
              </CardTitle>
              <CardDescription className="battle-challenge-card__description">
                {currentChallenge.statement}
              </CardDescription>

              <div className="battle-challenge-meta" aria-label="Detalhes do desafio">
                <div>
                  <span>Linguagem</span>
                  <Badge variant="default" className="normal-case tracking-normal">
                    {languageLabel[currentChallenge.language]}
                  </Badge>
                </div>
                <div>
                  <span>Dificuldade</span>
                  <Badge variant={difficultyVariant[currentChallenge.difficulty]}>
                    {difficultyLabel[currentChallenge.difficulty]}
                  </Badge>
                </div>
                <div>
                  <span>Recompensa</span>
                  <Badge variant="gold" className="normal-case tracking-normal">
                    {getBattleXp(currentChallenge.id, currentChallenge.difficulty)} XP
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="battle-example">
                <span className="battle-example__label">Instruções</span>
                <ul className="battle-instructions">
                  {currentChallenge.instructions.map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <BattleEditor
            language={currentChallenge.language}
            code={code}
            challengeIndex={currentCompatibleIndex}
            challengeCount={compatibleChallenges.length}
            outcome={battleOutcome === 'active' ? null : battleOutcome}
            isLocked={battleOutcome !== 'active'}
            onCodeChange={handleCodeChange}
          />

          {result && battleOutcome !== 'defeat' && <BattleResultFeedback result={result} />}

          {isHintVisible && battleOutcome === 'active' && (
            <div className="battle-hint" id="battle-hint">
              <Badge variant="gold">Dica</Badge>
              <p>{currentChallenge.hint}</p>
            </div>
          )}

          <div className={`battle-actions ${battleOutcome !== 'active' ? 'battle-actions--ended' : ''}`}>
            {battleOutcome === 'active' && (
              <>
                <Button
                  type="button"
                  size="lg"
                  className="battle-action battle-action--primary"
                  onClick={handleExecute}
                >
                  <span className="battle-action__terminal" aria-hidden="true">&gt;_</span>
                  Executar código
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="battle-action"
                  onClick={() => setIsHintVisible((visible) => !visible)}
                  aria-expanded={isHintVisible}
                  aria-controls="battle-hint"
                >
                  {isHintVisible ? 'Ocultar Dica' : 'Ver Dica'}
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="gold"
              size="lg"
              className="battle-action"
              onClick={handlePrepareNewBattle}
            >
              {battleOutcome === 'active' ? 'Preparar nova batalha' : 'Nova batalha'}
            </Button>
          </div>
        </section>

        <aside className="battle-side-panel" aria-label="Rival e orientação da batalha">
          <Card variant="premium" className="battle-rival-card overflow-hidden">
            <CardContent className="relative p-0">
              <div className="battle-rival-card__glow" aria-hidden="true" />

              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <Badge variant="primary">Rival simulado</Badge>
                {battleOutcome === 'active' ? (
                  <Badge
                    variant="online"
                    className="normal-case tracking-normal"
                    aria-label="Batalha ativa"
                  >
                    <span className="battle-active-dot" aria-hidden="true" />
                    Batalha ativa
                  </Badge>
                ) : (
                  <Badge
                    variant={battleOutcome === 'victory' ? 'gold' : 'danger'}
                    className="normal-case tracking-normal"
                  >
                    {battleOutcome === 'victory' ? 'Vitória' : 'Encerrada'}
                  </Badge>
                )}
              </div>

              <div className="battle-rival-identity">
                <div className="battle-rival-avatar" aria-hidden="true">
                  &lt;/&gt;
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    Seu oponente
                  </p>
                  <h3 className="truncate text-xl font-black text-foreground">{rivalName}</h3>
                </div>
              </div>

              <div className="battle-rival-timer">
                <span>Tempo</span>
                <strong>{formatBattleTime(elapsedSeconds)}</strong>
              </div>

              <div className="battle-rival-status" aria-live="polite">
                <span
                  className={battleOutcome === 'active' ? 'battle-active-dot' : ''}
                  aria-hidden="true"
                />
                <p>
                  {battleOutcome === 'victory'
                    ? 'Progresso interrompido.'
                    : battleOutcome === 'active'
                      ? rivalStatus
                      : 'Tempo encerrado.'}
                </p>
              </div>

              <div className="battle-rival-progress">
                <div className="battle-rival-progress__label">
                  <span>Progresso do rival</span>
                  <strong>{Math.round(rivalProgress)}%</strong>
                </div>
                <div
                  className="battle-rival-progress__track"
                  role="progressbar"
                  aria-label={`Progresso de ${rivalName}`}
                  aria-valuenow={Math.round(rivalProgress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="battle-rival-progress__fill"
                    style={{ width: `${rivalProgress}%` }}
                  />
                </div>
              </div>

              <div className="battle-rival-future">
                <span>Ranked online</span>
                <strong>Em breve</strong>
              </div>
            </CardContent>
          </Card>

          <div className="battle-scout-free">
            <ScoutMascot
              src={scoutHomeImage}
              alt="Scout Guerreiro"
              message={scoutText}
              className="scout-mascot--panel scout-mascot--battle scout-mascot--warrior"
              bubbleClassName={
                battleOutcome === 'active'
                  ? result
                    ? `battle-scout-message--${result.status}`
                    : ''
                  : `battle-scout-message--${battleOutcome}`
              }
            />
          </div>
        </aside>
      </div>}
    </div>
  )
}
