import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui'
import { AuthServiceError } from '@/lib/auth-service'
import { useAuth } from '@/hooks'
import { ROUTES } from '@/routes/paths'
import { isValidEmail } from '@/utils/validation'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectFrom = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!email.trim()) next.email = 'E-mail é obrigatório.'
    else if (!isValidEmail(email)) next.email = 'Informe um e-mail válido.'
    if (!password) next.password = 'Senha é obrigatória.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await login({ email, password })
      navigate(redirectFrom ?? ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setFormError(err.message)
      } else {
        setFormError('Não foi possível entrar. Tente novamente.')
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
            <CardTitle className="text-2xl">Entrar na Arena</CardTitle>
            <CardDescription>Acesse sua conta DevRoyale</CardDescription>
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              Não tem conta?{' '}
              <Link
                to={ROUTES.CADASTRO}
                state={redirectFrom ? { from: redirectFrom } : undefined}
                className="font-semibold text-secondary hover:underline focus-ring rounded"
              >
                Cadastre-se
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
