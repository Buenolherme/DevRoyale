import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { CrownIcon, PageHeader } from '@/components/layout'
import {
  ProfileAchievementsPanel,
  ProfileActivitySummary,
  ProfileAvatar,
  ProfileStats,
} from '@/components/profile'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ProgressBar,
  Select,
  getButtonClassName,
} from '@/components/ui'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/routes/paths'
import type { AuthUser } from '@/types'
import {
  MAIN_LANGUAGE_OPTIONS,
  getKnowledgeLevelLabel,
  getMainLanguageLabel,
} from '@/types/auth'
import {
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_BIO_MAX_LENGTH,
  createDefaultProfilePreferences,
  getAchievementSummary,
  getUserProfilePreferences,
  getUserProgress,
  optimizeProfileAvatar,
  saveUserProfilePreferences,
  type ProfileExperienceLevel,
  type UserProfilePreferences,
} from '@/utils'

const experienceOptions: { value: ProfileExperienceLevel; label: string }[] = [
  { value: 'never', label: 'Nunca programei' },
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
]

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}

function VisitorProfile() {
  return (
    <div className="page-container">
      <PageHeader
        title="Perfil"
        description="Sua identidade e trajetória na arena DevRoyale."
      />
      <Card variant="premium" className="mx-auto max-w-2xl text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary-muted">
            <CrownIcon size={36} />
          </div>
          <CardTitle>Entre para acessar seu perfil</CardTitle>
          <CardDescription>
            Entre na sua conta para personalizar sua identidade e salvar progresso.
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

function AuthenticatedProfile({ user }: { user: AuthUser }) {
  const defaultPreferences = useMemo(
    () => createDefaultProfilePreferences(user.knowledgeLevel, user.mainLanguage),
    [user.knowledgeLevel, user.mainLanguage],
  )
  const [preferences, setPreferences] = useState<UserProfilePreferences>(() =>
    getUserProfilePreferences(user.id, defaultPreferences),
  )
  const [draft, setDraft] = useState(preferences)
  const [isEditing, setIsEditing] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isAvatarProcessing, setIsAvatarProcessing] = useState(false)

  const progress = useMemo(() => getUserProgress(user.id), [user.id])
  const achievementSummary = useMemo(() => getAchievementSummary(user.id), [user.id])
  const recentActivities = progress.activityHistory.slice(0, 6)
  const xpToNextLevel = Math.max(0, progress.nextLevelXP - progress.currentLevelXP)
  const visiblePreferences = isEditing ? draft : preferences

  const startEditing = () => {
    setDraft(preferences)
    setProfileFeedback(null)
    setProfileError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setDraft(preferences)
    setProfileError(null)
    setIsEditing(false)
  }

  const saveProfile = () => {
    const nextPreferences = {
      ...draft,
      bio: draft.bio.trim().slice(0, PROFILE_BIO_MAX_LENGTH),
    }

    if (!saveUserProfilePreferences(user.id, nextPreferences)) {
      setProfileError('Não foi possível salvar o perfil neste dispositivo.')
      return
    }

    setPreferences(nextPreferences)
    setDraft(nextPreferences)
    setIsEditing(false)
    setProfileError(null)
    setProfileFeedback('Perfil atualizado neste dispositivo.')
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileError('Use uma imagem JPG, PNG ou WebP.')
      return
    }

    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      setProfileError('A foto deve ter no máximo 5 MB.')
      return
    }

    setIsAvatarProcessing(true)
    setProfileError(null)

    try {
      const optimizedAvatar = await optimizeProfileAvatar(file)
      setDraft((current) => ({ ...current, avatarDataUrl: optimizedAvatar }))
      setProfileError(null)
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : 'Não foi possível otimizar a foto selecionada.',
      )
    } finally {
      setIsAvatarProcessing(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Perfil"
        description="Sua identidade, preferências e trajetória no DevRoyale."
      >
        <Badge variant="gold">Nível {progress.level}</Badge>
      </PageHeader>

      <Card variant="premium" className="profile-identity-card mb-6">
        <CardContent className="profile-identity-card__layout">
          <ProfileAvatar preferences={visiblePreferences} name={user.name} />

          <div className="min-w-0">
            <span className="profile-eyebrow">Perfil de desenvolvedor</span>
            <h2 className="mt-1 truncate text-2xl font-black text-foreground">{user.name}</h2>
            <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              {visiblePreferences.bio ||
                'Adicione uma bio curta para contar seus objetivos e sua jornada como Dev.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="default" className="normal-case tracking-normal">
                {getKnowledgeLevelLabel(visiblePreferences.experienceLevel)}
              </Badge>
              <Badge variant="primary" className="normal-case tracking-normal">
                {getMainLanguageLabel(visiblePreferences.favoriteLanguage)}
              </Badge>
              <Badge variant="gold" className="normal-case tracking-normal">
                Membro desde {formatDate(user.createdAt)}
              </Badge>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {!isEditing && (
              <Button type="button" variant="secondary" size="sm" onClick={startEditing}>
                Editar perfil
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <Card variant="premium" className="mb-6" aria-labelledby="profile-edit-title">
          <CardHeader>
            <CardTitle id="profile-edit-title">Editar perfil</CardTitle>
            <CardDescription>
              Informações salvas localmente e vinculadas apenas à sua conta neste dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
              <ProfileAvatar preferences={draft} name={user.name} />
              <div>
                <p className="text-sm font-semibold text-foreground">Foto de perfil</p>
                <p className="mt-1 text-xs text-muted">JPG, PNG ou WebP com até 5 MB.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className={getButtonClassName({ variant: 'secondary', size: 'sm' })}>
                    {isAvatarProcessing
                      ? 'Otimizando foto...'
                      : draft.avatarDataUrl
                        ? 'Trocar foto'
                        : 'Enviar foto'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={isAvatarProcessing}
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {draft.avatarDataUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft((current) => ({ ...current, avatarDataUrl: null }))
                      }
                    >
                      Remover foto
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                id="profile-experience"
                label="Nível de experiência"
                options={experienceOptions}
                value={draft.experienceLevel}
                onChange={(event) => {
                  if (!event.target.value) return
                  setDraft((current) => ({
                    ...current,
                    experienceLevel: event.target.value as ProfileExperienceLevel,
                  }))
                }}
              />
              <Select
                id="profile-language"
                label="Linguagem favorita"
                options={MAIN_LANGUAGE_OPTIONS}
                value={draft.favoriteLanguage}
                onChange={(event) => {
                  if (!event.target.value) return
                  setDraft((current) => ({
                    ...current,
                    favoriteLanguage: event.target.value as UserProfilePreferences['favoriteLanguage'],
                  }))
                }}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="profile-bio" className="text-sm font-semibold text-foreground">
                  Bio curta
                </label>
                <span className="text-xs text-muted">
                  {draft.bio.length}/{PROFILE_BIO_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="profile-bio"
                rows={4}
                maxLength={PROFILE_BIO_MAX_LENGTH}
                value={draft.bio}
                placeholder="Conte brevemente o que você está aprendendo ou quer construir."
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted focus-visible:border-secondary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, bio: event.target.value }))
                }
              />
            </div>

            {profileError && <p className="text-sm font-semibold text-danger" role="alert">{profileError}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={cancelEditing}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="gold"
                disabled={isAvatarProcessing}
                onClick={saveProfile}
              >
                Salvar perfil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {profileFeedback && !isEditing && (
        <p className="mb-6 rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm font-semibold text-success" role="status">
          {profileFeedback}
        </p>
      )}

      <ProfileStats progress={progress} />

      <Card variant="premium" className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Progresso de nível</CardTitle>
              <CardDescription>Nível {progress.level} · faltam {xpToNextLevel} XP para avançar</CardDescription>
            </div>
            <Badge variant="gold">{progress.totalXP.toLocaleString('pt-BR')} XP</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ProgressBar
            value={progress.currentLevelXP}
            max={progress.nextLevelXP}
            label={`Progresso para o nível ${progress.level + 1}`}
          />
        </CardContent>
      </Card>

      <ProfileAchievementsPanel progress={progress} summary={achievementSummary} />
      <ProfileActivitySummary activities={recentActivities} />
    </div>
  )
}

export function PerfilPage() {
  const { user } = useAuth()
  return user ? <AuthenticatedProfile user={user} /> : <VisitorProfile />
}
