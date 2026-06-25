import { Badge, Card } from '@/components/ui'
import { studyLevelOptions, studyTopicOptions } from '@/data/studyLearningPaths'
import type {
  StudyLearningPath,
  StudyLevelId,
  StudyLevelOption,
  StudyTopicId,
  StudyTopicOption,
} from '@/types'
import { levelPaces, topicMarks } from './studyPresentation'

interface StudyPathSelectorProps {
  selectedTopic: StudyTopicOption | undefined
  selectedLevel: StudyLevelOption | undefined
  activePath: StudyLearningPath | null
  onTopicSelect: (topicId: StudyTopicId) => void
  onLevelSelect: (levelId: StudyLevelId) => void
}

export function StudyPathSelector({
  selectedTopic,
  selectedLevel,
  activePath,
  onTopicSelect,
  onLevelSelect,
}: StudyPathSelectorProps) {
  return (
    <>
      <section className="study-hub-section" aria-labelledby="build-path-title">
        <div className="study-hub-section__heading">
          <div>
            <span className="study-hub-eyebrow">Seu ponto de partida</span>
            <h2 id="build-path-title">Escolha tema e nível</h2>
            <p>As escolhas só personalizam a recomendação. Não são uma prova.</p>
          </div>
          <Badge variant={selectedTopic && selectedLevel ? 'success' : 'default'}>
            {selectedTopic && selectedLevel ? 'Escolhas definidas' : '2 escolhas'}
          </Badge>
        </div>

        <Card variant="premium" className="study-path-builder">
          <div className="study-path-builder__step">
            <div className="study-path-builder__step-heading">
              <span>1</span>
              <div>
                <h3>O que você quer aprender?</h3>
                <p>Escolha uma linguagem ou área para orientar o Scout.</p>
              </div>
            </div>
            <div className="study-topic-grid">
              {studyTopicOptions.map((topic) => {
                const isSelected = topic.id === selectedTopic?.id

                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={`study-topic-option focus-ring ${isSelected ? 'is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => onTopicSelect(topic.id)}
                  >
                    <span className="study-topic-option__icon">{topicMarks[topic.id]}</span>
                    <span>
                      <strong>{topic.label}</strong>
                      <small>{topic.description}</small>
                    </span>
                    <span className="study-option-check" aria-hidden="true">
                      {isSelected ? '✓' : '→'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="study-path-builder__divider" />

          <div className="study-path-builder__step">
            <div className="study-path-builder__step-heading">
              <span>2</span>
              <div>
                <h3>Qual é o seu nível agora?</h3>
                <p>Escolha a opção mais próxima da sua confiança atual.</p>
              </div>
            </div>
            <div className="study-level-grid">
              {studyLevelOptions.map((level) => {
                const isSelected = level.id === selectedLevel?.id

                return (
                  <button
                    key={level.id}
                    type="button"
                    className={`study-level-option focus-ring ${isSelected ? 'is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => onLevelSelect(level.id)}
                  >
                    <strong>{level.label}</strong>
                    <span>{level.description}</span>
                    <small>{levelPaces[level.id]}</small>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="study-path-builder__footer">
            <p>
              {!selectedTopic || !selectedLevel
                ? 'Selecione um tema e um nível para receber a recomendação.'
                : activePath
                  ? `${activePath.title} · ${activePath.lessons.length} aulas originais DevRoyale`
                  : `${selectedTopic.label} · ${selectedLevel.label} · trilha completa em preparação`}
            </p>
            <Badge variant={activePath ? 'gold' : 'default'}>
              {activePath ? 'Trilha recomendada' : 'Conteúdo inicial'}
            </Badge>
          </div>
        </Card>
      </section>

      {selectedTopic && selectedLevel && !activePath && (
        <section className="study-hub-section" aria-live="polite">
          <Card variant="premium" className="study-path-empty">
            <span className="study-path-empty__mark">◇</span>
            <div>
              <Badge variant="default">Em preparação</Badge>
              <h2>Esta combinação será a próxima expansão do Scout.</h2>
              <p>
                Você pode trocar o nível, escolher outro tema ou abrir a recomendação
                disponível abaixo. Batalha e Bug Arena continuam abertas normalmente.
              </p>
            </div>
          </Card>
        </section>
      )}
    </>
  )
}
