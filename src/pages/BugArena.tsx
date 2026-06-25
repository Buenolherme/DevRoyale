import { useMemo, useState, type ChangeEvent } from 'react'
import {
  BugFilters,
  BugScoutRecommendation,
  type BugRecommendationMode,
  type BugSizeFilter,
} from '@/components/bug-arena'
import { AuthBanner, PageHeader } from '@/components/layout'
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ModeIcon,
} from '@/components/ui'
import { mockBugs } from '@/data/mockBugs'
import { useAuth } from '@/hooks'
import type { Bug, BugCodeSize, BugDifficulty, BugLanguage } from '@/types'
import { validateBugFix } from '@/utils/bugValidation'
import { findRecommendedBug, getBugStudyRecommendation } from '@/utils/bugStudyRecommendation'
import { findFirstUncompletedBug, findNextTrainingBug } from '@/utils/bugTraining'
import { addXP, getUserProgress } from '@/utils/userProgress'

const BUG_PROGRESS_STORAGE_KEY = 'devroyale_bug_arena_progress'

const languageLabel: Record<BugLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
  'html-css': 'HTML/CSS',
}

const difficultyLabel: Record<BugDifficulty, string> = {
  never: 'Nunca programei',
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

const difficultyVariant: Record<
  BugDifficulty,
  'default' | 'success' | 'warning' | 'primary'
> = {
  never: 'default',
  basic: 'success',
  intermediate: 'warning',
  advanced: 'primary',
}

const codeSizeLabel: Record<BugCodeSize, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
}

const editorHeightClass: Record<BugCodeSize, string> = {
  small: 'bug-code-editor--small',
  medium: 'bug-code-editor--medium',
  large: 'bug-code-editor--large',
}

const editorFilename: Record<BugLanguage, string> = {
  python: 'bug.py',
  javascript: 'bug.js',
  sql: 'bug.sql',
  'html-css': 'bug.html',
}

type BugResultStatus = 'correct' | 'incorrect' | 'repeated'

interface BugResult {
  status: BugResultStatus
  message: string
  xpAwarded?: number
  leveledUp?: boolean
  newAchievements?: string[]
}

interface BugArenaProgress {
  fixedBugIds: string[]
  xp: number
}

interface BugProgressStorage {
  [userId: string]: BugArenaProgress
}

const firstBug = mockBugs[0]

function createEmptyBugProgress(): BugArenaProgress {
  return {
    fixedBugIds: [],
    xp: 0,
  }
}

function normalizeBugProgress(value: unknown): BugArenaProgress {
  if (!value || typeof value !== 'object') return createEmptyBugProgress()

  const progress = value as Partial<BugArenaProgress>

  return {
    fixedBugIds: Array.isArray(progress.fixedBugIds)
      ? [...new Set(progress.fixedBugIds.filter((id): id is string => typeof id === 'string'))]
      : [],
    xp:
      typeof progress.xp === 'number' && Number.isFinite(progress.xp) && progress.xp >= 0
        ? Math.floor(progress.xp)
        : 0,
  }
}

function getBugProgressStorage(): BugProgressStorage {
  try {
    const raw = localStorage.getItem(BUG_PROGRESS_STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as BugProgressStorage)
      : {}
  } catch {
    return {}
  }
}

function saveBugProgressStorage(storage: BugProgressStorage): boolean {
  try {
    localStorage.setItem(BUG_PROGRESS_STORAGE_KEY, JSON.stringify(storage))
    return true
  } catch {
    return false
  }
}

function getBugProgress(userId?: string | null): BugArenaProgress {
  if (!userId) return createEmptyBugProgress()

  const storage = getBugProgressStorage()
  return normalizeBugProgress(storage[userId])
}

function saveBugProgress(
  userId: string,
  progress: BugArenaProgress,
): { progress: BugArenaProgress; persisted: boolean } {
  const storage = getBugProgressStorage()
  const normalizedProgress = normalizeBugProgress(progress)

  storage[userId] = normalizedProgress
  return {
    progress: normalizedProgress,
    persisted: saveBugProgressStorage(storage),
  }
}

