import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const localeModules = import.meta.glob('../../translations/locales/**/common.json', {
  eager: true,
  import: 'default'
}) as Record<string, Record<string, unknown>>;

const resources: Record<string, { translation: Record<string, unknown> }> = {};
const detectedLanguages = new Set<string>();

for (const [path, translations] of Object.entries(localeModules)) {
  const match = path.match(/locales\/([^/]+)\/common\.json$/);
  if (!match) continue;
  const lng = match[1];
  detectedLanguages.add(lng);
  resources[lng] = { translation: translations };
}

const availableLanguages = Array.from(detectedLanguages).sort();

if (availableLanguages.length === 0) {
  availableLanguages.push('en');
  resources.en = { translation: {} };
}

const isBrowser = typeof window !== 'undefined';
const detection = {
  order: ['cookie', 'localStorage'], // Remove 'navigator' and 'htmlTag' to not auto-detect browser language
  caches: isBrowser ? ['cookie', 'localStorage'] : [],
  lookupCookie: 'i18next',
  lookupLocalStorage: 'i18nextLng',
  cookieMinutes: 60 * 24 * 30,
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en', // Always default to English
      supportedLngs: availableLanguages,
      load: 'languageOnly',
      nonExplicitSupportedLngs: true,
      defaultNS: 'translation',
      ns: ['translation'],
      interpolation: {
        escapeValue: false,
      },
      detection,
      react: {
        useSuspense: false,
      },
      returnNull: false,
    });

  if (isBrowser) {
    document.documentElement.lang = i18n.language || 'en';
    i18n.on('languageChanged', lng => {
      document.documentElement.lang = lng;
    });
  }
}

export default i18n;
export { availableLanguages };
