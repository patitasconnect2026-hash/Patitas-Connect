/**
 * Insignias «Próximamente» de Google Play y App Store.
 * La app nativa aún no existe: no son enlaces, solo avisan que llegará.
 */
function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M3.6 1.8 13.4 12l-9.8 10.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1Z" fill="#00d7fe" />
      <path d="m16.8 8.6-3.4 3.4-9.8-10.2c.3-.2.8-.2 1.2 0l12 6.8Z" fill="#00f076" />
      <path d="m16.8 15.4-12 6.8c-.4.2-.9.2-1.2 0l9.8-10.2 3.4 3.4Z" fill="#ff3a44" />
      <path d="m20.4 10.6-3.6-2-3.4 3.4 3.4 3.4 3.6-2c1-.6 1-2.2 0-2.8Z" fill="#ffd500" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 4.9c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5Z" />
    </svg>
  )
}

function Badge({ icon, store }: { icon: React.ReactNode; store: string }) {
  return (
    <span
      role="img"
      aria-label={`Próximamente en ${store}`}
      className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-white/15 bg-black px-3.5 text-white"
    >
      {icon}
      <span className="text-left leading-none" aria-hidden="true">
        <span className="block text-[12px] font-semibold uppercase tracking-wide text-white/75">Próximamente en</span>
        <span className="mt-0.5 block text-[17px] font-bold">{store}</span>
      </span>
    </span>
  )
}

export function StoreBadges({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        <Badge icon={<GooglePlayIcon />} store="Google Play" />
        <Badge icon={<AppleIcon />} store="App Store" />
      </div>
    </div>
  )
}
