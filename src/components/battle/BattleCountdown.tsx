interface BattleCountdownProps {
  value: number | 'started'
}

export function BattleCountdown({ value }: BattleCountdownProps) {
  const battleStarted = value === 'started'

  return (
    <section
      className={`battle-countdown ${battleStarted ? 'battle-countdown--started' : ''}`}
      aria-live="assertive"
      aria-atomic="true"
      aria-label={battleStarted ? 'Batalha iniciada' : `Batalha começa em ${value}`}
    >
      <div className="battle-countdown__ring" aria-hidden="true" />
      <p className="battle-countdown__eyebrow">
        {battleStarted ? 'Arena liberada' : 'Prepare-se, Dev'}
      </p>
      {battleStarted ? (
        <h2 className="battle-countdown__started">BATALHA INICIADA</h2>
      ) : (
        <strong className="battle-countdown__number">{value}</strong>
      )}
      <p className="battle-countdown__support">
        {battleStarted
          ? 'Resolva o desafio para vencer a arena.'
          : 'O desafio será revelado em instantes.'}
      </p>
    </section>
  )
}
