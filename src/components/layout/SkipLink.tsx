import { useLanguage } from '@/i18n/LanguageContext'

export default function SkipLink() {
  const { t } = useLanguage()

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
    >
      {t.accessibility?.skipToContent || 'Skip to content'}
    </a>
  )
}
