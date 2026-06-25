export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] py-12">
      <div className="section-padding container-custom">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M6 10 Q10 6 16 10 Q22 14 26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
              <path d="M6 16 Q10 12 16 16 Q22 20 26 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4" />
              <path d="M6 22 Q10 18 16 22 Q22 26 26 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.2" />
            </svg>
            <span className="text-white/40 text-sm">lenis</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/30">
            <a href="https://github.com/abdellahaarab/lenis" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">GitHub</a>
            <a href="https://www.npmjs.com/package/lenis" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">NPM</a>
            <a href="https://pro-lenis.dev" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Demo</a>
          </div>

          {/* Credit */}
          <p className="text-white/20 text-xs text-center md:text-right">
            MIT License · Built by{' '}
            <a href="https://github.com/abdellahaarab" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors">
              abdellahaarab
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
