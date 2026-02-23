// File: src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

// Cache buster (changes only on app reload)
const APP_VERSION = Date.now();

export interface LanguageConfig {
  code: string;
  name: string;
  flag: string;
  dir?: "ltr" | "rtl";
}

export const languages: LanguageConfig[] = [
  { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ru", name: "Русский", flag: "🇷🇺", dir: "ltr" },
  { code: "uz", name: "O'zbek", flag: "🇺🇿", dir: "ltr" },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷", dir: "ltr" },
  { code: "es", name: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  { code: "zh", name: "中文", flag: "🇨🇳", dir: "ltr" },
  { code: "pt", name: "Português", flag: "🇧🇷", dir: "ltr" },
  { code: "ja", name: "日本語", flag: "🇯🇵", dir: "ltr" },
  { code: "ko", name: "한국어", flag: "🇰🇷", dir: "ltr" },
];

export const rtlLanguages = ["ar", "he", "fa", "ur"];

export const isRTL = (langCode: string): boolean => rtlLanguages.includes(langCode);

export const getDirection = (langCode: string): "ltr" | "rtl" => (isRTL(langCode) ? "rtl" : "ltr");

export const applyDirection = (langCode: string): void => {
  const dir = getDirection(langCode);
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", langCode);
};

const safeJsonParse = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error("[i18n] Failed to parse locale JSON:", err);
    return {};
  }
};

async function initI18n() {
  try {
    await i18n
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: "en",
        debug: false,

        supportedLngs: languages.map((l) => l.code),
        nonExplicitSupportedLngs: true,
        load: "languageOnly",
        lowerCaseLng: true,

        detection: {
          order: ["localStorage", "navigator", "htmlTag"],
          caches: ["localStorage"],
          lookupLocalStorage: "i18nextLng",
        },

        // IMPORTANT: translations are stored in public/locales/{lng}/{ns}.json
        backend: {
          loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json?v=${APP_VERSION}`,
          parse: safeJsonParse,
          requestOptions: {
            cache: "default",
            mode: "cors",
          },
        },

        interpolation: {
          escapeValue: false,
        },

        // Load the most-used namespaces upfront (prevents showing raw keys on dashboards)
        ns: ["common", "home", "dashboard", "auth"],
        defaultNS: "common",

        partialBundledLanguages: true,
        preload: false,

        // CRITICAL FIX:
        // Enable store bindings so components re-render after namespaces load.
        // Without this, you will see raw keys like "doctor.profileSetup.settingUp" forever.
        react: {
          useSuspense: false,
          bindI18n: "languageChanged loaded",
          bindI18nStore: "added removed",
        },
      });

    applyDirection(i18n.language);
  } catch (err) {
    console.error("[i18n] Initialization failed:", err);
    try {
      applyDirection("en");
    } catch {
      // ignore
    }
  }
}

void initI18n();

i18n.on("initialized", () => {
  applyDirection(i18n.language);
});

i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
});

export default i18n;
