// File: src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { dashboardPerformanceResources } from "./resources/dashboardPerformance";

// Static cache buster - changes only on app reload
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
    // Prevent runtime crashes on invalid locale JSON
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
        // Pre-bundled resources (dashboard: doctor.performance.*)
        resources: dashboardPerformanceResources,

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

        backend: {
          loadPath: `/locales/{{lng}}/{{ns}}.json?v=${APP_VERSION}`,
          parse: safeJsonParse,
          requestOptions: {
            cache: "default",
            mode: "cors",
          },
        },

        interpolation: {
          escapeValue: false,
        },

        // Only load essential namespaces initially - others will be loaded on demand
        ns: ["common", "home"],
        defaultNS: "common",

        partialBundledLanguages: true,

        // Don't preload other namespaces - load them lazily when needed
        preload: false,

        react: {
          useSuspense: false,
          // Don't bind i18n store to trigger re-renders for namespace loading
          bindI18nStore: "",
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
