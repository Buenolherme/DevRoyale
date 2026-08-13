import type { BattleIntegrityNotice } from '@/hooks/useBattleIntegrity'

interface BattleIntegrityIndicatorProps {
  warningCount: number
  compromised: boolean
  trackingEnabled: boolean
  notice: BattleIntegrityNotice | null
}

export function BattleIntegrityIndicator({
  warningCount,
  compromised,
  trackingEnabled,
  notice,
}: BattleIntegrityIndicatorProps) {
  const title = compromised ? 'Integridade comprometida' : 'Integridade da batalha'
  const status = compromised
    ? 'Partida marcada como suspeita'
    : warningCount === 0
      ? 'Protegida'
      : `${warningCount} ${warningCount === 1 ? 'aviso' : 'avisos'}`

  return (
    <section
      className={`battle-integrity ${compromised ? 'battle-integrity--compromised' : ''}`}
      aria-labelledby="battle-integrity-title"
    >
      <div className="battle-integrity__summary">
        <span className="battle-integrity__shield" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3 5.5 5.7v5.1c0 4.25 2.7 8.15 6.5 10.2 3.8-2.05 6.5-5.95 6.5-10.2V5.7L12 3Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="m9.4 12 1.65 1.65 3.55-3.55"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <h2 id="battle-integrity-title">{title}</h2>
          <strong>{status}</strong>
          {!trackingEnabled && (
            <small>Modo de iniciação: saídas não geram advertências.</small>
          )}
        </div>
      </div>

      <div className="battle-integrity__meter" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <span
            key={index}
            className={
              index < warningCount
                ? 'battle-integrity__step battle-integrity__step--active'
                : 'battle-integrity__step'
            }
          />
        ))}
      </div>

      {notice && (
        <div
          key={notice.id}
          className={`battle-integrity__notice battle-integrity__notice--${notice.tone}`}
          role="status"
          aria-live="polite"
        >
          <strong className="battle-integrity__notice-title">{notice.title}</strong>
          <span>{notice.message}</span>
        </div>
      )}
    </section>
  )
}
