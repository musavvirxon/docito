import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { languages } from "@/i18n/config";

type SEOType = "website" | "article" | "product";

interface AlternateLanguageLink {
  lang: string;
  href: string;
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string | string[];
  image?: string;
  noindex?: boolean;
  type?: SEOType;
  structuredData?: object | object[];
  canonicalUrl?: string;
  canonicalPath?: string;
  alternateLanguages?: AlternateLanguageLink[];
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
  section?: string;
  tags?: string[];
  siteName?: string;
}

const ogLocaleMap: Record<string, string> = {
  en: "en_US",
  ru: "ru_RU",
  uz: "uz_UZ",
  ar: "ar_AR",
  tr: "tr_TR",
  zh: "zh_CN",
  es: "es_ES",
  pt: "pt_BR",
  de: "de_DE",
  ja: "ja_JP",
  ko: "ko_KR",
};

const DEFAULT_SITE_NAME = "Docito";
const DEFAULT_IMAGE = "/logos/social/docito-og-image.png";
const DEFAULT_AUTHOR = "Docito";
const supportedLanguages = languages.map((language) => language.code);

const normalizeLang = (value?: string) => {
  if (!value) return "en";
  const normalized = value.toLowerCase().split("-")[0];
  return supportedLanguages.includes(normalized) ? normalized : "en";
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const getBaseUrl = () => {
  const envValue =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_APP_URL;

  if (typeof envValue === "string" && envValue.trim()) {
    return normalizeBaseUrl(envValue.trim());
  }

  return "https://docito.app";
};

const toAbsoluteUrl = (baseUrl: string, value?: string | null) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;

  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
  }
};

const normalizeKeywords = (keywords?: string | string[]) => {
  if (!keywords) return undefined;
  if (Array.isArray(keywords)) {
    return keywords.map((keyword) => keyword.trim()).filter(Boolean).join(", ");
  }
  return keywords;
};

const stripLanguagePrefix = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && supportedLanguages.includes(segments[0])) {
    return `/${segments.slice(1).join("/")}`.replace(/\/$/, "") || "/";
  }
  return pathname || "/";
};

const buildLanguageHref = (
  baseUrl: string,
  lang: string,
  pathWithoutLanguage: string,
  search = "",
) => {
  const normalizedPath = pathWithoutLanguage === "/" ? "" : pathWithoutLanguage;
  return `${baseUrl}/${lang}${normalizedPath}${search}`;
};

// --- Schema generators ---

export const generateOrganizationSchema = (baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Docito",
  alternateName: "Docito®",
  url: `${baseUrl}/`,
  logo: toAbsoluteUrl(baseUrl, "/logos/icon/docito-logo-512x512.png"),
  description:
    "Unified healthcare management and booking platform connecting patients, doctors, clinics, labs, pharmacies, and imaging centers.",
});