function getBugsForSelection(
  language: BugLanguage,
  difficulty: BugDifficulty,
  codeSize: BugSizeFilter,
): Bug[] {
  const difficultyBugs = mockBugs.filter(
    (bug) => bug.language === language && bug.difficulty === difficulty,
  )

  if (codeSize === 'random') return difficultyBugs

  const exactSizeBugs = difficultyBugs.filter((bug) => bug.codeSize === codeSize)
  return exactSizeBugs.length ? exactSizeBugs : difficultyBugs
}

function findFirstMatchingBug(
  language: BugLanguage,
  difficulty: BugDifficulty,
  codeSize: BugSizeFilter,
  completedBugIds: Iterable<string> = [],
): Bug {
  const selectedBugs = getBugsForSelection(language, difficulty, codeSize)

  return (
    findFirstUncompletedBug(selectedBugs, completedBugIds) ??
    mockBugs.find((bug) => bug.language === language) ??
    firstBug
  )
}

function getUnfixedBugs(bugs: Bug[], completedBugIds: Iterable<string>): Bug[] {
  const completedIds = new Set(completedBugIds)
  return bugs.filter((bug) => !completedIds.has(bug.id))
}

function pickRandomBug(bugs: Bug[]): Bug | null {
  if (!bugs.length) return null

  return bugs[Math.floor(Math.random() * bugs.length)] ?? null
}

