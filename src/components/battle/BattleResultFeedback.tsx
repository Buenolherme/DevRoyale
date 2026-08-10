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
      <div className="battle-feedback__content">
        <span className="battle-feedback__label">Resultado da execução</span>
        <p>{result.message}</p>
        <div className="battle-feedback__details">
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
      </div>
    </div>
  )
}
