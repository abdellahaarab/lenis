export default function ProductDisplay({ className = '', label }: { className?: string; label: string }) {
  return <div className={`product-display ${className}`} role="img" aria-label={label}>
    <img className="display-hardware" src="/images/desktop.webp" alt="" aria-hidden="true" width="1114" height="868" loading="lazy" />
    <img className="display-screen" src="/images/display-screen.webp" alt="" aria-hidden="true" width="1200" height="675" loading="lazy" />
  </div>
}