export function BugArenaPage() {
  const { user, isAuthenticated } = useAuth()
  const [initialArenaState] = useState(() => {
    const progress = getBugProgress(user?.id)
    const completedBugIds = user
      ? [...new Set([...progress.fixedBugIds, ...getUserProgress(user.id).completedBugs])]
      : []

    return {
      bug: findFirstMatchingBug(firstBug.language, firstBug.difficulty, 'random', completedBugIds),
      progress,
    }
  })
  const [language, setLanguage] = useState<BugLanguage>(initialArenaState.bug.language)
  const [difficulty, setDifficulty] = useState<BugDifficulty>(initialArenaState.bug.difficulty)
  const [codeSize, setCodeSize] = useState<BugSizeFilter>('random')
  const [bugId, setBugId] = useState(initialArenaState.bug.id)
  const [code, setCode] = useState(initialArenaState.bug.brokenCode)
  const [result, setResult] = useState<BugResult | null>(null)
  const [isHintVisible, setIsHintVisible] = useState(false)
  const [recommendationMode, setRecommendationMode] = useState<BugRecommendationMode | null>(null)
  const [recommendationFeedback, setRecommendationFeedback] = useState<string | null>(null)
  const [savedProgress, setSavedProgress] = useState<BugArenaProgress>(initialArenaState.progress)
  const [sessionFixedBugIds, setSessionFixedBugIds] = useState<string[]>([])

  const difficultyBugs = useMemo(
    () => mockBugs.filter((bug) => bug.language === language && bug.difficulty === difficulty),
    [language, difficulty],
  )
  const exactSizeBugs = useMemo(
    () =>
      codeSize === 'random'
        ? difficultyBugs
        : difficultyBugs.filter((bug) => bug.codeSize === codeSize),
    [codeSize, difficultyBugs],
  )
  const sizeFallbackActive =
    codeSize !== 'random' && exactSizeBugs.length === 0 && difficultyBugs.length > 0
  const compatibleBugs = exactSizeBugs.length ? exactSizeBugs : difficultyBugs

  const currentBug =
    compatibleBugs.find((bug) => bug.id === bugId) ?? compatibleBugs[0] ?? firstBug
  const centralCompletedBugIds = useMemo(
    () => (user ? getUserProgress(user.id).completedBugs : []),
    [user],
  )
  const fixedBugIds = user
    ? [...new Set([...savedProgress.fixedBugIds, ...centralCompletedBugIds])]
    : sessionFixedBugIds
  const currentBugFixed = fixedBugIds.includes(currentBug.id)
  const fixedBugsInSelection = compatibleBugs.filter((bug) => fixedBugIds.includes(bug.id)).length
  const newBugsRemaining = compatibleBugs.length - fixedBugsInSelection
  const selectionComplete =
    compatibleBugs.length > 0 &&
    fixedBugsInSelection === compatibleBugs.length
  const studyRecommendation = useMemo(
    () => getBugStudyRecommendation(user?.id),
    [user?.id],
  )
  const recommendedBug = useMemo(
    () => findRecommendedBug(mockBugs, studyRecommendation),
    [studyRecommendation],
  )

  const loadBug = (bug: Bug) => {
    setLanguage(bug.language)
    setDifficulty(bug.difficulty)
    setBugId(bug.id)
    setCode(bug.brokenCode)
    setResult(null)
    setIsHintVisible(false)
  }

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value as BugLanguage
    const nextBug = findFirstMatchingBug(nextLanguage, difficulty, codeSize, fixedBugIds)

    loadBug(nextBug)
    setRecommendationMode(null)
    setRecommendationFeedback('Modo livre: escolha linguagem, dificuldade e tamanho manualmente.')
  }

  const handleDifficultyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDifficulty = event.target.value as BugDifficulty
    const nextBug = findFirstMatchingBug(language, nextDifficulty, codeSize, fixedBugIds)

    loadBug(nextBug)
    setRecommendationMode(null)
    setRecommendationFeedback('Modo livre: escolha linguagem, dificuldade e tamanho manualmente.')
  }

  const handleCodeSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCodeSize = event.target.value as BugSizeFilter
    const nextBug = findFirstMatchingBug(language, difficulty, nextCodeSize, fixedBugIds)

    setCodeSize(nextCodeSize)
    loadBug(nextBug)
    setRecommendationMode(null)
    setRecommendationFeedback('Modo livre: escolha linguagem, dificuldade e tamanho manualmente.')
  }

  const handleNewBug = () => {
    const nextBug = findNextTrainingBug(compatibleBugs, currentBug.id, fixedBugIds) ?? currentBug
    loadBug(nextBug)

    if (selectionComplete) {
      setRecommendationFeedback(
        'Você concluiu todos os bugs desta seleção. Agora só há desafios repetidos para treinar, sem XP extra.',
      )
    } else {
      setRecommendationFeedback('Próximo bug novo selecionado. Ele vale XP na primeira conclusão.')
    }
  }

  const handleStudyTraining = () => {
    if (!studyRecommendation.hasHistory || !recommendedBug) {
      setRecommendationMode('study')
      setRecommendationFeedback(
        'Você ainda não tem histórico de estudos. Use os filtros abaixo ou escolha um bug novo aleatório.',
      )
      return
    }

    const recommendedNewBug =
      findRecommendedBug(getUnfixedBugs(mockBugs, fixedBugIds), studyRecommendation) ??
      recommendedBug

    setCodeSize(recommendedNewBug.codeSize)
    loadBug(recommendedNewBug)
    setRecommendationMode('study')
    setRecommendationFeedback(
      `Recomendação aplicada: ${languageLabel[recommendedNewBug.language]}, ${difficultyLabel[recommendedNewBug.difficulty]}. Essa seleção permanece ativa até você escolher outro filtro ou modo.`,
    )
  }

  const handleRandomChallenge = () => {
    const newBugs = getUnfixedBugs(compatibleBugs, fixedBugIds)

    if (!newBugs.length) {
      setRecommendationMode('random')
      setRecommendationFeedback(
        'Você concluiu todos os bugs desta seleção. Altere os filtros ou use o treino infinito.',
      )
      return
    }

    const nextBugCandidates = newBugs.filter((bug) => bug.id !== currentBug.id)
    const randomBug = pickRandomBug(nextBugCandidates.length ? nextBugCandidates : newBugs)

    if (!randomBug) return

    loadBug(randomBug)
    setRecommendationMode('random')
    setRecommendationFeedback(
      'Bug novo aleatório selecionado. Ele respeita os filtros atuais e vale XP na primeira conclusão.',
    )
  }

  const handleInfiniteTraining = () => {
    const nextBug = findNextTrainingBug(compatibleBugs, currentBug.id, fixedBugIds) ?? currentBug

    loadBug(nextBug)
    setRecommendationMode('infinite')
    setRecommendationFeedback(
      'Treino infinito ativado. Bugs repetidos ajudam a praticar, mas não concedem XP novamente.',
    )
  }

  const handleCodeChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setCode(event.target.value)
    setResult(null)
  }

  const handleFixBug = () => {
    const isCorrect = validateBugFix(code, currentBug.expectedFix, currentBug.language)

    if (!isCorrect) {
      setResult({
        status: 'incorrect',
        message: 'Quase. Tem pelo menos um bug escondido ainda.',
      })
      setRecommendationFeedback('Quase. Tem pelo menos um bug escondido ainda.')
      return
    }

    if (!user) {
      if (currentBugFixed) {
        setResult({
          status: 'repeated',
          message: 'Bug repetido — treino sem XP. A correção continua valendo como prática.',
        })
        setRecommendationFeedback('Bug repetido concluído em treino, sem XP.')
        return
      }

      const nextSessionBugIds = [...new Set([...sessionFixedBugIds, currentBug.id])]
      const completedSelection = compatibleBugs.every((bug) =>
        nextSessionBugIds.includes(bug.id),
      )

      setSessionFixedBugIds(nextSessionBugIds)
      setResult({
        status: 'correct',
        message: 'Boa, Dev. Você corrigiu todos os bugs desse código. Entre para salvar XP, nível e conquistas.',
      })
      setRecommendationFeedback(
        completedSelection
          ? 'Você concluiu todos os bugs desta seleção. Agora só há desafios repetidos para treinar, sem XP extra.'
          : 'Boa, Dev. Correção concluída nesta sessão; o próximo bug priorizará um desafio novo.',
      )
      return
    }

    if (fixedBugIds.includes(currentBug.id)) {
      setResult({
        status: 'repeated',
        message: 'Esse bug já foi concluído. Repetir ajuda, mas não rende XP.',
      })
      setRecommendationFeedback('Esse bug já foi concluído. Repetir ajuda, mas não rende XP.')
      return
    }

    const xpResult = addXP(user.id, currentBug.xp, 'bug', currentBug.id, {
      language: currentBug.language,
      difficulty: currentBug.difficulty,
      codeSize: currentBug.codeSize,
      bugCount: currentBug.bugCount,
      title: currentBug.title,
    })

    if (xpResult.duplicate) {
      setResult({
        status: 'repeated',
        message: 'Esse bug já foi concluído. Repetir ajuda, mas não rende XP.',
      })
      setRecommendationFeedback('Esse bug já foi concluído. Repetir ajuda, mas não rende XP.')
      return
    }

    if (!xpResult.persisted) {
      setResult({
        status: 'correct',
        message:
          'Boa, Dev. A correção está certa, mas o progresso não pôde ser salvo neste dispositivo.',
      })
      setRecommendationFeedback(
        'Correção validada, mas não foi possível salvar XP e progresso neste dispositivo.',
      )
      return
    }

    const legacySaveResult = saveBugProgress(user.id, {
      fixedBugIds: [...savedProgress.fixedBugIds, currentBug.id],
      xp: savedProgress.xp + xpResult.xpAwarded,
    })
    const nextProgress = legacySaveResult.progress
    const nextFixedBugIds = [
      ...new Set([...nextProgress.fixedBugIds, ...centralCompletedBugIds, currentBug.id]),
    ]

    setSavedProgress(nextProgress)
    const completedSelection = compatibleBugs.every((bug) =>
      nextFixedBugIds.includes(bug.id),
    )
    setResult({
      status: 'correct',
      message: 'Boa, Dev. Você corrigiu todos os bugs desse código.',
      xpAwarded: xpResult.xpAwarded,
      leveledUp: xpResult.leveledUp,
      newAchievements: xpResult.newAchievements.map((achievement) => achievement.name),
    })
    setRecommendationFeedback(
      completedSelection
        ? 'Você concluiu todos os bugs desta seleção. Agora só há desafios repetidos para treinar, sem XP extra.'
        : 'Boa, Dev. Você corrigiu todos os bugs desse código. O próximo bug priorizará um desafio novo.',
    )
  }

  return (
    <div className="page-container arena-page-container">
      <AuthBanner />
      <PageHeader
        icon={<ModeIcon mode="bug" />}
        title="Bug Arena"
        description="Analise o código quebrado, encontre os bugs e corrija."
      >
        <Badge variant="warning">{mockBugs.length} bugs ativos</Badge>
      </PageHeader>

      <BugScoutRecommendation
        recommendation={studyRecommendation}
        mode={recommendationMode}
        feedback={recommendationFeedback}
        onStudyTraining={handleStudyTraining}
        onRandomChallenge={handleRandomChallenge}
        onInfiniteTraining={handleInfiniteTraining}
      />

      <BugFilters
        language={language}
        difficulty={difficulty}
        codeSize={codeSize}
        availableCount={compatibleBugs.length}
        completedCount={fixedBugsInSelection}
        remainingCount={newBugsRemaining}
        onLanguageChange={handleLanguageChange}
        onDifficultyChange={handleDifficultyChange}
        onCodeSizeChange={handleCodeSizeChange}
      />

      {sizeFallbackActive && (
        <div className="mb-6 rounded-2xl border border-warning/25 bg-warning-muted px-4 py-4 text-sm font-semibold text-warning">
          Ainda não há código {codeSizeLabel[codeSize]} nesta combinação. O Scout selecionou o
          desafio mais próximo, mantendo linguagem e dificuldade.
        </div>
      )}

      {selectionComplete && (
        <div
          className="mb-6 rounded-2xl border border-success/25 bg-success-muted px-4 py-4 text-sm font-semibold text-success"
          role="status"
        >
          Você concluiu todos os bugs desta seleção. Agora só há desafios repetidos para
          treinar, sem XP extra.
        </div>
      )}

      <div className="bug-arena-workspace grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 space-y-6" aria-label="Oficina de correção de bugs">
          <Card variant="premium" className="bug-challenge-card overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge variant="gold">Bug atual</Badge>
                    <Badge variant={difficultyVariant[currentBug.difficulty]}>
                      {difficultyLabel[currentBug.difficulty]}
                    </Badge>
                    <Badge variant="default" className="normal-case">
                      {languageLabel[currentBug.language]}
                    </Badge>
                    <Badge variant="default">Código {codeSizeLabel[currentBug.codeSize]}</Badge>
                    <Badge variant="danger">
                      {currentBug.bugCount} {currentBug.bugCount === 1 ? 'bug' : 'bugs'}
                    </Badge>
                    <Badge variant={currentBugFixed ? 'default' : 'success'}>
                      {currentBugFixed
                        ? 'Bug repetido — treino sem XP'
                        : 'Bug novo — vale XP'}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl md:text-2xl">{currentBug.title}</CardTitle>
                  <CardDescription className="max-w-2xl text-sm md:text-base">
                    {currentBug.description}
                  </CardDescription>
                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Temas do desafio">
                    {currentBug.topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  className="rounded-2xl border border-secondary/25 bg-secondary-muted px-4 py-3 text-right"
                  aria-label={`Recompensa de ${currentBug.xp} XP`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">XP</p>
                  <p className="text-2xl font-black text-secondary">{currentBug.xp}</p>
                  <p className="mt-1 text-[0.65rem] font-semibold text-muted">
                    Base {currentBug.baseXp} + bônus {currentBug.xp - currentBug.baseXp}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="rounded-2xl border border-primary/20 bg-primary-muted/35 px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="primary">Objetivo</Badge>
              <p className="text-sm font-semibold leading-relaxed text-foreground">
                Analise o código quebrado, encontre os bugs e corrija.
              </p>
            </div>
          </div>

          <Card variant="premium" className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background-secondary px-4 py-3">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full bg-secondary" />
                <span className="h-2 w-2 rounded-full bg-muted/50" />
              </div>
              <span className="mr-auto font-mono text-sm font-bold text-foreground">
                {editorFilename[currentBug.language]}
              </span>
              <Badge variant="default" className="normal-case tracking-normal">
                Editor de Correção
              </Badge>
            </div>

            <label htmlFor="bug-code" className="sr-only">
              Código corrigido
            </label>
            <textarea
              id="bug-code"
              className={`bug-code-editor block max-w-full ${editorHeightClass[currentBug.codeSize]} w-full resize-y overflow-auto border-0 bg-background px-4 py-5 font-mono text-[0.82rem] leading-relaxed text-foreground outline-none transition-shadow focus-visible:shadow-[inset_0_0_0_2px_rgba(214,168,74,0.42)] md:px-5 md:text-sm`}
              value={code}
              onChange={handleCodeChange}
              spellCheck={false}
              wrap="off"
              aria-describedby="bug-editor-note"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background-secondary px-4 py-3 text-xs text-muted">
              <p id="bug-editor-note">
                Este código possui {currentBug.bugCount}{' '}
                {currentBug.bugCount === 1 ? 'bug' : 'bugs'}. Encontre e corrija todos.
              </p>
              <span>{languageLabel[currentBug.language]}</span>
            </div>
          </Card>

          {result && (
            <div
              className={`rounded-2xl border px-4 py-4 text-sm font-semibold ${
                result.status === 'correct'
                  ? 'border-success/25 bg-success-muted text-success'
                  : result.status === 'repeated'
                    ? 'border-secondary/25 bg-secondary-muted text-secondary'
                    : 'border-danger/25 bg-danger-muted text-danger'
              }`}
              role="status"
              aria-live="polite"
            >
              <p>{result.message}</p>
              {result.xpAwarded && (
                <p className="mt-1 text-xs uppercase tracking-[0.14em]">
                  +{result.xpAwarded} XP
                </p>
              )}
              {result.leveledUp && (
                <p className="mt-1 text-xs uppercase tracking-[0.14em]">
                  Nível atualizado!
                </p>
              )}
              {result.newAchievements?.length ? (
                <p className="mt-1 text-xs uppercase tracking-[0.14em]">
                  Nova conquista desbloqueada: {result.newAchievements.join(', ')}
                </p>
              ) : null}
              {result.status === 'correct' && (
                <div className="mt-3 text-foreground">
                  <p>{currentBug.explanation}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    {currentBug.bugExplanations.map((explanation) => (
                      <li key={explanation}>{explanation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {isHintVisible && (
            <div
              id="bug-hint"
              className="rounded-2xl border border-secondary/25 bg-secondary-muted/40 px-4 py-4"
            >
              <Badge variant="gold">Dica</Badge>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{currentBug.hint}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" size="lg" onClick={handleFixBug}>
              Validar correção
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setIsHintVisible((visible) => !visible)}
              aria-expanded={isHintVisible}
              aria-controls="bug-hint"
            >
              {isHintVisible ? 'Ocultar dica' : 'Ver dica do Scout'}
            </Button>
            <Button type="button" variant="gold" size="lg" onClick={handleNewBug}>
              Próximo Bug
            </Button>
          </div>
        </main>

        <aside className="xl:sticky xl:top-24 xl:self-start" aria-label="Progresso na Bug Arena">
          <div className="grid gap-3 text-left">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Bugs corrigidos
              </p>
              <p className="mt-1 text-2xl font-black text-secondary">
                {fixedBugIds.length}/{mockBugs.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                XP da oficina
              </p>
              <p className="mt-1 text-2xl font-black text-primary">
                {isAuthenticated ? savedProgress.xp : 0}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
