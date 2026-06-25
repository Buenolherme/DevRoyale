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
            <Badge variant="gold">Briefing da arena</Badge>
            <h2 id="battle-preparation-title" className="battle-preparation__title">
              Prepare sua arena
            </h2>
            <p className="battle-preparation__description">
              Escolha sua linguagem, selecione a dificuldade e entre na batalha.
            </p>
          </div>
          <div className="battle-preparation__mark" aria-hidden="true">
            &lt;/&gt;
          </div>
        </div>

        <div className="battle-preparation__filters">
          <Select
            id="battle-language"
            label="Linguagem"
            options={languageOptions}
            value={language}
            onChange={onLanguageChange}
          />
          <Select
            id="battle-difficulty"
            label="Dificuldade"
            options={difficultyOptions}
            value={difficulty}
            onChange={onDifficultyChange}
          />
        </div>

        <div className="battle-preparation__footer">
          <p className="battle-preparation__status" role="status">
            <span aria-hidden="true" />
            Aguardando início da batalha...
          </p>
          <Button type="button" variant="gold" size="lg" onClick={onStartBattle}>
            Começar Batalha
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
