import { Card, CardContent } from '@/components/ui'
import type { UserProgress } from '@/types'

export function ProfileStats({ progress }: { progress: UserProgress }) {
  const stats = [
    { value: progress.completedLessons.length, label: 'Aulas concluídas', tone: 'text-secondary' },
    { value: progress.completedBugs.length, label: 'Bugs corrigidos', tone: 'text-primary' },
    { value: progress.completedBattles.length, label: 'Batalhas concluídas', tone: 'text-success' },
    { value: progress.totalXP.toLocaleString('pt-BR'), label: 'XP total', tone: 'text-secondary' },
  ]

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} variant="premium">
          <CardContent className="py-5">
            <p className={`text-3xl font-black ${stat.tone}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
