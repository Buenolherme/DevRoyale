import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useAuth, useTheme } from '@/hooks'
import { ROUTES } from '@/routes/paths'
import { cn } from '@/utils'
import { DevsOnlineIndicator } from './DevsOnlineIndicator'
import { Logo } from './Logo'

const navLinks = [
  { to: ROUTES.BATALHA_DEVS, label: 'Batalha' },
  { to: ROUTES.AREA_ESTUDOS, label: 'Estudos' },
  { to: ROUTES.BUG_ARENA, label: 'Bug Arena' },
  { to: ROUTES.INTERVIEW_MODE, label: 'Interview' },
]

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen && !mobileOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
        setMobileOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen, userMenuOpen])

  const closeUserMenu = () => {
    setUserMenuOpen(false)
  }

  const handleLogout = () => {
    setUserMenuOpen(false)
    setMobileOpen(false)
    logout()
    window.setTimeout(() => {
      navigate(ROUTES.HOME, { replace: true })
    }, 0)
  }

  const handleLogin = () => {
    setMobileOpen(false)
    navigate(ROUTES.LOGIN)
  }

  const toggleUserMenu = () => {
    setUserMenuOpen((open) => !open)
    setMobileOpen(false)
  }

  const toggleMobileMenu = () => {
    setMobileOpen((open) => !open)
    setUserMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 glass-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Logo
            size="header"
            className="max-[399px]:[&>span:last-child]:hidden"
          />
          <div className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
          <div className="hidden sm:block">
            <DevsOnlineIndicator />
          </div>
        </div>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegação principal">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 focus-ring',
                location.pathname === link.to
                  ? 'border border-primary/25 bg-primary-muted text-primary shadow-[var(--shadow-glow-primary)]'
                  : 'border border-transparent text-muted hover:border-border hover:bg-background-elevated hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
          </div>

          {isAuthenticated && user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={toggleUserMenu}
                className="flex max-w-[132px] items-center gap-2 rounded-xl border border-border bg-background-elevated px-3 py-2 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-all duration-200 hover:border-secondary/40 hover:bg-secondary-muted focus-ring sm:max-w-[170px]"
                aria-label={`Abrir menu de ${user.name}`}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-controls="user-menu"
              >
                <span className="truncate">{user.name}</span>
                <svg
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-secondary transition-transform duration-200',
                    userMenuOpen && 'rotate-180',
                  )}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {userMenuOpen && (
                <div
                  id="user-menu"
                  role="menu"
                  className="absolute right-0 top-full z-[60] mt-2 w-48 overflow-hidden rounded-xl border border-border bg-background-elevated p-1.5 shadow-[var(--shadow-card-hover)]"
                  aria-label="Menu do usuário"
                >
                  <Link
                    to={ROUTES.DASHBOARD}
                    role="menuitem"
                    onClick={closeUserMenu}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary-muted hover:text-primary focus-ring"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to={ROUTES.PERFIL}
                    role="menuitem"
                    onClick={closeUserMenu}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary-muted hover:text-primary focus-ring"
                  >
                    Perfil
                  </Link>
                  <div className="my-1 border-t border-border" aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-danger transition-colors hover:bg-danger-muted focus-ring"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={handleLogin}
            >
              Login
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={toggleMobileMenu}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          >
            {mobileOpen ? '✕' : '☰'}
          </Button>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-2 sm:hidden">
        <DevsOnlineIndicator compact className="w-full justify-center" />
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-border bg-background-secondary/95 px-4 py-4 backdrop-blur-md lg:hidden"
          aria-label="Navegação mobile"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 focus-ring',
                  location.pathname === link.to
                    ? 'border border-primary/20 bg-primary-muted text-primary'
                    : 'text-muted hover:bg-background-elevated hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="flex-1">
                {theme === 'light' ? '🌙 Escuro' : '☀️ Claro'}
              </Button>
              {!isAuthenticated && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={handleLogin}
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
