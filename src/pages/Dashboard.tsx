import { Link } from 'react-router-dom'
import { CrownIcon, PageHeader } from '@/components/layout'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ProgressBar,
  ModeIcon,
  type ModeIconName,
  getButtonClassName,
} from '@/components/ui'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/routes/paths'
import type { ProgressActivity, ProgressActivityType } from '@/types'
import { getKnowledgeLevelLabel, getMainLanguageLabel } from '@/types/auth'
import {
  createDefaultProfilePreferences,
  getAchievementProgress,
  getAchievementSummary,
  getUserProfilePreferences,
  getUserProgress,
} from '@/utils'

interface DashboardCard {
  title: string
  description: string
  icon: ModeIconName | 'profile'
  to: string
  accent: 'gold' | 'primary'
}

const dashboardCards: DashboardCard[] = [
  {
    title: 'Batalha de Devs',
    description: 'Enfrente desafios de código e ganhe XP.',
    icon: 'battle',
    to: ROUTES.BATALHA_DEVS,
    accent: 'primary' as const,
  },
  {
    title: 'Área dos Estudos',
    description: 'Continue suas trilhas de aprendizado.',
    icon: 'studies',
    to: ROUTES.AREA_ESTUDOS,
    accent: 'gold' as const,
  },
  {
    title: 'Bug Arena',
    description: 'Caçe e corrija bugs no código.',
    icon: 'bug',
    to: ROUTES.BUG_ARENA,
    accent: 'primary' as const,
  },
  {
    title: 'Perfil',
    description: 'Veja seu progresso, XP e conquistas.',
    icon: 'profile',
    to: ROUTES.PERFIL,
    accent: 'gold' as const,
  },
]

const activityPresentation: Record<
  ProgressActivityType,
  { icon: ModeIconName | 'achievement'; label: string }
> = {
  lesson: { icon: 'studies', label: 'Aula concluída' },
  bug: { icon: 'bug', label: 'Bug corrigido' },
  battle: { icon: 'battle', label: 'Batalha concluída' },
  achievement: { icon: 'achievement', label: 'Conquista desbloqueada' },
}

function ProgressIcon({ icon, size = 20 }: { icon: ModeIconName | 'achievement' | 'profile'; size?: number }) {
  return icon === 'achievement' || icon === 'profile' ? (
    <CrownIcon size={size} />
  ) : (
    <ModeIcon mode={icon} size={size} />
  )
}

