import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrainingExplorer, ProjectChecklist } from '@/components/studies/TrainingExplorer'
import { LessonPractice } from '@/components/studies/LessonPractice'
import { trainingProjects } from '@/data/trainingCatalog'
import { modulePrerequisite, readTrainingWorkspace, recommendTraining, saveTrainingWorkspace, type TrainingWorkspace } from '@/utils/training'
import {
  StudiesIntro,
  StudyPathSelector,
  levelFocus,
  topicMarks,
} from '@/components/studies'
import { Badge, Button, Card, ProgressBar } from '@/components/ui'
import {
  getStudyLearningPath,
  studyLearningPaths,
  studyLevelOptions,
  studyTopicOptions,
} from '@/data/studyLearningPaths'
import { useAuth } from '@/hooks'
import type {
  StudyHistoryRecord,
  StudyLearningPath,
  StudyLesson,
  StudyLevelId,
  StudyTopicId,
} from '@/types'
import {
  addXP,
  getCompletedStudyLessons,
  getStudyLessonXP,
  getStudyCompletionKey,
  getUserProgress,
  saveCompletedStudyLesson,
} from '@/utils'

interface HistoryState {
  ownerId: string | null
  records: StudyHistoryRecord[]
}

interface SessionCompletionState {
  ownerId: string | null
  keys: Set<string>
}

type LessonFeedbackTone = 'success' | 'info' | 'error'

function formatHistoryDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data não disponível'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getLessonCompletionKey(path: StudyLearningPath, lesson: StudyLesson): string {
  return getStudyCompletionKey({
    topicId: path.topicId,
    levelId: path.levelId,
    lessonId: lesson.id,
  })
}

