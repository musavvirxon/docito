import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'product';
  structuredData?: object;
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

function normalizeLang(lng?: string): string {
  if (!lng) return 'en';
  return lng.split('-')[0];
}

function toAbsoluteUrl(baseUrl: string, url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}

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

  const baseUrl = 'https://docito.app';
  const lang = normalizeLang(i18n.language || 'en');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (title) document.title = title;

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    const absImage = toAbsoluteUrl(baseUrl, image);
    const canonicalUrl = `${baseUrl}${location.pathname}`;
    const ogLocale = ogLocaleMap[lang] || ogLocaleMap.en;

    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: absImage },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:type', content: type },
      { property: 'og:locale', content: ogLocale },
      { property: 'og:site_name', content: 'Docito' }
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

    // hreflang
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => link.remove());

    const pathWithoutLangPrefix = location.pathname.replace(
      /^\/(en|ru|uz|ar|tr|zh|es|pt|de|ja|ko)(\/|$)/,
      '/'
    );

    const normalizedPath = pathWithoutLangPrefix === '' ? '/' : pathWithoutLangPrefix;

    languages.forEach((lng) => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lng);
      link.setAttribute('href', `${baseUrl}/${lng}${normalizedPath === '/' ? '' : normalizedPath}`);
      document.head.appendChild(link);
    });

    const xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    xDefault.setAttribute('href', `${baseUrl}/en${normalizedPath === '/' ? '' : normalizedPath}`);
    document.head.appendChild(xDefault);

    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    const existingScript = document.querySelector('script[type="application/ld+json"][data-seo="true"]');
    if (existingScript) existingScript.remove();

    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, image, lang, dir, location.pathname, noindex, type, structuredData]);

  return null;
};

export const generateOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Docito',
  url: 'https://docito.app',
  logo: 'https://docito.app/logos/docito-logo.png',
  description:
    'Unified healthcare management and booking platform connecting patients, doctors, clinics, labs, pharmacies, and imaging centers.',
  sameAs: ['https://twitter.com/docito', 'https://facebook.com/docito', 'https://linkedin.com/company/docito'],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-800-DOCITO',
    contactType: 'customer service',
    availableLanguage: [
      'English',
      'Russian',
      'Uzbek',
      'Arabic',
      'Turkish',
      'Chinese',
      'Spanish',
      'Portuguese',
      'German',
      'Japanese',
      'Korean'
    ]
  }
});

export const generateMedicalWebsiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Docito',
  url: 'https://docito.app',
  description:
    'One platform connecting patients, doctors, clinics, labs, pharmacies, imaging centers, and insurance—secure scheduling, referrals, records, and analytics.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://docito.app/search?q={search_term_string}'
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
