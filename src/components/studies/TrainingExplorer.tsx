import { useState } from 'react'
import { Badge, Button, Card, Input, ProgressBar, Select } from '@/components/ui'
import { studyLearningPaths, studyLevelOptions, studyTopicOptions } from '@/data/studyLearningPaths'
import { trainingCareers, trainingProjects, type TrainingProject } from '@/data/trainingCatalog'
import type { StudyLearningPath, StudyLevelId } from '@/types'
import { continueTraining, searchTraining, trainingProgress, type TrainingFilter, type TrainingWorkspace } from '@/utils/training'

interface Props {
  completed: ReadonlySet<string>
  workspace: TrainingWorkspace
  latestPathId?: string
  onOpen: (path: StudyLearningPath, lessonId?: string) => void
  onWorkspace: (next: TrainingWorkspace) => void
}

export function ProjectChecklist({ id, project, workspace, onWorkspace }: { id: string; project: TrainingProject; workspace: TrainingWorkspace; onWorkspace: Props['onWorkspace'] }) {
  const keys = project.criteria.map((_, i) => `${id}:${i}`)
  const done = keys.filter((key) => workspace.projectChecks.includes(key)).length
  return <section className="training-project" aria-label={`Projeto: ${project.title}`}>
    <h3>{project.title}</h3>
    <p>Projeto prático · checklist de autoavaliação ({done}/{keys.length}). Sem correção automática, XP ou envio ao servidor.</p>
    {project.criteria.map((criterion, index) => <label key={keys[index]} className="training-check">
      <input type="checkbox" checked={workspace.projectChecks.includes(keys[index])} onChange={(event) => onWorkspace({ ...workspace, projectChecks: event.target.checked ? [...workspace.projectChecks, keys[index]] : workspace.projectChecks.filter((key) => key !== keys[index]) })} />
      <span>{criterion}</span>
    </label>)}
  </section>
}

