import type { ChangeEvent } from 'react'
import { Badge, Button, Card, CardContent, Select } from '@/components/ui'
import type { BattleDifficulty, BattleLanguage } from '@/types'

const languageOptions = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'html-css', label: 'HTML/CSS' },
]

const difficultyOptions = [
  { value: 'never', label: 'Nunca programei' },
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
]

interface BattleFiltersProps {
  language: BattleLanguage
  difficulty: BattleDifficulty
  onStartBattle: () => void
  onLanguageChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onDifficultyChange: (event: ChangeEvent<HTMLSelectElement>) => void
}

export function BattleFilters({
  language,
  difficulty,
  onStartBattle,
  onLanguageChange,
  onDifficultyChange,
}: BattleFiltersProps) {
  return (
    <Card
      variant="premium"
      className="battle-setup-card mb-6 p-5 md:p-7"
      aria-labelledby="battle-preparation-title"
    >
      <CardContent className="p-0">
        <div className="battle-preparation__heading">
          <div>
            <Badge variant="primary">Preparando</Badge>
            <h2 id="battle-preparation-title" className="battle-preparation__title">
              Configure seu próximo duelo
            </h2>
            <p className="battle-preparation__description">
              Defina linguagem e dificuldade. O desafio será revelado quando a arena abrir.
            </p>
          </div>
          <div className="battle-preparation__mark" aria-hidden="true">
            &lt;/&gt;
          </div>
        </div>

        <div className="battle-preparation__body">
          <div className="battle-preparation__filters">
            <Select
              id="battle-language"
              label="Linguagem da batalha"
              options={languageOptions}
              value={language}
              onChange={onLanguageChange}
            />
            <Select
              id="battle-difficulty"
              label="Nível do duelo"
              options={difficultyOptions}
              value={difficulty}
              onChange={onDifficultyChange}
            />
          </div>

          <aside className="battle-preparation__rival-slot" aria-label="Futuro modo ranked">
            <div className="battle-preparation__rival-avatar" aria-hidden="true">?</div>
            <div>
              <span>Slot do rival</span>
              <strong>Matchmaking ranked</strong>
              <p>Estrutura visual preparada para futuros duelos online.</p>
            </div>
            <Badge variant="gold" className="normal-case tracking-normal">Em breve</Badge>
          </aside>
        </div>

        <div className="battle-preparation__footer">
          <p className="battle-preparation__status" role="status">
            <span aria-hidden="true" />
            Aguardando início da batalha...
          </p>
          <Button
            type="button"
            variant="gold"
            size="lg"
            className="battle-start-button"
            onClick={onStartBattle}
          >
            Entrar na Arena
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
