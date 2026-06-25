import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from '@/components/ui'
import { AuthServiceError } from '@/lib/auth-service'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/routes/paths'
import {
  KNOWLEDGE_LEVEL_OPTIONS,
  MAIN_LANGUAGE_OPTIONS,
  type KnowledgeLevel,
  type MainLanguage,
} from '@/types/auth'
import { isValidEmail } from '@/utils/validation'

export function CadastroPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectFrom = (location.state as { from?: string } | null)?.from

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel | ''>('')
  const [mainLanguage, setMainLanguage] = useState<MainLanguage | ''>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Nome é obrigatório.'
    if (!email.trim()) next.email = 'E-mail é obrigatório.'
    else if (!isValidEmail(email)) next.email = 'Informe um e-mail válido.'
    if (!password) next.password = 'Senha é obrigatória.'
    else if (password.length < 6) next.password = 'A senha deve ter pelo menos 6 caracteres.'
    if (!confirmPassword) next.confirmPassword = 'Confirme sua senha.'
    else if (password !== confirmPassword) next.confirmPassword = 'As senhas não coincidem.'
    if (!knowledgeLevel) next.knowledgeLevel = 'Selecione seu grau de conhecimento.'
    if (!mainLanguage) next.mainLanguage = 'Selecione sua linguagem principal.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await register({
        name,
        email,
        password,
        confirmPassword,
        knowledgeLevel,
        mainLanguage,
      })
      navigate(redirectFrom ?? ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setFormError(err.message)
      } else {
        setFormError('Não foi possível criar a conta. Tente novamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="arena-hero-bg flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card variant="premium">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Entrar na Batalha</CardTitle>
            <CardDescription>Crie sua conta e junte-se à arena DevRoyale</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {formError && (
                <div
                  className="rounded-xl border border-danger/30 bg-danger-muted px-4 py-3 text-sm text-danger"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <Input
                id="name"
                label="Nome"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                disabled={isSubmitting}
                autoComplete="name"
              />
              <Input
                id="email"
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                disabled={isSubmitting}
                autoComplete="email"
              />
              <Input
                id="password"
                label="Senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <Input
                id="confirmPassword"
                label="Confirmar senha"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <Select
                id="knowledgeLevel"
                label="Grau de conhecimento"
                options={KNOWLEDGE_LEVEL_OPTIONS}
                placeholder="Selecione seu nível"
                value={knowledgeLevel}
                onChange={(e) => setKnowledgeLevel(e.target.value as KnowledgeLevel | '')}
                error={errors.knowledgeLevel}
                disabled={isSubmitting}
              />
              <Select
                id="mainLanguage"
                label="Linguagem principal"
                options={MAIN_LANGUAGE_OPTIONS}
                placeholder="Selecione a linguagem"
                value={mainLanguage}
                onChange={(e) => setMainLanguage(e.target.value as MainLanguage | '')}
                error={errors.mainLanguage}
                disabled={isSubmitting}
              />
              <Button type="submit" variant="gold" fullWidth size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              Já tem conta?{' '}
              <Link
                to={ROUTES.LOGIN}
                state={redirectFrom ? { from: redirectFrom } : undefined}
                className="font-semibold text-secondary hover:underline focus-ring rounded"
              >
                Faça login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