function AreaEstudosContent() {
  const { user, isAuthenticated } = useAuth()
  const currentUserId = user?.id ?? null
  const [historyState, setHistoryState] = useState<HistoryState>(() => ({
    ownerId: currentUserId,
    records: getCompletedStudyLessons(currentUserId),
  }))
  const [sessionCompletionState, setSessionCompletionState] =
    useState<SessionCompletionState>(() => ({
      ownerId: currentUserId,
      keys: new Set<string>(),
    }))
  const [params, setParams] = useSearchParams()
  const selectedTopicId = studyTopicOptions.find((topic) => topic.id === params.get('topic'))?.id ?? null
  const selectedLevelId = studyLevelOptions.find((level) => level.id === params.get('level'))?.id ?? null
  const activeLessonId = params.get('lesson')
  const [workspace, setWorkspace] = useState(() => readTrainingWorkspace(currentUserId))
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState<LessonFeedbackTone>('success')

  const history =
    historyState.ownerId === currentUserId
      ? historyState.records
      : getCompletedStudyLessons(currentUserId)
  const persistedCompletionKeys = useMemo(
    () =>
      new Set(
        history.map((record) =>
          getStudyCompletionKey({
            topicId: record.topicId,
            levelId: record.levelId,
            lessonId: record.lessonId,
          }),
        ),
      ),
    [history],
  )
  const completedKeys = useMemo(
    () =>
      new Set([
        ...persistedCompletionKeys,
        ...(sessionCompletionState.ownerId === currentUserId
          ? sessionCompletionState.keys
          : []),
      ]),
    [currentUserId, persistedCompletionKeys, sessionCompletionState],
  )

  const selectedTopic = studyTopicOptions.find((topic) => topic.id === selectedTopicId)
  const selectedLevel = studyLevelOptions.find((level) => level.id === selectedLevelId)
  const activePath = useMemo(
    () =>
      selectedTopicId && selectedLevelId
        ? getStudyLearningPath(selectedTopicId, selectedLevelId)
        : null,
    [selectedLevelId, selectedTopicId],
  )
  const activeLesson =
    activePath?.lessons.find((lesson) => lesson.id === activeLessonId) ??
    activePath?.lessons[0] ??
    null
  const activePathCompletedCount = activePath
    ? activePath.lessons.filter((lesson) =>
        completedKeys.has(getLessonCompletionKey(activePath, lesson)),
      ).length
    : 0
  const activePathProgress = activePath
    ? Math.round((activePathCompletedCount / activePath.lessons.length) * 100)
    : 0
  const activeLessonCompleted = Boolean(
    activePath &&
      activeLesson &&
      completedKeys.has(getLessonCompletionKey(activePath, activeLesson)),
  )

  const latestHistory = history[0] ?? null
  const continuePath = latestHistory
    ? getStudyLearningPath(latestHistory.topicId, latestHistory.levelId)
    : null
  const declaredLevel = user?.knowledgeLevel === 'never' ? 'never-coded' : user?.knowledgeLevel === 'beginner' ? 'basic' : studyLevelOptions.find((level) => level.id === user?.knowledgeLevel)?.id
  const recommendation = recommendTraining(workspace, completedKeys, declaredLevel)
  const recommendationPath =
    recommendation?.path ??
    studyLearningPaths[0]
  const recommendationTopic = studyTopicOptions.find(
    (topic) => topic.id === recommendationPath.topicId,
  )
  const recommendationLevel = studyLevelOptions.find(
    (level) => level.id === recommendationPath.levelId,
  )
  const recommendationResources = [
    ...recommendationPath.lessons[0].recommendedVideos.map((resource) => ({
      ...resource,
      type: 'Vídeo',
    })),
    ...recommendationPath.lessons[0].trustedResources.map((resource) => ({
      ...resource,
      type: 'Documentação',
    })),
  ].slice(0, 2)

  const scoutMessage = feedbackMessage
    ? feedbackTone === 'error'
      ? 'O registro encontrou um problema. Sua aula continua disponível para tentar novamente.'
      : isAuthenticated
        ? 'Boa! Aula registrada. Seu histórico já está atualizado.'
        : 'Boa! Aula concluída nesta sessão. Faça login apenas se quiser guardar.'
    : activePath
      ? 'Trilha pronta. Você escolhe o ritmo e pode abrir qualquer aula.'
      : selectedTopicId && selectedLevelId
        ? 'Essa combinação ainda está em preparação. Deixei uma recomendação para você.'
        : selectedTopicId
          ? 'Ótima escolha. Agora selecione o nível que representa seu momento.'
          : 'Escolha um tema e um nível. Eu organizo o próximo passo.'

  const isCompleted = (path: StudyLearningPath, lesson: StudyLesson) =>
    completedKeys.has(getLessonCompletionKey(path, lesson))

  const getFirstPendingLesson = (path: StudyLearningPath) =>
    path.lessons.find((lesson) => !isCompleted(path, lesson)) ?? path.lessons[0]

  const clearFeedback = () => {
    setFeedbackMessage('')
    setFeedbackTone('success')
  }

  const updateWorkspace = (next: TrainingWorkspace) => {
    setWorkspace(next)
    if (!saveTrainingWorkspace(currentUserId, next)) {
      setFeedbackMessage('Não foi possível salvar no navegador. Suas escolhas continuam nesta sessão.')
      setFeedbackTone('error')
    }
  }

  useEffect(() => {
    const onStorage = () => {
      setWorkspace(readTrainingWorkspace(currentUserId))
      setHistoryState({ ownerId: currentUserId, records: getCompletedStudyLessons(currentUserId) })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [currentUserId])

  useEffect(() => {
    if (activePath && activeLesson) {
      saveTrainingWorkspace(currentUserId, { ...readTrainingWorkspace(currentUserId), visited: { pathId: activePath.id, lessonId: activeLesson.id } })
    }
  }, [activePath, activeLesson, currentUserId])

  const handleTopicSelect = (topicId: StudyTopicId) => {
    const nextPath = selectedLevelId
      ? getStudyLearningPath(topicId, selectedLevelId)
      : null

    setParams({ topic: topicId, ...(selectedLevelId ? { level: selectedLevelId } : {}), ...(nextPath ? { lesson: getFirstPendingLesson(nextPath).id } : {}) })
    clearFeedback()
  }

  const handleLevelSelect = (levelId: StudyLevelId) => {
    const nextPath = selectedTopicId
      ? getStudyLearningPath(selectedTopicId, levelId)
      : null

    setParams({ level: levelId, ...(selectedTopicId ? { topic: selectedTopicId } : {}), ...(nextPath ? { lesson: getFirstPendingLesson(nextPath).id } : {}) })
    clearFeedback()
  }

  const openPath = (path: StudyLearningPath, preferredLessonId?: string) => {
    const preferredLesson = path.lessons.find(
      (lesson) => lesson.id === preferredLessonId,
    )
    const lesson = preferredLesson ?? getFirstPendingLesson(path)

    clearFeedback()
    setParams({ topic: path.topicId, level: path.levelId, lesson: lesson.id })
    updateWorkspace({ ...workspace, visited: { pathId: path.id, lessonId: lesson.id } })
    requestAnimationFrame(() => document.getElementById('active-path-title')?.focus())
  }

  const handleCompleteLesson = () => {
    if (!activePath || !activeLesson || activeLessonCompleted) return

    const completionKey = getLessonCompletionKey(activePath, activeLesson)
    const input = {
      topicId: activePath.topicId,
      topicLabel: selectedTopic?.label ?? activePath.topicId,
      levelId: activePath.levelId,
      levelLabel: selectedLevel?.label ?? activePath.levelId,
      lessonId: activeLesson.id,
      lessonTitle: activeLesson.title,
      lessonTheme: activeLesson.lessonTheme,
      strengths: activeLesson.suggestedStrengths,
      reinforcements: activeLesson.suggestedReinforcements,
    }
    if (currentUserId) getUserProgress(currentUserId)
    const result = saveCompletedStudyLesson(currentUserId, input)

    if (result.reason === 'anonymous-user') {
      setSessionCompletionState((current) => ({
        ownerId: currentUserId,
        keys: new Set([
          ...(current.ownerId === currentUserId ? current.keys : []),
          completionKey,
        ]),
      }))
      setFeedbackMessage(
        'Aula concluída nesta sessão! Entre para salvar XP, nível e conquistas.',
      )
      setFeedbackTone('info')
      return
    }

    if (!result.persisted) {
      setFeedbackMessage(
        'A aula foi finalizada, mas o histórico não pôde ser salvo neste dispositivo.',
      )
      setFeedbackTone('error')
      return
    }

    const xpResult = result.alreadyCompleted
      ? null
      : addXP(
          currentUserId,
          getStudyLessonXP(activePath.levelId),
          'study',
          activeLesson.id,
          {
            topicId: activePath.topicId,
            topic: input.topicLabel,
            levelId: activePath.levelId,
            level: input.levelLabel,
            lesson: activeLesson.title,
          },
        )

    setHistoryState({ ownerId: currentUserId, records: result.history })
    if (workspace.failure?.lessonId === activeLesson.id) updateWorkspace({ ...workspace, failure: null })
    const progressFeedback = !xpResult
      ? 'Aula concluída! Registrei seus pontos fortes e o próximo foco.'
      : xpResult.persisted
        ? [
            `Aula concluída! +${xpResult.xpAwarded} XP.`,
            xpResult.leveledUp ? `Nível atualizado: ${xpResult.progress.level}!` : '',
            xpResult.newAchievements.length
              ? `Nova conquista desbloqueada: ${xpResult.newAchievements.map((item) => item.name).join(', ')}!`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
        : 'A aula e o histórico foram salvos, mas o XP não pôde ser registrado neste dispositivo.'

    setFeedbackMessage(
      result.alreadyCompleted || xpResult?.duplicate
        ? 'Esta aula já estava concluída e não concede XP repetido.'
        : progressFeedback,
    )
    setFeedbackTone(xpResult && !xpResult.persisted ? 'error' : 'success')
  }

  return (
    <div className="page-container study-hub">
      <StudiesIntro isAuthenticated={isAuthenticated} scoutMessage={scoutMessage} />

      <section className="study-hub-stats" aria-label="Resumo do Treinamento de Devs">
        <Card variant="premium" className="study-hub-stat">
          <span className="study-hub-stat__value">{studyTopicOptions.length}</span>
          <span className="study-hub-stat__label">Temas para explorar</span>
        </Card>
        <Card variant="premium" className="study-hub-stat">
          <span className="study-hub-stat__value text-primary">
            {studyLearningPaths.length}
          </span>
          <span className="study-hub-stat__label">Trilhas iniciais</span>
        </Card>
        <Card variant="premium" className="study-hub-stat">
          <span className="study-hub-stat__value">{history.length}</span>
          <span className="study-hub-stat__label">Aulas no histórico</span>
        </Card>
        <Card variant="premium" className="study-hub-stat">
          <span className="study-hub-stat__value text-primary">
            {isAuthenticated ? 'Ativo' : 'Livre'}
          </span>
          <span className="study-hub-stat__label">
            {isAuthenticated ? 'Histórico por usuário' : 'Acesso sem login'}
          </span>
        </Card>
      </section>

      <TrainingExplorer completed={completedKeys} workspace={workspace} latestPathId={continuePath?.id} onOpen={openPath} onWorkspace={updateWorkspace} />

      <StudyPathSelector
        selectedTopic={selectedTopic}
        selectedLevel={selectedLevel}
        activePath={activePath}
        onTopicSelect={handleTopicSelect}
        onLevelSelect={handleLevelSelect}
      />

      {activePath && activeLesson && selectedLevel && (
        <section className="study-hub-section" aria-labelledby="active-path-title">
          <div className="study-hub-section__heading study-hub-section__heading--path">
            <div>
              <span className="study-hub-eyebrow">Trilha recomendada pelo Scout</span>
              <h2 id="active-path-title" tabIndex={-1}>{activePath.title}</h2>
              <p>{activePath.description}</p>
              <p>Pré-requisito recomendado: {modulePrerequisite(activePath)?.title ?? 'nenhum; comece com os exemplos'}. Você pode navegar livremente.</p>
              {activePath.topicId === 'frontend' && <p>Para os exemplos de interface, conheça HTML/CSS e JavaScript (funções e Promises). Os trechos TSX são introduções a componentes, não um curso completo de React/TypeScript.</p>}
              {activePath.topicId === 'backend' && <p>Os exemplos de APIs são recortes conceituais: pressupõem funções, HTTP e um servidor configurado. Não são aplicações completas para copiar e executar.</p>}
            </div>
            <div className="study-path-progress">
              <strong>
                {activePathCompletedCount}/{activePath.lessons.length} aulas ·{' '}
                {activePathProgress}%
              </strong>
              <ProgressBar value={activePathProgress} max={100} size="sm" showValue={false} />
            </div>
          </div>

          <div className="study-learning-layout">
            <aside className="study-lesson-nav" aria-label="Aulas da trilha">
              {activePath.lessons.map((lesson, index) => {
                const lessonIsActive = lesson.id === activeLesson.id
                const lessonIsCompleted = isCompleted(activePath, lesson)

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className={`study-lesson-nav__item focus-ring ${lessonIsActive ? 'is-active' : ''} ${lessonIsCompleted ? 'is-completed' : ''}`}
                    aria-current={lessonIsActive ? 'step' : undefined}
                    onClick={() => {
                      openPath(activePath, lesson.id)
                    }}
                  >
                    <span className="study-lesson-nav__number">
                      {lessonIsCompleted ? '✓' : String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <small>{lessonIsCompleted ? 'Concluída' : lessonIsActive ? 'Atual' : lesson.id === getFirstPendingLesson(activePath).id ? 'Recomendada' : 'Disponível'}</small>
                      <strong>{lesson.title}</strong>
                    </span>
                  </button>
                )
              })}

              <div className="study-lesson-nav__tip">
                <span aria-hidden="true">◆</span>
                <p>Abra qualquer aula. A ordem é uma recomendação, nunca um bloqueio.</p>
              </div>
            </aside>

            <article className={`study-lesson-card ${activeLessonCompleted ? 'is-completed' : ''}`}>
              <header className="study-lesson-card__header">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="gold">{activeLesson.lessonTheme}</Badge>
                    <Badge variant="default" className="normal-case tracking-normal">
                      {selectedLevel.label}
                    </Badge>
                    {activeLessonCompleted && <Badge variant="success">Concluída</Badge>}
                  </div>
                  <h2>{activeLesson.title}</h2>
                  <p><strong>Objetivo:</strong> {activeLesson.shortDescription}</p>
                  <Button size="sm" variant="secondary" aria-pressed={workspace.favorites.includes(activeLesson.id)} onClick={() => updateWorkspace({ ...workspace, favorites: workspace.favorites.includes(activeLesson.id) ? workspace.favorites.filter((id) => id !== activeLesson.id) : [...workspace.favorites, activeLesson.id] })}>{workspace.favorites.includes(activeLesson.id) ? 'Remover favorito' : 'Salvar favorito'}</Button>
                </div>
                <span className="study-lesson-card__topic-mark">
                  {topicMarks[activePath.topicId]}
                </span>
              </header>

              <div className="study-lesson-card__body">
                <section className="study-content-block">
                  <span className="study-content-block__label">Explicação do Scout</span>
                  <p>{activeLesson.explanation}</p>
                  <div className="study-analogy">
                    <span aria-hidden="true">◆</span>
                    <div>
                      <strong>Analogia simples</strong>
                      <p>{activeLesson.analogy}</p>
                    </div>
                  </div>
                  <div className="study-level-note">
                    <strong>Ajuste para {selectedLevel.label}</strong>
                    <p>{levelFocus[selectedLevel.id]}</p>
                  </div>
                </section>

                <section className="study-content-block">
                  <span className="study-content-block__label">Exemplo de código</span>
                  <div className="study-code-window">
                    <div className="study-code-window__bar">
                      <span />
                      <span />
                      <span />
                      <small>{activeLesson.codeExample.language}</small>
                    </div>
                    <pre><code>{activeLesson.codeExample.code}</code></pre>
                  </div>
                </section>

                <section className="study-content-block">
                  <span className="study-content-block__label">Explicação linha por linha</span>
                  <div className="study-code-walkthrough">
                    {activeLesson.codeExample.lineByLine.map((line, index) => (
                      <div key={`${activeLesson.id}-${index}`}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <code>{line.line}</code>
                        <p>{line.explanation}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="study-content-grid">
                  <section className="study-content-block study-common-errors">
                    <span className="study-content-block__label">Erros comuns</span>
                    <ul>
                      {activeLesson.commonMistakes.map((mistake) => (
                        <li key={mistake}>{mistake}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="study-content-block study-mini-activity">
                    <span className="study-content-block__label">Mini atividade</span>
                    <strong>{activeLesson.miniActivity.title}</strong>
                    <p>{activeLesson.miniActivity.instructions}</p>
                    <strong>Resultado esperado · autoavaliação</strong>
                    <ul className="study-activity-criteria">
                      {activeLesson.miniActivity.successCriteria.map((criterion) => (
                        <li key={criterion}>{criterion}</li>
                      ))}
                    </ul>
                  </section>
                </div>

                <LessonPractice key={activeLesson.id} lessonId={activeLesson.id} />

                <section className="study-content-block"><h3>Próximo passo</h3>
                  <p>{activePath.lessons[activePath.lessons.indexOf(activeLesson) + 1]?.title ?? 'Revise o módulo e aplique os conceitos no projeto do curso.'}</p>
                  {activePath.lessons[activePath.lessons.indexOf(activeLesson) + 1] && <Button variant="secondary" onClick={() => openPath(activePath, activePath.lessons[activePath.lessons.indexOf(activeLesson) + 1].id)}>Próxima aula</Button>}
                </section>

                <section className="study-content-block">
                  <span className="study-content-block__label">Materiais complementares</span>
                  <p className="study-resources-intro">
                    A aula é original do DevRoyale. Estes links servem apenas para ampliar
                    sua prática.
                  </p>
                  <div className="study-resource-grid">
                    {activeLesson.recommendedVideos.map((resource) => (
                      <a
                        key={resource.url}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="study-resource-link focus-ring"
                      >
                        <span>▶</span>
                        <span>
                          <small>Vídeo recomendado</small>
                          <strong>{resource.title}</strong>
                          <p>{resource.description}</p>
                        </span>
                      </a>
                    ))}
                    {activeLesson.trustedResources.map((resource) => (
                      <a
                        key={resource.url}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="study-resource-link focus-ring"
                      >
                        <span>↗</span>
                        <span>
                          <small>Fonte confiável</small>
                          <strong>{resource.title}</strong>
                          <p>{resource.description}</p>
                        </span>
                      </a>
                    ))}
                  </div>
                </section>

                {feedbackMessage && (
                  <div
                    className={`study-completion-feedback study-completion-feedback--${feedbackTone}`}
                    role={feedbackTone === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                  >
                    <span aria-hidden="true">✓</span>
                    <p>{feedbackMessage}</p>
                  </div>
                )}

                <footer className="study-lesson-card__footer">
                  <div>
                    <span>{isAuthenticated ? 'Histórico local por usuário' : 'Conclusão da sessão'}</span>
                    <p>
                      {isAuthenticated
                        ? 'Tema, nível, data e focos ficam neste navegador, separados por usuário. Não há sincronização entre dispositivos.'
                        : 'Estude livremente. Entre para salvar XP, nível e conquistas.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={activeLessonCompleted ? 'secondary' : 'gold'}
                    size="lg"
                    disabled={activeLessonCompleted}
                    onClick={handleCompleteLesson}
                  >
                    {activeLessonCompleted ? 'Aula concluída' : 'Concluir aula'}
                  </Button>
                </footer>
              </div>
            </article>
          </div>
          <ProjectChecklist id={`course:${activePath.topicId}`} project={trainingProjects[activePath.topicId]} workspace={workspace} onWorkspace={updateWorkspace} />
        </section>
      )}

      <section className="study-hub-section" aria-labelledby="scout-recommendation-title">
        <div className="study-hub-section__heading">
          <div>
            <span className="study-hub-eyebrow">Próximo passo possível</span>
            <h2 id="scout-recommendation-title">Recomendado pelo Scout</h2>
          </div>
        </div>
        <div className="study-recommendation-grid">
          <Card variant="premium" className="study-recommendation-card">
            <span className="study-recommendation-card__mark">
              {topicMarks[recommendationPath.topicId]}
            </span>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="gold">{recommendationTopic?.label}</Badge>
                <Badge variant="default" className="normal-case tracking-normal">
                  {recommendationLevel?.label}
                </Badge>
              </div>
              <h3>{recommendationPath.title}</h3>
              <p>{recommendation?.reason ?? 'Você concluiu todas as aulas disponíveis. Escolha um projeto ou pratique na Arena.'}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="study-recommendation-card__action"
                onClick={() => openPath(recommendationPath, recommendation?.lesson.id)}
              >
                Abrir recomendação
              </Button>
            </div>
          </Card>
          {recommendationResources.map((resource) => (
            <a
              key={`recommendation-${resource.url}`}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="study-recommendation-resource focus-ring"
            >
              <span>{resource.type === 'Vídeo' ? '▶' : '↗'}</span>
              <small>{resource.type}</small>
              <strong>{resource.title}</strong>
              <p>{resource.description}</p>
            </a>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section className="study-hub-section" aria-labelledby="study-history-title">
          <div className="study-hub-section__heading">
            <div>
              <span className="study-hub-eyebrow">Sua evolução registrada</span>
              <h2 id="study-history-title">Aulas concluídas</h2>
            </div>
            <Badge variant="default">{history.length} registros</Badge>
          </div>
          <div className="study-history-list">
            {history.slice(0, 4).map((entry) => (
              <Card key={entry.id} variant="premium" className="study-history-card">
                <div className="study-history-card__topline">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="gold">{entry.topicLabel}</Badge>
                    <Badge variant="default" className="normal-case tracking-normal">
                      {entry.levelLabel}
                    </Badge>
                  </div>
                  <time dateTime={entry.completedAt}>
                    {formatHistoryDate(entry.completedAt)}
                  </time>
                </div>
                <h3>{entry.lessonTitle}</h3>
                <p className="study-history-card__theme">{entry.lessonTheme}</p>
                <div className="study-history-card__insights">
                  <div>
                    <strong>Pontos fortes sugeridos</strong>
                    <p>{entry.strengths.join(' · ')}</p>
                  </div>
                  <div>
                    <strong>Pontos a reforçar</strong>
                    <p>{entry.reinforcements.join(' · ')}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function AreaEstudosPage() {
  const { user } = useAuth()
  return <AreaEstudosContent key={user?.id ?? 'guest'} />
}
