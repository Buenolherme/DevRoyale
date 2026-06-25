import scoutMecanicoImage from '@/assets/scout/scout-mecanico.png'
import { ScoutImage } from '@/components/layout'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import type { BugStudyRecommendation } from '@/utils/bugStudyRecommendation'

export type BugRecommendationMode = 'study' | 'random' | 'infinite'

interface BugScoutRecommendationProps {
  recommendation: BugStudyRecommendation
  mode: BugRecommendationMode | null
  feedback: string | null
  onStudyTraining: () => void
  onRandomChallenge: () => void
  onInfiniteTraining: () => void
}

export function BugScoutRecommendation({
  recommendation,
  mode,
  feedback,
  onStudyTraining,
  onRandomChallenge,
  onInfiniteTraining,
}: BugScoutRecommendationProps) {
  return (
    <section aria-labelledby="bug-study-recommendation-title" className="mb-6">
      <Card variant="premium" className="bug-scout-recommendation">
        <CardContent className="bug-scout-recommendation__layout">
          <div className="bug-scout-recommendation__visual">
            <span className="bug-scout-recommendation__bolt bug-scout-recommendation__bolt--top" />
            <span className="bug-scout-recommendation__bolt bug-scout-recommendation__bolt--bottom" />
            <ScoutImage
              src={scoutMecanicoImage}
              alt="Scout Mecânico analisando desafios da oficina"
              loading="eager"
              className="bug-scout-recommendation__scout"
            />
          </div>

          <div className="bug-scout-recommendation__content">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="gold">Scout Mecânico</Badge>
              <Badge variant={recommendation.hasHistory ? 'success' : 'default'}>
                {recommendation.hasHistory ? 'Baseado nos seus estudos' : 'Sem histórico'}
              </Badge>
              <Badge variant="default">Sugestão opcional</Badge>
            </div>
            <h2
              id="bug-study-recommendation-title"
              className="text-lg font-black tracking-tight text-foreground md:text-xl"
            >
              Scout Mecânico analisou seu progresso
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {recommendation.scoutMessage}
            </p>

            {recommendation.hasHistory && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Categorias recomendadas">
                {recommendation.categoryLabels.slice(0, 3).map((category) => (
                  <span key={category} className="bug-scout-recommendation__category">
                    {category}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs font-semibold text-secondary">
              {recommendation.latestStudy
                ? `Última aula: ${recommendation.latestStudy.lessonTitle}`
                : 'Nenhuma etapa é obrigatória: todos os modos da arena estão disponíveis.'}
            </p>
            {recommendation.hasHistory && (
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                <strong className="text-foreground">Motivo:</strong>{' '}
                {recommendation.reason}
              </p>
            )}
          </div>

          <div className="bug-scout-recommendation__actions">
            <p className="bug-scout-recommendation__actions-title">Escolha como treinar</p>
            <Button
              type="button"
              variant="gold"
              onClick={onStudyTraining}
              aria-pressed={mode === 'study'}
              fullWidth
            >
              Treinar com base nos meus estudos
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onRandomChallenge}
              aria-pressed={mode === 'random'}
              fullWidth
            >
              Bug novo aleatório
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onInfiniteTraining}
              aria-pressed={mode === 'infinite'}
              fullWidth
            >
              Treino infinito
            </Button>
          </div>

          {feedback && (
            <p className="bug-scout-recommendation__feedback" role="status" aria-live="polite">
              {feedback}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
