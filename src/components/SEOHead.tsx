import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  noindex?: boolean;
}

const languages = ['en', 'ru', 'uz', 'ar'];

export const SEOHead = ({ 
  title, 
  description, 
  keywords,
  image = '/logos/social/docito-og-image.png',
  noindex = false 
}: SEOHeadProps) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const currentLang = i18n.language || 'en';
  const baseUrl = 'https://docito.app';

  useEffect(() => {
    // Set title
    if (title) {
      document.title = title;
    }

    // Set meta description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    // Set meta keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // Set Open Graph tags
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: `${baseUrl}${image}` },
      { property: 'og:url', content: `${baseUrl}${location.pathname}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: currentLang === 'en' ? 'en_US' : `${currentLang}_${currentLang.toUpperCase()}` },
    ];

    ogTags.forEach(({ property, content }) => {
      if (content) {
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      }
    });

    // Set Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: `${baseUrl}${image}` },
    ];

    twitterTags.forEach(({ name, content }) => {
      if (content) {
        let metaTag = document.querySelector(`meta[name="${name}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', name);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      }
    });

    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${baseUrl}${location.pathname}`);

    // Set robots meta tag
    if (noindex) {
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    }

    // Add hreflang tags for all supported languages
    // Remove existing hreflang tags first
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.remove());

    languages.forEach(lang => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      link.setAttribute('href', `${baseUrl}/${lang}${location.pathname}`);
      document.head.appendChild(link);
    });

    // Add x-default hreflang
    const xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    xDefault.setAttribute('href', `${baseUrl}/en${location.pathname}`);
    document.head.appendChild(xDefault);

    // Set lang attribute on html element
    document.documentElement.lang = currentLang;

  }, [title, description, keywords, image, currentLang, location.pathname, noindex]);

  return null;
};
