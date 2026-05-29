import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, translations } from './translations';

const STORAGE_KEY = 'macc.language';
const I18nContext = createContext(null);

function readInitialLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES[saved] ? saved : 'en';
  } catch {
    return 'en';
  }
}

function lookup(source, key) {
  return key.split('.').reduce((value, part) => value?.[part], source);
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(readInitialLanguage);
  const meta = LANGUAGES[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable in private or test contexts.
    }
  }, [language, meta.dir]);

  const value = useMemo(() => {
    const t = (key, fallback) => lookup(translations[language], key) || fallback || key;
    const toggleLanguage = () => setLanguage((current) => (current === 'en' ? 'ar' : 'en'));
    const localize = (record) => record?.[language] || record?.en || '';

    return {
      dir: meta.dir,
      language,
      languages: LANGUAGES,
      localize,
      setLanguage,
      t,
      toggleLanguage,
    };
  }, [language, meta.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
