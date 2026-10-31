import { useHomeImage } from '@/data/CatalogContext'

export default function ProductDisplay({ className = '', label }: { className?: string; label: string }) {
  const hardware = useHomeImage('desktop_hardware', '/images/home-reference/desktop.webp')
  const screen = useHomeImage('desktop_screen', '/images/home-reference/display-screen.webp')
  return <div className={`product-display ${className}`} role="img" aria-label={label}>
    {hardware && <img className="display-hardware" src={hardware} alt="" aria-hidden="true" width="1114" height="868" loading="lazy" />}
    {screen && <img className="display-screen" src={screen} alt="" aria-hidden="true" width="1200" height="675" loading="lazy" />}
  </div>
}
