import { CrownIcon } from '@/components/layout'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ModeIcon,
  type ModeIconName,
} from '@/components/ui'
import type { ProgressActivity, ProgressActivityType } from '@/types'

const activityPresentation: Record<
  ProgressActivityType,
  { icon: ModeIconName | 'achievement'; label: string }
> = {
  lesson: { icon: 'studies', label: 'Aula concluída' },
  bug: { icon: 'bug', label: 'Bug corrigido' },
  battle: { icon: 'battle', label: 'Batalha concluída' },
  achievement: { icon: 'achievement', label: 'Conquista desbloqueada' },
}

function ActivityIcon({ type }: { type: ProgressActivityType }) {
  const icon = activityPresentation[type].icon
  return icon === 'achievement' ? <CrownIcon size={20} /> : <ModeIcon mode={icon} size={20} />
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function ProfileActivitySummary({ activities }: { activities: ProgressActivity[] }) {
  return (
    <Card variant="premium">
      <CardHeader>
        <CardTitle>Atividade recente</CardTitle>
        <CardDescription>Últimos registros do seu progresso real</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary-muted text-lg">
                  <ActivityIcon type={activity.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      {activity.title || activityPresentation[activity.type].label}
                    </p>
                    {activity.xpAwarded > 0 ? (
                      <Badge variant="gold">+{activity.xpAwarded} XP</Badge>
                    ) : activity.type === 'achievement' ? (
                      <Badge variant="gold">Insígnia</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {activityPresentation[activity.type].label} · {formatDate(activity.completedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center">
            <p className="font-semibold text-foreground">Nenhuma atividade registrada ainda</p>
            <p className="mt-2 text-sm text-muted">Seu progresso aparecerá aqui após a primeira atividade.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
