// src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

// Static cache buster - changes only on app reload
const APP_VERSION = Date.now();

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const ROOT_NAMESPACE_HINTS = new Set([
  "doctor",
  "patient",
  "admin",
  "superAdmin",
  "shared",
  "common",
]);

const DOCTOR_PATCH_KEYS = new Set([
  "financialStats",
  "performance",
  "profileSetup",
  "loading",
  "settingUp",
]);

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

export const getDirection = (langCode: string): "ltr" | "rtl" =>
  isRTL(langCode) ? "rtl" : "ltr";

export const applyDirection = (langCode: string): void => {
  const dir = getDirection(langCode);
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", langCode);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> => {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      deepMerge(current, value);
      continue;
    }
    target[key] = value;
  }
  return target;
};

const countBraceBalanceOutsideStrings = (text: string): number => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
    }
  }

  return depth;
};

const stripNonJsonLines = (text: string): string =>
  text
    .split("\n")
    .filter((line) => {
      const s = line.trim();
      if (!s) return true;
      if (s.startsWith("//")) return false;
      if (s.startsWith("```")) return false;
      if (/^[A-Za-z]+\s+id=/.test(s)) return false;
      return true;
    })
    .join("\n");

const addMissingPropertyCommas = (text: string): string =>
  text.replace(/}(\s*\n\s*")/g, (match, nextToken, offset, fullText) => {
    let i = Number(offset) - 1;
    while (i >= 0 && /\s/.test(fullText[i])) i -= 1;
    if (i >= 0 && [",", "{", "["].includes(fullText[i])) return match;
    return `},${nextToken}`;
  });

const scanBalancedObject = (
  text: string,
  startIndex: number,
): { jsonText: string; endIndex: number } | null => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          jsonText: text.slice(startIndex, i + 1),
          endIndex: i + 1,
        };
      }
    }
  }

  return null;
};

const parseJsonObject = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isPlainObject(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const findCorruptionAnchor = (text: string): number | null => {
  const patterns = [
    /^\s*\/\/\s*public\/locales\/.*\.json/m,
    /^\s*\{\s*"financialStats"\s*:/m,
    /^\s*\{\s*"performance"\s*:/m,
    /^\s*\{\s*"doctor"\s*:/m,
  ];

  let anchor: number | null = null;

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const idx = match.index;
      if (idx < 50) continue;
      anchor = anchor === null ? idx : Math.min(anchor, idx);
    }
  }

  return anchor;
};

const parseRootFromPrefix = (raw: string): Record<string, unknown> | null => {
  const anchor = findCorruptionAnchor(raw);
  if (anchor === null) return null;

  let prefix = stripNonJsonLines(raw.slice(0, anchor));
  prefix = addMissingPropertyCommas(prefix);

  const balance = countBraceBalanceOutsideStrings(prefix);
  if (balance > 0) {
    prefix = `${prefix}\n${"}".repeat(balance)}`;
  }

  return parseJsonObject(prefix);
};

const parseLargestRootCandidate = (raw: string): Record<string, unknown> | null => {
  const sanitized = addMissingPropertyCommas(stripNonJsonLines(raw));
  const candidates: Array<{ score: number; value: Record<string, unknown> }> = [];

  for (let i = 0; i < sanitized.length; i += 1) {
    if (sanitized[i] !== "{") continue;
    const scanned = scanBalancedObject(sanitized, i);
    if (!scanned) continue;
    const parsed = parseJsonObject(scanned.jsonText);
    if (!parsed) continue;

    const keys = Object.keys(parsed);
    const score = scanned.jsonText.length + (keys.some((k) => ROOT_NAMESPACE_HINTS.has(k)) ? 100000 : 0);
    candidates.push({ score, value: parsed });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].value;
};

const extractPatchObjects = (raw: string): Array<{ patch: Record<string, unknown>; before: string }> => {
  const matches: Array<{ patch: Record<string, unknown>; before: string; hash: string }> = [];

  const addCandidate = (startIndex: number) => {
    const scanned = scanBalancedObject(raw, startIndex);
    if (!scanned) return;
    const patch = parseJsonObject(scanned.jsonText);
    if (!patch) return;
    const before = raw.slice(Math.max(0, startIndex - 300), startIndex);
    const hash = JSON.stringify(patch);
    if (matches.some((m) => m.hash === hash)) return;
    matches.push({ patch, before, hash });
  };

  for (const match of raw.matchAll(/^\s*\{\s*"(?:financialStats|performance|doctor)"\s*:/gm)) {
    const idx = match.index;
    if (idx === undefined || idx < 50) continue;
    addCandidate(idx);
  }

  for (const match of raw.matchAll(/MERGE INTO:\s*doctor/gm)) {
    const idx = match.index;
    if (idx === undefined) continue;
    const braceIndex = raw.indexOf("{", idx);
    if (braceIndex === -1) continue;
    addCandidate(braceIndex);
  }

  return matches.map(({ patch, before }) => ({ patch, before }));
};

const repairCorruptedLocaleJson = (raw: string): Record<string, unknown> | null => {
  const root = parseRootFromPrefix(raw) ?? parseLargestRootCandidate(raw);
  if (!root) return null;

  for (const { patch, before } of extractPatchObjects(raw)) {
    if (isPlainObject(patch.doctor)) {
      deepMerge(root, patch);
      continue;
    }

    const patchKeys = Object.keys(patch);
    const shouldMergeIntoDoctor =
      patchKeys.some((key) => DOCTOR_PATCH_KEYS.has(key)) || /MERGE INTO:\s*doctor/i.test(before);

    if (shouldMergeIntoDoctor) {
      if (!isPlainObject(root.doctor)) root.doctor = {};
      deepMerge(root.doctor as Record<string, unknown>, patch);
    } else {
      deepMerge(root, patch);
    }
  }

  return root;
};

const toTitleCaseWords = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (["KPI", "KPIS", "AI", "ROI", "ROAS", "EBITDA", "CAC", "LTV", "TBD", "ID"].includes(upper)) {
        return upper;
      }
      if (upper === "VS") return "vs";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

const humanizeKeySegment = (segment: string): string => {
  const normalized = segment
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return toTitleCaseWords(normalized);
};

const shouldHumanizeMissingKey = (key: string): boolean =>
  key.startsWith("doctor.performance.") ||
  key.startsWith("doctor.financialStats.") ||
  key.startsWith("doctor.profileSetup.") ||
  key === "doctor.loading" ||
  key === "doctor.settingUp";

const humanizeMissingTranslationKey = (key: string): string => {
  if (!shouldHumanizeMissingKey(key)) return key;
  const parts = key.split(".");
  const last = parts[parts.length - 1] || key;
  return humanizeKeySegment(last);
};

const safeJsonParse = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    const repaired = repairCorruptedLocaleJson(data);
    if (repaired) return repaired;

    console.error("[i18n] Failed to parse locale JSON:", err);
    return {};
  }
};

i18n
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

    ns: ["common", "home"],
    defaultNS: "common",
    saveMissing: false,
    parseMissingKeyHandler: humanizeMissingTranslationKey,

    react: {
      useSuspense: false,
      bindI18nStore: "",
    },
  });

