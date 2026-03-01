import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'product';
  structuredData?: object | object[];
}

const languages = ['en', 'ru', 'uz', 'ar', 'tr', 'zh', 'es', 'pt', 'de', 'ja', 'ko'];

const ogLocaleMap: Record<string, string> = {
  en: 'en_US',
  ru: 'ru_RU',
  uz: 'uz_UZ',
  ar: 'ar_AR',
  tr: 'tr_TR',
  zh: 'zh_CN',
  es: 'es_ES',
  pt: 'pt_BR',
  de: 'de_DE',
  ja: 'ja_JP',
  ko: 'ko_KR'
};

const normalizeLang = (lng?: string) => {
  if (!lng) return 'en';
  return lng.split('-')[0];
};

const normalizeBaseUrl = (raw: string) => raw.replace(/\/+$/, '');

const getBaseUrl = () => {
  const env =
    (import.meta as any)?.env?.VITE_SITE_URL ||
    (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL ||
    (import.meta as any)?.env?.VITE_APP_URL;

  const fromEnv = typeof env === 'string' ? env.trim() : '';
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  // Use the published Lovable domain as default
  return 'https://docito.app';
};

const toAbsoluteUrl = (baseUrl: string, url: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, `${baseUrl}/`).toString();
  } catch {
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
};

export const SEOHead = ({
  title,
  description,
  keywords,
  image = '/logos/social/docito-og-image.png',
  noindex = false,
  type = 'website',
  structuredData
}: SEOHeadProps) => {
  const { i18n } = useTranslation();
  const location = useLocation();

  const currentLang = normalizeLang(i18n.language || 'en');
  const baseUrl = useMemo(() => getBaseUrl(), []);

  useEffect(() => {
    try {
      if (typeof document === 'undefined') return;

      if (title) document.title = title;

      if (description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', String(description));
      }

      if (keywords) {
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', String(keywords));
      }

      // Ensure app/site name metadata (helps across platforms)
      const ensureMeta = (selector: string, attrs: Record<string, string>) => {
        let meta = document.querySelector(selector) as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          Object.entries(attrs).forEach(([k, v]) => meta!.setAttribute(k, v));
          document.head.appendChild(meta);
          return meta;
        }
        Object.entries(attrs).forEach(([k, v]) => meta!.setAttribute(k, v));
        return meta;
      };

      ensureMeta('meta[name="application-name"]', { name: 'application-name', content: 'Docito' });
      ensureMeta('meta[name="apple-mobile-web-app-title"]', { name: 'apple-mobile-web-app-title', content: 'Docito' });

      // Canonical should be stable (no query/hash by default)
      const canonicalUrl = `${baseUrl}${location.pathname}`;
      const absImage = toAbsoluteUrl(baseUrl, image);
      const ogLocale = ogLocaleMap[currentLang] || ogLocaleMap.en;

      const ogTags = [
        { property: 'og:site_name', content: 'Docito®' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: absImage },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:type', content: type },
        { property: 'og:locale', content: ogLocale }
      ];

      ogTags.forEach(({ property, content }) => {
        if (!content) return;
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', String(content));
      });

      const twitterTags = [
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: absImage },
        { name: 'twitter:site', content: '@docito' }
      ];

      twitterTags.forEach(({ name, content }) => {
        if (!content) return;
        let metaTag = document.querySelector(`meta[name="${name}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', name);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', String(content));
      });

      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalUrl);

      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow');

      // hreflang (never let SEO crash the UI)
      const existingAlternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
      for (let i = 0; i < existingAlternates.length; i += 1) {
        const node = existingAlternates[i];
        if (node && node.parentNode) node.parentNode.removeChild(node);
      }

      const pathWithoutLangPrefix = location.pathname.replace(
        /^\/(en|ru|uz|ar|tr|zh|es|pt|de|ja|ko)(\/|$)/,
        '/'
      );

      const normalizedPath = pathWithoutLangPrefix === '' ? '/' : pathWithoutLangPrefix;
      const suffix = normalizedPath === '/' ? '' : normalizedPath;

      languages.forEach((lang) => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', lang);
        link.setAttribute('href', `${baseUrl}/${lang}${suffix}`);
        document.head.appendChild(link);
      });

      const xDefault = document.createElement('link');
      xDefault.setAttribute('rel', 'alternate');
      xDefault.setAttribute('hreflang', 'x-default');
      xDefault.setAttribute('href', `${baseUrl}/en${suffix}`);
      document.head.appendChild(xDefault);

      document.documentElement.lang = currentLang;
      document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

      // Always include Organization + WebSite schema (helps Google site name + logo)
      const defaultSchemas = [
        generateOrganizationSchema(baseUrl),
        generateMedicalWebsiteSchema(baseUrl)
      ];

      const extra = structuredData
        ? Array.isArray(structuredData)
          ? structuredData
          : [structuredData]
        : [];

      const combined = [...defaultSchemas, ...extra];

      const existingScript = document.querySelector('script[type="application/ld+json"][data-seo="true"]');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'true');
      script.textContent = JSON.stringify(combined);
      document.head.appendChild(script);
    } catch (err) {
      // SEO must never crash the app
      console.error('[SEOHead] Failed to apply tags', err);
    }
  }, [
    title,
    description,
    keywords,
    image,
    currentLang,
    location.pathname,
    noindex,
    type,
    structuredData,
    baseUrl
  ]);

  return null;
};

export const generateOrganizationSchema = (baseUrl: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Docito',
  alternateName: 'Docito®',
  url: `${baseUrl}/`,
  logo: toAbsoluteUrl(baseUrl, '/logos/icon/docito-logo-512x512.png'),
  description:
    'Unified healthcare management and booking platform connecting patients, doctors, clinics, labs, pharmacies, and imaging centers.'
});

export const generateMedicalWebsiteSchema = (baseUrl: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Docito',
  alternateName: 'Docito®',
  url: `${baseUrl}/`,
  description:
    'One platform connecting patients, doctors, clinics, labs, pharmacies, imaging centers, and insurance—secure scheduling, referrals, records, and analytics.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${baseUrl}/search-doctors?q={search_term_string}`
    },
    'query-input': 'required name=search_term_string'
  }
});

export const generateDoctorSchema = (doctor: {
  name: string;
  specialty: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Physician',
  name: doctor.name,
  medicalSpecialty: doctor.specialty,
  image: doctor.image,
  aggregateRating: doctor.rating
    ? {
        '@type': 'AggregateRating',
        ratingValue: doctor.rating,
        reviewCount: doctor.reviewCount || 0
      }
    : undefined,
  address: doctor.address
    ? {
        '@type': 'PostalAddress',
        streetAddress: doctor.address
      }
    : undefined
});

export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer
    }
  }))
});

export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url
  }))
});

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
