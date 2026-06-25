import type { ChangeEvent } from 'react'
import { Card, CardContent, Select } from '@/components/ui'
import type { BugCodeSize, BugDifficulty, BugLanguage } from '@/types'

export type BugSizeFilter = BugCodeSize | 'random'

const languageOptions = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'html-css', label: 'HTML/CSS' },
  { value: 'sql', label: 'SQL' },
]

const difficultyOptions = [
  { value: 'never', label: 'Nunca programei' },
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
]

const codeSizeOptions = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
  { value: 'random', label: 'Aleatório' },
]

interface BugFiltersProps {
  language: BugLanguage
  difficulty: BugDifficulty
  codeSize: BugSizeFilter
  availableCount: number
  completedCount: number
  remainingCount: number
  onLanguageChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onDifficultyChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onCodeSizeChange: (event: ChangeEvent<HTMLSelectElement>) => void
}

export function BugFilters({
  language,
  difficulty,
  codeSize,
  availableCount,
  completedCount,
  remainingCount,
  onLanguageChange,
  onDifficultyChange,
  onCodeSizeChange,
}: BugFiltersProps) {
  return (
    <Card variant="premium" className="bug-filters-card mb-5 p-4 md:p-5">
      <CardContent className="grid gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
        <Select
          id="bug-language"
          label="Linguagem"
          options={languageOptions}
          value={language}
          onChange={onLanguageChange}
        />
        <Select
          id="bug-difficulty"
          label="Dificuldade"
          options={difficultyOptions}
          value={difficulty}
          onChange={onDifficultyChange}
        />
        <Select
          id="bug-code-size"
          label="Tamanho do código"
          options={codeSizeOptions}
          value={codeSize}
          onChange={onCodeSizeChange}
        />
        <p className="text-xs font-semibold text-secondary md:col-span-2 lg:col-span-3">
          Modo livre: escolha linguagem, dificuldade e tamanho manualmente.
        </p>
        <p className="text-xs font-semibold text-muted md:col-span-2 lg:col-span-3">
          Bugs únicos concluídos: {completedCount}/{availableCount} · Novos restantes:{' '}
          {remainingCount}
        </p>
      </CardContent>
    </Card>
  )
}