applyDirection(i18n.language);

// Update direction when language changes
i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
});

export default i18n;
// src/i18n/config.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

// Static cache buster - changes only on app reload
const APP_VERSION = Date.now();

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const ROOT_NAMESPACE_HINTS = new Set([
  "doctor",
  "patient",
  "admin",
  "superAdmin",
  "shared",
  "common",
]);

const DOCTOR_PATCH_KEYS = new Set([
  "financialStats",
  "performance",
  "profileSetup",
  "loading",
  "settingUp",
]);

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

export const supportedLanguageCodes = languages.map((language) => language.code);
export const BLOG_I18N_NAMESPACE = "blog";
export const I18N_NAMESPACES = [
  "common",
  "home",
  BLOG_I18N_NAMESPACE,
] as const;

export const rtlLanguages = ["ar", "he", "fa", "ur"];

export const isRTL = (langCode: string): boolean => rtlLanguages.includes(langCode);

export const getDirection = (langCode: string): "ltr" | "rtl" =>
  isRTL(langCode) ? "rtl" : "ltr";

export const applyDirection = (langCode: string): void => {
  const dir = getDirection(langCode);
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", langCode);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> => {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      deepMerge(current, value);
      continue;
    }
    target[key] = value;
  }
  return target;
};

const countBraceBalanceOutsideStrings = (text: string): number => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
    }
  }

  return depth;
};

const stripNonJsonLines = (text: string): string =>
  text
    .split("\n")
    .filter((line) => {
      const s = line.trim();
      if (!s) return true;
      if (s.startsWith("//")) return false;
      if (s.startsWith("```")) return false;
      if (/^[A-Za-z]+\s+id=/.test(s)) return false;
      return true;
    })
    .join("\n");

const addMissingPropertyCommas = (text: string): string =>
  text.replace(/}(\s*\n\s*")/g, (match, nextToken, offset, fullText) => {
    let i = Number(offset) - 1;
    while (i >= 0 && /\s/.test(fullText[i])) i -= 1;
    if (i >= 0 && [",", "{", "["].includes(fullText[i])) return match;
    return `},${nextToken}`;
  });

const scanBalancedObject = (
  text: string,
  startIndex: number,
): { jsonText: string; endIndex: number } | null => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          jsonText: text.slice(startIndex, i + 1),
          endIndex: i + 1,
        };
      }
    }
  }

  return null;
};

