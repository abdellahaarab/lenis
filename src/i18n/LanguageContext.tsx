import React, { createContext, useContext, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Language, Direction, Translations } from './types'
import { ar } from './ar'
import { en } from './en'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const STORAGE_KEY = 'alarbi_lang'

interface LanguageContextType {
  language: Language
  dir: Direction
  t: Translations
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const translationsMap: Record<Language, Translations> = {
  ar,
  en,
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()

  // Derive language from URL prefix
  const urlLang: Language = location.pathname.startsWith('/en') ? 'en' : 'ar'
  const [language, setLanguageState] = useState<Language>(urlLang)

  useEffect(() => {
    if (location.pathname.startsWith('/en')) {
      setLanguageState('en')
    } else if (location.pathname.startsWith('/ar')) {
      setLanguageState('ar')
    }
  }, [location.pathname])

  const dir: Direction = language === 'ar' ? 'rtl' : 'ltr'
  const t = translationsMap[language]

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang)
    try {
      localStorage.setItem(STORAGE_KEY, newLang)
    } catch {
      // ignore
    }

    let nextPath = location.pathname
    if (nextPath.startsWith('/ar')) {
      nextPath = `/${newLang}${nextPath.slice(3)}`
    } else if (nextPath.startsWith('/en')) {
      nextPath = `/${newLang}${nextPath.slice(3)}`
    } else {
      nextPath = `/${newLang}${nextPath}`
    }
    navigate(`${nextPath || `/${newLang}`}${location.search}${location.hash}`)
  }

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar')
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // ignore
    }

    // Update documentElement attributes
    document.documentElement.lang = language
    document.documentElement.dir = dir
    document.documentElement.setAttribute('data-lang', language)

    // Update page title
    document.title = t.meta.title

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', t.meta.description)

    // Recalculate GSAP ScrollTrigger and layout measurements
    const timer = setTimeout(() => {
      ScrollTrigger.refresh()
      window.dispatchEvent(new Event('resize'))
    }, 100)

    return () => clearTimeout(timer)
  }, [language, dir, t])

  return (
    <LanguageContext.Provider value={{ language, dir, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const useTranslation = useLanguage
