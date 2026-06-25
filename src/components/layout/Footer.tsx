import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background-secondary/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center">
        <Logo />
        <p className="max-w-md text-sm leading-relaxed text-muted">
          Arena gamificada para aprender, praticar e evoluir em programação.
        </p>
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
        <div className="space-y-1 text-xs leading-relaxed text-muted/75">
          <p>© 2026 DevRoyale. Todos os direitos reservados.</p>
          <p>Criado por Guilherme Rodrigues</p>
          <a
            href="https://www.instagram.com/buenolherme/"
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex rounded text-secondary transition-colors hover:text-secondary-light"
          >
            Instagram: @buenolherme
          </a>
        </div>
      </div>
    </footer>
  )
}
