export type BattleOutcomeOverlayState = 'victory' | 'defeat'

interface BattleOutcomeOverlayProps {
  outcome: BattleOutcomeOverlayState
  visible: boolean
  animate?: boolean
}

function VictoryIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M19 10h26v9c0 10-5.2 18.3-13 21.8C24.2 37.3 19 29 19 19v-9Z" />
      <path d="M19 15H9v4c0 8 5.4 14 13 14M45 15h10v4c0 8-5.4 14-13 14" />
      <path d="M32 41v8M23 54h18M27 49h10" />
    </svg>
  )
}

function DefeatIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 7 51 14v14c0 12.4-7.6 22.6-19 29-11.4-6.4-19-16.6-19-29V14L32 7Z" />
      <path d="m37 16-9 13 8 4-10 15" />
    </svg>
  )
}

export function BattleOutcomeOverlay({
  outcome,
  visible,
  animate = true,
}: BattleOutcomeOverlayProps) {
  if (!visible) return null

  const victory = outcome === 'victory'

  return (
    <div
      className={`battle-outcome-overlay battle-outcome-overlay--${outcome} ${
        animate ? 'battle-outcome-overlay--animated' : ''
      }`}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      {victory && (
        <div className="battle-outcome-overlay__particles" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      )}

      <div className="battle-outcome-overlay__content">
        <div className="battle-outcome-overlay__icon">
          {victory ? <VictoryIcon /> : <DefeatIcon />}
        </div>
        <h2>{victory ? 'Vitória!' : 'Derrota'}</h2>
      </div>
    </div>
  )
}
