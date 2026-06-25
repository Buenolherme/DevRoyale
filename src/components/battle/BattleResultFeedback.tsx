export interface BattleResultFeedbackValue {
  status: 'correct' | 'incorrect'
  message: string
  xpAwarded?: number
  leveledUp?: boolean
  newAchievements?: string[]
}

export function BattleResultFeedback({ result }: { result: BattleResultFeedbackValue }) {
  return (
    <div
      className={`battle-feedback battle-feedback--${result.status}`}
      role="status"
      aria-live="polite"
    >
      <span className="battle-feedback__icon" aria-hidden="true">
        {result.status === 'incorrect' ? '!' : '✓'}
      </span>
      <p>{result.message}</p>
      {result.xpAwarded ? (
        <small className="text-secondary">+{result.xpAwarded} XP</small>
      ) : null}
      {result.leveledUp ? (
        <small className="text-secondary">Nível atualizado!</small>
      ) : null}
      {result.newAchievements?.length ? (
        <small className="text-secondary">
          Nova conquista desbloqueada: {result.newAchievements.join(', ')}
        </small>
      ) : null}
    </div>
  )
}