export const generateMedicalWebsiteSchema = (baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Docito",
  alternateName: "Docito®",
  url: `${baseUrl}/`,
  description:
    "One platform connecting patients, doctors, clinics, labs, pharmacies, imaging centers, and insurance—secure scheduling, referrals, records, and analytics.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${baseUrl}/search-doctors?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

export const generateDoctorSchema = (doctor: {
  name: string;
  specialty: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Physician",
  name: doctor.name,
  medicalSpecialty: doctor.specialty,
  image: doctor.image,
  aggregateRating: doctor.rating
    ? {
        "@type": "AggregateRating",
        ratingValue: doctor.rating,
        reviewCount: doctor.reviewCount || 0,
      }
    : undefined,
  address: doctor.address
    ? {
        "@type": "PostalAddress",
        streetAddress: doctor.address,
      }
    : undefined,
});

export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

// --- Main component ---

export const SEOHead = ({
  title,
  description,
  keywords,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = "website",
  structuredData,
  canonicalUrl,
  canonicalPath,
  alternateLanguages,
  publishedTime,
  modifiedTime,
  authorName,
  section,
  tags,
  siteName = DEFAULT_SITE_NAME,
}: SEOHeadProps) => {
  const { i18n } = useTranslation();
  const location = useLocation();

  const currentLang = normalizeLang(i18n.language);
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const pathWithoutLanguage = useMemo(
    () => stripLanguagePrefix(location.pathname),
    [location.pathname],
  );

  const resolvedCanonicalUrl = useMemo(() => {
    if (canonicalUrl) return toAbsoluteUrl(baseUrl, canonicalUrl);
    if (canonicalPath) return toAbsoluteUrl(baseUrl, canonicalPath);
    return buildLanguageHref(baseUrl, currentLang, pathWithoutLanguage, location.search);
  }, [baseUrl, canonicalPath, canonicalUrl, currentLang, location.search, pathWithoutLanguage]);

  const resolvedImageUrl = useMemo(() => toAbsoluteUrl(baseUrl, image), [baseUrl, image]);
  const resolvedKeywords = useMemo(() => normalizeKeywords(keywords), [keywords]);

  const resolvedAlternates = useMemo(() => {
    if (alternateLanguages?.length) {
      return alternateLanguages
        .map((alternate) => ({
          lang: normalizeLang(alternate.lang),
          href: toAbsoluteUrl(baseUrl, alternate.href) || "",
        }))
        .filter((alternate) => alternate.href);
    }

    return supportedLanguages.map((lang) => ({
      lang,
      href: buildLanguageHref(baseUrl, lang, pathWithoutLanguage, location.search),
    }));
  }, [alternateLanguages, baseUrl, location.search, pathWithoutLanguage]);

  const resolvedStructuredData = useMemo(() => {
    const input = structuredData
      ? Array.isArray(structuredData)
        ? [...structuredData]
        : [structuredData]
      : [];

    if (type === "article" && title && description && resolvedCanonicalUrl) {
      input.push({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        inLanguage: currentLang,
        mainEntityOfPage: resolvedCanonicalUrl,
        image: resolvedImageUrl ? [resolvedImageUrl] : undefined,
        author: {
          "@type": "Organization",
          name: authorName || import.meta.env.VITE_BLOG_DEFAULT_AUTHOR || DEFAULT_AUTHOR,
        },
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: {
            "@type": "ImageObject",
            url: toAbsoluteUrl(baseUrl, "/logos/horizontal/docito-horizontal-sm.png"),
          },
        },
        datePublished: publishedTime,
        dateModified: modifiedTime || publishedTime,
        articleSection: section,
        keywords: tags?.length ? tags.join(", ") : resolvedKeywords,
      });
    }

    return input.filter(Boolean);
  }, [
    authorName,
    baseUrl,
    currentLang,
    description,
    modifiedTime,
    publishedTime,
    resolvedCanonicalUrl,
    resolvedImageUrl,
    resolvedKeywords,
    section,
    siteName,
    structuredData,
    tags,
    title,
    type,
  ]);

  const ogLocale = ogLocaleMap[currentLang] || ogLocaleMap.en;
  const robotsContent = noindex ? "noindex,nofollow" : "index,follow";

  return (
    <Helmet prioritizeSeoTags>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      {resolvedKeywords ? <meta name="keywords" content={resolvedKeywords} /> : null}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:type" content={type} />
      {title ? <meta property="og:title" content={title} /> : null}
      {description ? <meta property="og:description" content={description} /> : null}
      {resolvedCanonicalUrl ? <meta property="og:url" content={resolvedCanonicalUrl} /> : null}
      {resolvedImageUrl ? <meta property="og:image" content={resolvedImageUrl} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? <meta name="twitter:description" content={description} /> : null}
      {resolvedImageUrl ? <meta name="twitter:image" content={resolvedImageUrl} /> : null}
      {resolvedCanonicalUrl ? <link rel="canonical" href={resolvedCanonicalUrl} /> : null}
      {resolvedAlternates.map((alternate) => (
        <link
          key={`${alternate.lang}-${alternate.href}`}
          rel="alternate"
          hrefLang={alternate.lang}
          href={alternate.href}
        />
      ))}
      {resolvedAlternates.length ? (
        <link rel="alternate" hrefLang="x-default" href={resolvedAlternates[0].href} />
      ) : null}
      {publishedTime ? <meta property="article:published_time" content={publishedTime} /> : null}
      {modifiedTime ? <meta property="article:modified_time" content={modifiedTime} /> : null}
      {section ? <meta property="article:section" content={section} /> : null}
      {tags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      {resolvedStructuredData.map((entry, index) => (
        <script key={`seo-json-ld-${index}`} type="application/ld+json">
          {JSON.stringify(entry)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
