import { Badge } from '@/components/ui'

interface BattleHintPanelProps {
  hint: string
  level: number
  total: number
}

export function BattleHintPanel({ hint, level, total }: BattleHintPanelProps) {
  return (
    <section
      className="battle-hint"
      id="battle-hint"
      aria-labelledby="battle-hint-title"
      aria-live="polite"
    >
      <div className="battle-hint__header">
        <div>
          <Badge variant="gold" className="normal-case tracking-normal">
            Assistência da Arena
          </Badge>
          <h2 id="battle-hint-title">Dica {level} de {total}</h2>
        </div>
        <div className="battle-hint__progress" aria-label={`${level} de ${total} dicas reveladas`}>
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={index < level ? 'battle-hint__step battle-hint__step--active' : 'battle-hint__step'}
            />
          ))}
        </div>
      </div>

      <p>{hint}</p>
      <small>As dicas avançam gradualmente e não exibem a solução final.</small>
    </section>
  )
}
