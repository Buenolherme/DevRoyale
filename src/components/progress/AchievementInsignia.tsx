import { CrownIcon } from '@/components/layout/CrownIcon'
import type {
  AchievementMetricProgress,
  AchievementRarity,
  ProgressAchievementDefinition,
} from '@/types'

const rarityLabel: Record<AchievementRarity, string> = {
  common: 'Comum',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Lendária',
}

const achievementSymbol: Record<string, string> = {
  'first-code': '</>',
  'arena-student': 'A+',
  'bug-hunter': 'BUG',
  'dev-gladiator': '<>',
  persistent: '∞',
}

interface AchievementInsigniaProps {
  achievement: ProgressAchievementDefinition
  progress: AchievementMetricProgress
  unlockedAt?: string
  compact?: boolean
}

function formatUnlockDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function AchievementInsignia({
  achievement,
  progress,
  unlockedAt,
  compact = false,
}: AchievementInsigniaProps) {
  const isUnlocked = Boolean(unlockedAt)

  return (
    <article
      className={`achievement-insignia achievement-insignia--${achievement.rarity} ${
        isUnlocked ? 'is-unlocked' : 'is-locked'
      } ${compact ? 'is-compact' : ''}`}
    >
      <div className="achievement-insignia__topline">
        <div className="achievement-insignia__seal" aria-hidden="true">
          <span>
            {achievement.id === 'king-in-training' ? (
              <CrownIcon size={28} />
            ) : (
              achievementSymbol[achievement.id] ?? 'DR'
            )}
          </span>
        </div>
        <div className="achievement-insignia__labels">
          <span className="achievement-insignia__rarity">
            {rarityLabel[achievement.rarity]}
          </span>
          <span className="achievement-insignia__status">
            {isUnlocked ? 'Desbloqueada' : 'Bloqueada'}
          </span>
        </div>
      </div>

      <div className="achievement-insignia__content">
        <h3>{achievement.name}</h3>
        <p>{achievement.description}</p>
      </div>

      {isUnlocked && unlockedAt ? (
        <p className="achievement-insignia__date">
          Conquistada em <strong>{formatUnlockDate(unlockedAt)}</strong>
        </p>
      ) : (
        <div className="achievement-insignia__requirement">
          <div className="achievement-insignia__requirement-copy">
            <span>{achievement.condition.label}</span>
            <strong>
              {Math.min(progress.current, progress.target)}/{progress.target}
            </strong>
          </div>
          <div
            className="achievement-insignia__progress"
            role="progressbar"
            aria-label={`Progresso para ${achievement.name}`}
            aria-valuemin={0}
            aria-valuemax={progress.target}
            aria-valuenow={Math.min(progress.current, progress.target)}
          >
            <span style={{ width: `${progress.percentage}%` }} />
          </div>
        </div>
      )}
    </article>
  )
}