function formatActivityDate(value: string | null) {
  if (!value) return 'Nenhuma atividade registrada'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getActivityTitle(activity: ProgressActivity) {
  return activity.title || activityPresentation[activity.type].label
}

export function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="page-container">
        <PageHeader
          title="Dashboard"
          description="Seu painel de progresso na arena DevRoyale."
        />
        <Card variant="premium" className="mx-auto max-w-2xl text-center">
          <CardHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary-muted text-2xl">
              🔐
            </div>
            <CardTitle>Seu progresso espera por você</CardTitle>
            <CardDescription>
              Entre na sua conta para salvar XP, conquistas e progresso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={ROUTES.LOGIN} className={getButtonClassName({ variant: 'primary' })}>
              Entrar na conta
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = getUserProgress(user.id)
  const achievementSummary = getAchievementSummary(user.id)
  const recentActivities = progress.activityHistory.slice(0, 4)
  const xpToNextLevel = Math.max(0, progress.nextLevelXP - progress.currentLevelXP)
  const profilePreferences = getUserProfilePreferences(
    user.id,
    createDefaultProfilePreferences(user.knowledgeLevel, user.mainLanguage),
  )
  const nextAchievement = achievementSummary.nextAchievements
    .map((achievement) => ({
      achievement,
      progress: getAchievementProgress(progress, achievement),
    }))
    .sort(
      (left, right) =>
        left.progress.remaining - right.progress.remaining ||
        right.progress.percentage - left.progress.percentage,
    )
    .at(0)
  const totalCompletions =
    progress.completedLessons.length +
    progress.completedBugs.length +
    progress.completedBattles.length

  return (
    <div className="page-container">
      <PageHeader
        title={`Olá, ${user.name}!`}
        description="Acompanhe sua evolução real em todos os modos do DevRoyale."
      >
        <Badge variant="gold" className="normal-case tracking-normal">
          Nível {progress.level}
        </Badge>
      </PageHeader>

      <Card variant="premium" className="mb-6">
        <CardContent className="flex flex-wrap gap-3 py-4">
          <Badge variant="default" className="normal-case tracking-normal">
            {getKnowledgeLevelLabel(profilePreferences.experienceLevel)}
          </Badge>
          <Badge variant="primary" className="normal-case tracking-normal">
            {getMainLanguageLabel(profilePreferences.favoriteLanguage)}
          </Badge>
        </CardContent>
      </Card>

      <Card variant="premium" className="mb-6 overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Progresso de nível</CardTitle>
              <CardDescription>
                {progress.totalXP.toLocaleString('pt-BR')} XP conquistados no total
              </CardDescription>
            </div>
            <div className="rounded-2xl border border-secondary/30 bg-secondary-muted px-5 py-3 text-center">
              <p className="text-2xl font-black text-secondary">{progress.level}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nível atual</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProgressBar
            value={progress.currentLevelXP}
            max={progress.nextLevelXP}
            label={`Progresso para o nível ${progress.level + 1}`}
          />
          <p className="mt-2 text-xs text-muted">
            Faltam <strong className="text-foreground">{xpToNextLevel} XP</strong> para o próximo nível.
          </p>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="premium">
          <CardContent className="py-5">
            <p className="text-3xl font-black text-secondary">{progress.completedLessons.length}</p>
            <p className="mt-1 text-sm text-muted">Aulas concluídas</p>
          </CardContent>
        </Card>
        <Card variant="premium">
          <CardContent className="py-5">
            <p className="text-3xl font-black text-primary">{progress.completedBugs.length}</p>
            <p className="mt-1 text-sm text-muted">Bugs corrigidos</p>
          </CardContent>
        </Card>
        <Card variant="premium">
          <CardContent className="py-5">
            <p className="text-3xl font-black text-success">{progress.completedBattles.length}</p>
            <p className="mt-1 text-sm text-muted">Batalhas concluídas</p>
          </CardContent>
        </Card>
        <Card variant="premium">
          <CardContent className="py-5">
            <p className="text-3xl font-black text-secondary">{achievementSummary.unlocked}</p>
            <p className="mt-1 text-sm text-muted">
              de {achievementSummary.total} conquistas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card variant="premium">
          <CardHeader>
            <CardTitle>Histórico recente</CardTitle>
            <CardDescription>Seus últimos registros de evolução na arena</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary-muted text-lg">
                      <ProgressIcon icon={activityPresentation[activity.type].icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {activityPresentation[activity.type].label}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                        {getActivityTitle(activity)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatActivityDate(activity.completedAt)}
                      </p>
                    </div>
                    {activity.xpAwarded > 0 ? (
                      <Badge variant="gold">+{activity.xpAwarded} XP</Badge>
                    ) : activity.type === 'achievement' ? (
                      <Badge variant="gold">Insígnia</Badge>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted">
                Sua primeira aula, correção de bug ou batalha aparecerá aqui.
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <CardTitle>Resumo da evolução</CardTitle>
            <CardDescription>Dados consolidados do progresso central</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
              <span className="text-sm text-muted">Atividades únicas concluídas</span>
              <strong className="text-xl text-foreground">{totalCompletions}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
              <span className="text-sm text-muted">Última atualização</span>
              <strong className="text-right text-sm text-foreground">
                {formatActivityDate(progress.lastActivityAt)}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="premium" className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Resumo de conquistas</CardTitle>
              <CardDescription>Uma visão rápida do seu hall de insígnias</CardDescription>
            </div>
            <Badge variant="gold">
              {achievementSummary.unlocked}/{achievementSummary.total} desbloqueadas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr_auto] md:items-center">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-2xl font-black text-secondary">{achievementSummary.unlocked}</p>
              <p className="mt-1 text-xs text-muted">Insígnias conquistadas</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              {nextAchievement ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Próxima conquista
                      </p>
                      <p className="mt-1 truncate font-semibold text-foreground">
                        {nextAchievement.achievement.name}
                      </p>
                    </div>
                    <Badge variant="default">{nextAchievement.progress.percentage}%</Badge>
                  </div>
                  <ProgressBar
                    value={nextAchievement.progress.current}
                    max={nextAchievement.progress.target}
                    showValue={false}
                    size="sm"
                    className="mt-3"
                  />
                </>
              ) : (
                <div>
                  <p className="font-semibold text-foreground">Hall completo</p>
                  <p className="mt-1 text-xs text-muted">Todas as insígnias foram desbloqueadas.</p>
                </div>
              )}
            </div>

            <Link
              to={ROUTES.PERFIL}
              className={getButtonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Ir para o Perfil
            </Link>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-lg font-bold text-foreground">Atalhos da Arena</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {dashboardCards.map((card) => (
          <Link key={card.to} to={card.to} className="focus-ring rounded-2xl">
            <Card hoverable variant="premium" className="h-full">
              <CardHeader>
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl border text-2xl ${
                    card.accent === 'gold'
                      ? 'border-secondary/30 bg-secondary-muted'
                      : 'border-primary/30 bg-primary-muted'
                  }`}
                >
                  <ProgressIcon icon={card.icon} size={24} />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
