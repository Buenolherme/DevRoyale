import { useMemo, useState } from 'react'
import { AchievementInsignia } from '@/components/progress'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import type { AchievementSummary, UserProgress } from '@/types'
import { getAchievementProgress } from '@/utils'

interface ProfileAchievementsPanelProps {
  progress: UserProgress
  summary: AchievementSummary
}

export function ProfileAchievementsPanel({
  progress,
  summary,
}: ProfileAchievementsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unlockedAchievements = useMemo(
    () =>
      [...summary.unlockedAchievements].sort((left, right) =>
        right.unlockedAt.localeCompare(left.unlockedAt),
      ),
    [summary.unlockedAchievements],
  )
  const lockedAchievements = useMemo(
    () =>
      summary.nextAchievements
        .map((achievement) => ({
          achievement,
          progress: getAchievementProgress(progress, achievement),
        }))
        .sort(
          (left, right) =>
            left.progress.remaining - right.progress.remaining ||
            right.progress.percentage - left.progress.percentage,
        ),
    [progress, summary.nextAchievements],
  )

  return (
    <>
      <Card variant="premium" className="mb-6">
        <CardContent className="flex flex-col gap-5 py-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="profile-eyebrow">Hall de insígnias</span>
            <h2 className="mt-1 text-xl font-bold text-foreground">Conquistas</h2>
            <p className="mt-2 text-sm text-muted">
              {summary.unlocked} de {summary.total} conquistas desbloqueadas.
            </p>
          </div>
          <Button
            type="button"
            variant={isOpen ? 'secondary' : 'gold'}
            aria-expanded={isOpen}
            aria-controls="profile-achievements-panel"
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? 'Ocultar conquistas' : 'Ver conquistas'}
          </Button>
        </CardContent>
      </Card>

      {isOpen && (
        <Card
          id="profile-achievements-panel"
          variant="premium"
          className="mb-6"
          aria-label="Lista completa de conquistas"
        >
          <CardContent className="space-y-7">
            <section aria-labelledby="profile-unlocked-achievements">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="profile-unlocked-achievements" className="text-base font-bold text-foreground">
                    Conquistas desbloqueadas
                  </h2>
                  <p className="mt-1 text-xs text-muted">Insígnias conquistadas e suas datas.</p>
                </div>
                <Badge variant="success">{unlockedAchievements.length} conquistadas</Badge>
              </div>
              {unlockedAchievements.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {unlockedAchievements.map((achievement) => (
                    <AchievementInsignia
                      key={achievement.id}
                      achievement={achievement}
                      progress={getAchievementProgress(progress, achievement)}
                      unlockedAt={achievement.unlockedAt}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted">
                  Conclua sua primeira atividade para iniciar o hall.
                </div>
              )}
            </section>

            <section className="border-t border-border pt-6" aria-labelledby="profile-locked-achievements">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="profile-locked-achievements" className="text-base font-bold text-foreground">
                    Conquistas bloqueadas
                  </h2>
                  <p className="mt-1 text-xs text-muted">Veja o requisito e seu progresso atual.</p>
                </div>
                <Badge variant="default">{lockedAchievements.length} bloqueadas</Badge>
              </div>
              {lockedAchievements.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {lockedAchievements.map(({ achievement, progress: achievementProgress }) => (
                    <AchievementInsignia
                      key={achievement.id}
                      achievement={achievement}
                      progress={achievementProgress}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-secondary/25 bg-secondary-muted/30 p-5 text-sm text-foreground">
                  Todas as conquistas foram desbloqueadas. Hall completo.
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      )}
    </>
  )
}