const parseJsonObject = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isPlainObject(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const findCorruptionAnchor = (text: string): number | null => {
  const patterns = [
    /^\s*\/\/\s*public\/locales\/.*\.json/m,
    /^\s*\{\s*"financialStats"\s*:/m,
    /^\s*\{\s*"performance"\s*:/m,
    /^\s*\{\s*"doctor"\s*:/m,
  ];

  let anchor: number | null = null;

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const idx = match.index;
      if (idx < 50) continue;
      anchor = anchor === null ? idx : Math.min(anchor, idx);
    }
  }

  return anchor;
};

const parseRootFromPrefix = (raw: string): Record<string, unknown> | null => {
  const anchor = findCorruptionAnchor(raw);
  if (anchor === null) return null;

  let prefix = stripNonJsonLines(raw.slice(0, anchor));
  prefix = addMissingPropertyCommas(prefix);

  const balance = countBraceBalanceOutsideStrings(prefix);
  if (balance > 0) {
    prefix = `${prefix}\n${"}".repeat(balance)}`;
  }

  return parseJsonObject(prefix);
};

const parseLargestRootCandidate = (raw: string): Record<string, unknown> | null => {
  const sanitized = addMissingPropertyCommas(stripNonJsonLines(raw));
  const candidates: Array<{ score: number; value: Record<string, unknown> }> = [];

  for (let i = 0; i < sanitized.length; i += 1) {
    if (sanitized[i] !== "{") continue;
    const scanned = scanBalancedObject(sanitized, i);
    if (!scanned) continue;
    const parsed = parseJsonObject(scanned.jsonText);
    if (!parsed) continue;

    const keys = Object.keys(parsed);
    const score =
      scanned.jsonText.length + (keys.some((k) => ROOT_NAMESPACE_HINTS.has(k)) ? 100000 : 0);
    candidates.push({ score, value: parsed });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].value;
};

const extractPatchObjects = (
  raw: string,
): Array<{ patch: Record<string, unknown>; before: string }> => {
  const matches: Array<{ patch: Record<string, unknown>; before: string; hash: string }> = [];

  const addCandidate = (startIndex: number) => {
    const scanned = scanBalancedObject(raw, startIndex);
    if (!scanned) return;
    const patch = parseJsonObject(scanned.jsonText);
    if (!patch) return;
    const before = raw.slice(Math.max(0, startIndex - 300), startIndex);
    const hash = JSON.stringify(patch);
    if (matches.some((m) => m.hash === hash)) return;
    matches.push({ patch, before, hash });
  };

  for (const match of raw.matchAll(/^\s*\{\s*"(?:financialStats|performance|doctor)"\s*:/gm)) {
    const idx = match.index;
    if (idx === undefined || idx < 50) continue;
    addCandidate(idx);
  }

  for (const match of raw.matchAll(/MERGE INTO:\s*doctor/gm)) {
    const idx = match.index;
    if (idx === undefined) continue;
    const braceIndex = raw.indexOf("{", idx);
    if (braceIndex === -1) continue;
    addCandidate(braceIndex);
  }

  return matches.map(({ patch, before }) => ({ patch, before }));
};

const repairCorruptedLocaleJson = (raw: string): Record<string, unknown> | null => {
  const root = parseRootFromPrefix(raw) ?? parseLargestRootCandidate(raw);
  if (!root) return null;

  for (const { patch, before } of extractPatchObjects(raw)) {
    if (isPlainObject(patch.doctor)) {
      deepMerge(root, patch);
      continue;
    }

    const patchKeys = Object.keys(patch);
    const shouldMergeIntoDoctor =
      patchKeys.some((key) => DOCTOR_PATCH_KEYS.has(key)) ||
      /MERGE INTO:\s*doctor/i.test(before);

    if (shouldMergeIntoDoctor) {
      if (!isPlainObject(root.doctor)) root.doctor = {};
      deepMerge(root.doctor as Record<string, unknown>, patch);
    } else {
      deepMerge(root, patch);
    }
  }

  return root;
};

const toTitleCaseWords = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (
        ["KPI", "KPIS", "AI", "ROI", "ROAS", "EBITDA", "CAC", "LTV", "TBD", "ID"].includes(
          upper,
        )
      ) {
        return upper;
      }
      if (upper === "VS") return "vs";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

const humanizeKeySegment = (segment: string): string => {
  const normalized = segment
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return toTitleCaseWords(normalized);
};

const shouldHumanizeMissingKey = (key: string): boolean =>
  key.startsWith("doctor.performance.") ||
  key.startsWith("doctor.financialStats.") ||
  key.startsWith("doctor.profileSetup.") ||
  key === "doctor.loading" ||
  key === "doctor.settingUp";

const humanizeMissingTranslationKey = (key: string): string => {
  if (!shouldHumanizeMissingKey(key)) return key;
  const parts = key.split(".");
  const last = parts[parts.length - 1] || key;
  return humanizeKeySegment(last);
};

const safeJsonParse = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    const repaired = repairCorruptedLocaleJson(data);
    if (repaired) return repaired;

    console.error("[i18n] Failed to parse locale JSON:", err);
    return {};
  }
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,
    supportedLngs: supportedLanguageCodes,
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

    ns: [...I18N_NAMESPACES],
    defaultNS: "common",
    saveMissing: false,
    parseMissingKeyHandler: humanizeMissingTranslationKey,

    react: {
      useSuspense: false,
      bindI18nStore: "",
    },
  });

applyDirection(i18n.language);

// Update direction when language changes
i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
});

export default i18n;
