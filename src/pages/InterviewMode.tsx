import { AuthBanner, PageHeader } from '@/components/layout'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ModeIcon,
} from '@/components/ui'

const interviewQuestions = [
  {
    id: 'int-001',
    title: 'O que é closure em JavaScript?',
    category: 'JavaScript',
    difficulty: 'medium' as const,
  },
  {
    id: 'int-002',
    title: 'Explique a diferença entre let, const e var',
    category: 'JavaScript',
    difficulty: 'easy' as const,
  },
  {
    id: 'int-003',
    title: 'Como funciona o Virtual DOM no React?',
    category: 'React',
    difficulty: 'medium' as const,
  },
  {
    id: 'int-004',
    title: 'O que são generics no TypeScript?',
    category: 'TypeScript',
    difficulty: 'hard' as const,
  },
]

const difficultyVariant = {
  easy: 'success' as const,
  medium: 'warning' as const,
  hard: 'danger' as const,
}

const difficultyLabel = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}

export function InterviewModePage() {
  return (
    <div className="page-container">
      <AuthBanner />
      <PageHeader
        icon={<ModeIcon mode="interview" />}
        title="Interview Mode"
        description="Pratique perguntas de entrevista técnica — simulação sem IA na V1.0."
      >
        <Badge variant="gold">Beta</Badge>
      </PageHeader>

      <Card variant="premium" className="mb-6 border-secondary/20">
        <CardContent className="flex items-start gap-3 py-5">
          <span className="mode-notice-icon" aria-hidden="true">
            <ModeIcon mode="interview" size={20} />
          </span>
          <p className="text-sm leading-relaxed text-muted">
            O modo de entrevista com IA será implementado em versões futuras.
            Por enquanto, explore as perguntas de treino abaixo para se preparar.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {interviewQuestions.map((question) => (
          <Card key={question.id} variant="premium">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base leading-snug">{question.title}</CardTitle>
                <Badge variant={difficultyVariant[question.difficulty]} className="shrink-0">
                  {difficultyLabel[question.difficulty]}
                </Badge>
              </div>
              <CardDescription>
                <Badge variant="default" className="mt-2 normal-case">
                  {question.category}
                </Badge>
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
