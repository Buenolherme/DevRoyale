import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Button } from '@/components/ui'
import { useAuth, useTheme } from '@/hooks'
import { getIncomingRequestCount, subscribeToSocialChanges } from '@/lib/social-service'
import { subscribeRoomInvites } from '@/lib/room-realtime-service'
import { getPendingRoomInviteCount, subscribeToRoomChanges } from '@/lib/room-service'
import { ROUTES } from '@/routes/paths'
import { cn } from '@/utils'
import { DevsOnlineIndicator } from './DevsOnlineIndicator'
import { Logo } from './Logo'

const navLinks = [
  { to: ROUTES.BATALHA_DEVS, label: 'Batalha' },
  { to: ROUTES.MULTIPLAYER, label: 'Multiplayer' },
  { to: ROUTES.AREA_ESTUDOS, label: 'Treinamento' },
  { to: ROUTES.BUG_ARENA, label: 'Bug Arena' },
]
const secondaryLinks = [
  { to: ROUTES.INTERVIEW_MODE, label: 'Interview' },
  { to: ROUTES.SOBRE, label: 'Sobre' },
]

function NotificationBadge({ count, label }: { count: number; label: string }) {
  if (count < 1) return null
  return (
    <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-black text-[var(--color-on-brand)]" aria-label={`${count} ${label}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Header({ onOpenOnboarding }: { onOpenOnboarding: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [openPanel, setOpenPanel] = useState<{ kind: 'user' | 'mobile'; routeKey: string } | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [counts, setCounts] = useState({ userId: '', incoming: 0, invites: 0 })
  const headerRef = useRef<HTMLElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userButtonRef = useRef<HTMLButtonElement>(null)
  const mobileButtonRef = useRef<HTMLButtonElement>(null)
  const userId = isAuthenticated ? user?.id : undefined
  const incomingCount = counts.userId === userId ? counts.incoming : 0
  const inviteCount = counts.userId === userId ? counts.invites : 0
  const activePanel = openPanel?.routeKey === location.key ? openPanel.kind : null

  useEffect(() => {
    if (!userId) return
    let active = true
    let inFlight = false
    let refreshRequested = false
    const refreshCounts = async () => {
      if (!active) return
      if (inFlight) { refreshRequested = true; return }
      inFlight = true
      const [incoming, invites] = await Promise.allSettled([
        getIncomingRequestCount(), getPendingRoomInviteCount(),
      ])
      inFlight = false
      if (!active) return
      setCounts((previous) => ({
        userId,
        incoming: incoming.status === 'fulfilled' ? incoming.value : previous.userId === userId ? previous.incoming : 0,
        invites: invites.status === 'fulfilled' ? invites.value : previous.userId === userId ? previous.invites : 0,
      }))
      if (refreshRequested) {
        refreshRequested = false
        void refreshCounts()
      }
    }
    const refresh = () => { void refreshCounts() }
    const refreshVisible = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    const unsubscribeSocial = subscribeToSocialChanges(refresh)
    const unsubscribeLocal = subscribeToRoomChanges(refresh)
    const unsubscribeRealtime = subscribeRoomInvites(userId, refresh)
    const timerId = window.setInterval(refreshVisible, 30_000)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      active = false
      unsubscribeSocial()
      unsubscribeLocal()
      unsubscribeRealtime()
      window.clearInterval(timerId)
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }, [userId])

  useEffect(() => {
    if (!activePanel) return
    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (activePanel === 'user' && !userMenuRef.current?.contains(target)) setOpenPanel(null)
      if (activePanel === 'mobile' && !headerRef.current?.contains(target)) setOpenPanel(null)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenPanel(null)
      if (activePanel === 'user') userButtonRef.current?.focus()
      else mobileButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [activePanel])

  const closePanel = () => setOpenPanel(null)
  const togglePanel = (kind: 'user' | 'mobile') => {
    setOpenPanel(activePanel === kind ? null : { kind, routeKey: location.key })
  }
  const handleLogout = async () => {
    if (isLoggingOut) return
    setLogoutError('')
    setIsLoggingOut(true)
    try {
      await logout()
      closePanel()
      navigate(ROUTES.HOME, { replace: true })
    } catch {
      setLogoutError('Não foi possível sair agora. Tente novamente.')
      setOpenPanel({ kind: 'user', routeKey: location.key })
    } finally {
      setIsLoggingOut(false)
    }
  }
  const isCurrent = (to: string) => to === ROUTES.MULTIPLAYER
    ? location.pathname.startsWith('/batalha/')
    : location.pathname === to
  const linkClass = (to: string) => cn(
    'flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold focus-ring',
    isCurrent(to) ? 'bg-primary-muted text-[var(--color-primary-text)]' : 'text-muted hover:bg-background-elevated hover:text-foreground',
  )
  const renderNavLink = (link: { to: string; label: string }) => (
    <Link key={link.to} to={link.to} onClick={closePanel} aria-current={isCurrent(link.to) ? 'page' : undefined} className={linkClass(link.to)}>
      <span>{link.label}</span>
      {link.to === ROUTES.AMIGOS && <NotificationBadge count={incomingCount} label="solicitações pendentes" />}
      {link.to === ROUTES.MULTIPLAYER && <NotificationBadge count={inviteCount} label="convites de batalha" />}
    </Link>
  )

  return (
    <header ref={headerRef} className="sticky top-0 z-50 glass-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size="header" className="max-[399px]:[&>span:last-child]:hidden" />
          <div className="hidden 2xl:block"><DevsOnlineIndicator compact /></div>
        </div>
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Navegação principal">
          {navLinks.map(renderNavLink)}
          {renderNavLink(isAuthenticated ? { to: ROUTES.AMIGOS, label: 'Amigos' } : { to: ROUTES.SOBRE, label: 'Sobre' })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="hidden sm:inline-flex" aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}>
            <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
          </Button>
          {isLoading ? (
            <span className="rounded-xl border border-border px-3 py-2 text-xs text-muted" role="status">Carregando conta...</span>
          ) : isAuthenticated && user ? (
            <div ref={userMenuRef} className="relative" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closePanel()
            }}>
              <button
                ref={userButtonRef} type="button" onClick={() => togglePanel('user')}
                className="flex max-w-[175px] items-center gap-2 rounded-xl border border-border bg-background-elevated p-1.5 pr-2.5 text-sm font-semibold text-foreground focus-ring sm:max-w-[210px]"
                aria-label={`Conta de @${user.username || user.displayName}`}
                aria-expanded={activePanel === 'user'} aria-controls="user-menu"
              >
                <Avatar src={user.avatarUrl} name={user.displayName} className="header-avatar" />
                <span className="truncate">{user.username ? `@${user.username}` : user.displayName}</span>
                <NotificationBadge count={incomingCount + inviteCount} label="notificações" />
                <span className="text-muted" aria-hidden="true">⌄</span>
              </button>
              {activePanel === 'user' && (
                <nav id="user-menu" aria-label="Sua conta" className="header-panel absolute right-0 top-full z-[60] mt-2 w-64 rounded-xl border border-border bg-background-elevated p-2 shadow-[var(--shadow-card-hover)]">
                  <p className="truncate border-b border-border px-3 pb-2 pt-1 text-sm font-bold">{user.displayName}</p>
                  {[
                    { to: ROUTES.DASHBOARD, label: 'Dashboard' },
                    { to: ROUTES.PERFIL, label: 'Meu perfil' },
                    { to: ROUTES.AMIGOS, label: 'Amigos' },
                    { to: ROUTES.MULTIPLAYER, label: 'Multiplayer' },
                    ...secondaryLinks,
                  ].map(renderNavLink)}
                  <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} className="mt-1 w-full rounded-lg border-t border-border px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger-muted focus-ring">
                    {isLoggingOut ? 'Saindo...' : 'Sair da conta'}
                  </button>
                  {logoutError && <p className="px-3 py-2 text-xs font-semibold text-danger" role="alert">{logoutError}</p>}
                </nav>
              )}
            </div>
          ) : (
            <Link to={ROUTES.LOGIN} onClick={closePanel} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground focus-ring">Entrar</Link>
          )}
          <button ref={mobileButtonRef} type="button" onClick={() => togglePanel('mobile')} className="rounded-xl p-2.5 text-foreground focus-ring xl:hidden" aria-expanded={activePanel === 'mobile'} aria-controls="mobile-nav" aria-label={activePanel === 'mobile' ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}>
            <span aria-hidden="true">{activePanel === 'mobile' ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>
      {activePanel === 'mobile' && (
        <nav id="mobile-nav" className="header-mobile-nav border-t border-border bg-background-elevated px-4 py-4 xl:hidden" aria-label="Navegação mobile">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {navLinks.map(renderNavLink)}
            {isAuthenticated && [
              { to: ROUTES.AMIGOS, label: 'Amigos' },
              { to: ROUTES.PERFIL, label: 'Meu perfil' },
              { to: ROUTES.DASHBOARD, label: 'Dashboard' },
            ].map(renderNavLink)}
            {secondaryLinks.map(renderNavLink)}
            <button type="button" onClick={() => { closePanel(); onOpenOnboarding() }} className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted focus-ring">Como funciona</button>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <DevsOnlineIndicator compact />
              <Button variant="ghost" size="sm" onClick={toggleTheme}>{theme === 'light' ? 'Modo escuro' : 'Modo claro'}</Button>
              {isAuthenticated && <Button variant="ghost" size="sm" disabled={isLoggingOut} onClick={() => void handleLogout()}>{isLoggingOut ? 'Saindo...' : 'Sair da conta'}</Button>}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