export function TrainingExplorer({ completed, workspace, latestPathId, onOpen, onWorkspace }: Props) {
  const [dimension, setDimension] = useState<'technology' | 'career'>('technology')
  const [careerId, setCareerId] = useState(trainingCareers[0].id)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<TrainingFilter>('all')
  const [level, setLevel] = useState<StudyLevelId | ''>('')
  const continuation = continueTraining(workspace.visited, completed, latestPathId)
  const results = searchTraining(query, completed, filter, workspace.favorites, level || undefined)
  const filtering = Boolean(query.trim() || filter !== 'all' || level)
  const career = trainingCareers.find((c) => c.id === careerId)!
  const modules = career.modules.flatMap((id) => studyLearningPaths.filter((path) => path.id === id))
  const progress = trainingProgress(modules, completed)
  const recommended = modules.find((path) => trainingProgress([path], completed).percent < 100)?.id
  const projects = Object.entries(trainingProjects).filter(([id, p]) => p.criteria.every((_, index) => workspace.projectChecks.includes(`course:${id}:${index}`))).length
  return <section className="study-hub-section training-explorer" aria-label="Explorar treinamento">
    <Card variant="premium" className="study-continue-card">
      <div><span className="study-hub-eyebrow">Continuar treinamento</span>
        {continuation ? <><h2>{studyTopicOptions.find((t) => t.id === continuation.path.topicId)?.label}</h2><p>Módulo: {continuation.path.title}</p><p>Aula: {continuation.lesson.title} · {trainingProgress(studyLearningPaths.filter((p) => p.topicId === continuation.path.topicId), completed).percent}% do curso</p></> : <><h2>Prepare sua próxima batalha</h2><p>Nenhuma aula em andamento. Escolha um curso ou uma carreira abaixo.</p></>}
        <small>Progresso, favoritos e {projects} projeto(s) de curso autoavaliado(s) ficam somente neste navegador.</small>
      </div>
      {continuation && <Button variant="gold" onClick={() => onOpen(continuation.path, continuation.lesson.id)}>Continuar</Button>}
    </Card>
    <div className="training-toolbar">
      <Input label="Buscar curso, módulo, aula ou conceito" value={query} placeholder="Ex.: array, loop, SELECT, API, flexbox" onChange={(e) => setQuery(e.target.value)} />
      <Select label="Progresso" value={filter} onChange={(e) => setFilter(e.target.value as TrainingFilter)} options={[{ value: 'all', label: 'Todos' }, { value: 'progress', label: 'Módulos em andamento' }, { value: 'completed', label: 'Aulas concluídas' }, { value: 'new', label: 'Módulos não iniciados' }, { value: 'favorites', label: 'Favoritos' }]} />
      <Select label="Dificuldade" value={level} onChange={(e) => setLevel(e.target.value as StudyLevelId | '')} options={[{ value: '', label: 'Todos os níveis' }, ...studyLevelOptions.map((l) => ({ value: l.id, label: l.label }))]} />
    </div>
    {filtering ? <div className="training-results" aria-live="polite">
      <h2>{results.length} aula(s) encontrada(s)</h2>
      {!results.length && <p>Nenhuma aula corresponde. Tente outro conceito ou <button className="text-primary focus-ring" onClick={() => { setQuery(''); setFilter('all'); setLevel('') }}>limpe os filtros</button>. Para favoritar, abra uma aula e use “Salvar favorito”.</p>}
      {results.map(({ path, lesson }) => <button type="button" key={lesson.id} className="training-result focus-ring" onClick={() => onOpen(path, lesson.id)}><strong>{lesson.title}</strong><span>{path.title} · {lesson.lessonTheme}</span></button>)}
    </div> : <>
      <div className="training-dimensions" role="group" aria-label="Organização do treinamento">
        <Button variant={dimension === 'technology' ? 'gold' : 'secondary'} aria-pressed={dimension === 'technology'} onClick={() => setDimension('technology')}>Tecnologias</Button>
        <Button variant={dimension === 'career' ? 'gold' : 'secondary'} aria-pressed={dimension === 'career'} onClick={() => setDimension('career')}>Carreiras</Button>
      </div>
      {dimension === 'technology' ? <div className="training-courses">{studyTopicOptions.map((topic) => {
        const paths = studyLearningPaths.filter((path) => path.topicId === topic.id).sort((a, b) => studyLevelOptions.findIndex((l) => l.id === a.levelId) - studyLevelOptions.findIndex((l) => l.id === b.levelId))
        const course = trainingProgress(paths, completed)
        const next = paths.find((path) => trainingProgress([path], completed).percent < 100) ?? paths[0]
        return <Card key={topic.id} variant="premium" className="training-course"><h3>{topic.label}</h3><p>{topic.description}</p><strong>{course.done}/{course.total} aulas · {course.percent}%</strong><ProgressBar value={course.percent} max={100} showValue={false} /><Button variant="secondary" onClick={() => onOpen(next)}>{course.done ? 'Abrir curso' : 'Começar curso'}</Button></Card>
      })}</div> : <div className="training-career">
        <Select label="Carreira recomendada" value={careerId} onChange={(e) => setCareerId(e.target.value)} options={trainingCareers.map((c) => ({ value: c.id, label: c.title }))} />
        <h2>{career.title}</h2><p>{career.description}</p>
        <p>{progress.done}/{progress.total} aulas disponíveis · {progress.percent}% {career.future ? 'da preparação disponível' : 'do percurso'}. As etapas são recomendações, sem bloqueios.</p>
        {career.future && <p className="training-notice"><strong>Conteúdo futuro:</strong> {career.future}</p>}
        <ol className="training-roadmap">{modules.map((path, index) => {
          const module = trainingProgress([path], completed)
          const status = module.percent === 100 ? 'Concluído' : path.id === workspace.visited?.pathId ? 'Atual' : path.id === recommended ? 'Recomendado' : 'Disponível'
          return <li key={path.id}><span aria-hidden="true">{module.percent === 100 ? '✓' : index + 1}</span><div><Badge variant={module.percent === 100 ? 'success' : 'default'}>{status}</Badge><h3>{path.title}</h3><p>{path.description}</p><small>{module.done}/{module.total} aulas</small></div><Button variant="secondary" size="sm" onClick={() => onOpen(path)}>Abrir etapa</Button></li>
        })}</ol>
        <ProjectChecklist id={`career:${career.id}`} project={career.project} workspace={workspace} onWorkspace={onWorkspace} />
      </div>}
    </>}
  </section>
}
