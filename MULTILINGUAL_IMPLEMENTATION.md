# Multilingual Implementation Guide

## Overview
Your Docito platform now supports English, Russian, Uzbek, and Arabic with full database localization and SEO-friendly URLs.

## ✅ What's Been Implemented

### 1. Database Localization
**Tables with multilingual support:**
- `practices` - name, description (en, ru, uz, ar)
- `doctors` - specialty, bio (en, ru, uz, ar)
- `practice_services` - name, description (en, ru, uz, ar)
- `practice_locations` - name, address (en, ru, uz, ar)
- `user_preferences` - stores user's preferred language

**Migration Status:** ✅ Complete - All existing data migrated to `_en` fields

### 2. Language Persistence
- **Authenticated users**: Language saved to `user_preferences` table
- **Guest users**: Language saved to `localStorage`
- **Auto-detection**: Falls back to browser language

### 3. SEO Features
- **URL Structure**: 
  - Public pages: `/en/`, `/ru/`, `/uz/`, `/ar/`
  - Private dashboards: No language prefix
- **Meta Tags**: Title, description, keywords per language
- **hreflang tags**: Automatic cross-language indexing
- **Open Graph & Twitter Cards**: Localized social sharing

### 4. Components Created
- `useLanguagePreference` - Hook for language management
- `SEOHead` - Component for meta tags & hreflang
- `LanguageRouter` - Handles URL-based language routing
- `useContentTranslation` - Enhanced with `buildLocalizedSelect()`

## 🔧 How to Use

### Fetching Localized Data from Database

```typescript
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { supabase } from '@/integrations/supabase/client';

const MyComponent = () => {
  const { getTranslatedField, buildLocalizedSelect, currentLanguage } = useContentTranslation();
  
  // Example 1: Fetch with all language fields
  const fetchDoctors = async () => {
    const selectFields = buildLocalizedSelect(
      ['specialty', 'bio'],  // Fields to localize
      ['id', 'user_id', 'consultation_fee']  // Non-localized fields
    );
    
    const { data } = await supabase
      .from('doctors')
      .select(selectFields);
      
    return data;
  };
  
  // Example 2: Display localized field
  const doctor = { 
    specialty_en: 'Cardiology', 
    specialty_ru: 'Кардиология',
    bio_en: 'Heart specialist',
    bio_ru: 'Кардиолог'
  };
  
  return (
    <div>
      <h3>{getTranslatedField(doctor, 'specialty')}</h3>
      <p>{getTranslatedField(doctor, 'bio')}</p>
    </div>
  );
};
```

### Adding SEO to Pages

```typescript
import { SEOHead } from '@/components/SEOHead';
import { useTranslation } from 'react-i18next';

const MyPage = () => {
  const { t } = useTranslation('pagename');
  
  return (
    <>
      <SEOHead 
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
        image="/path/to/og-image.jpg"  // optional
        noindex={false}  // optional, for private pages
      />
      <div>Page content...</div>
    </>
  );
};
```

### Updating Translation Files

**Add SEO section to `/public/locales/{lang}/pagename.json`:**

```json
{
  "seo": {
    "title": "Page Title - 50-60 characters",
    "description": "Page description 150-160 characters with main keywords",
    "keywords": "keyword1, keyword2, keyword3"
  },
  "content": {
    "heading": "Your heading text"
  }
}
```

### Saving Content in Multiple Languages

**Example: Creating a practice with localized data:**

```typescript
const createPractice = async (data) => {
  const { error } = await supabase
    .from('practices')
    .insert({
      name_en: data.nameEn,
      name_ru: data.nameRu,
      name_uz: data.nameUz,
      name_ar: data.nameAr,
      description_en: data.descriptionEn,
      description_ru: data.descriptionRu,
      description_uz: data.descriptionUz,
      description_ar: data.descriptionAr,
      // ... other fields
    });
    
  return !error;
};
```

## 🌐 URL Structure

### Public Pages (SEO-friendly)
- Home: `/en/`, `/ru/`, `/uz/`, `/ar/`
- Doctors: `/en/doctors`, `/ru/doctors`, `/uz/doctors`, `/ar/doctors`
- Practices: `/en/practices`, etc.

### Private Pages (No language prefix)
- Patient Dashboard: `/patient-dashboard`
- Doctor Dashboard: `/doctor-dashboard`
- Admin Dashboard: `/admin-dashboard`

**Automatic Redirect:** Public URLs without language prefix (`/`) automatically redirect to `/en/` (or user's preferred language).

## 🔍 SEO Best Practices

1. **Page Titles**: 50-60 characters, include main keyword
2. **Meta Descriptions**: 150-160 characters, compelling CTA
3. **Keywords**: 5-10 relevant keywords, comma-separated
4. **H1 Tags**: One per page, match title intent
5. **Alt Text**: All images need descriptive alt attributes
6. **Canonical URLs**: Automatically handled by SEOHead
7. **hreflang**: Automatically added for all language versions

## 📝 Translation File Structure

```
public/locales/
├── en/
│   ├── common.json
│   ├── home.json
│   ├── dashboard.json
│   ├── doctors.json
│   └── ...
├── ru/
├── uz/
└── ar/
```

**Note:** Some translation files have corrupted line numbers. Run this to clean them:

```bash
# Fix corrupted JSON files (if needed)
find public/locales -name "*.json" -exec sed -i 's/^[0-9]*: //g' {} \;
```

## 🚀 Testing Language Switching

1. Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Select language from dropdown in header
3. Page will reload with new language
4. Check URL structure on public vs. private pages
5. Verify database content shows in correct language

## 🔐 Security

- RLS policies already in place for `user_preferences`
- Language data is stored safely in user's profile
- Guests use `localStorage` only

## 📊 Current Translation Status

| Language | Code | UI | Database | SEO |
|----------|------|-----|----------|-----|
| English  | en   | ✅  | ✅       | ✅  |
| Russian  | ru   | ✅  | ✅       | ✅  |
| Uzbek    | uz   | ✅  | ✅       | ✅  |
| Arabic   | ar   | ✅  | ✅       | ✅ (RTL) |
| German   | de   | ⚠️  | ❌       | ❌  |
| Spanish  | es   | ⚠️  | ❌       | ❌  |
| Turkish  | tr   | ⚠️  | ❌       | ❌  |
| Chinese  | zh   | ⚠️  | ❌       | ❌  |
| Portuguese | pt | ⚠️  | ❌       | ❌  |
| Japanese | ja   | ⚠️  | ❌       | ❌  |
| Korean   | ko   | ⚠️  | ❌       | ❌  |

**Legend:**
- ✅ Fully implemented
- ⚠️ UI translations only (no database support)
- ❌ Not implemented

## 🎯 Next Steps

1. **Add SEO sections to all translation files**
2. **Update existing queries** to use `buildLocalizedSelect()`
3. **Create admin interface** for managing translations
4. **Implement translation forms** for practices/doctors
5. **Add language field** to TranslationManagement page

## 🐛 Troubleshooting

**Translations not showing:**
- Hard refresh browser
- Check console for i18n loading errors
- Verify JSON files don't have syntax errors

**Database fields not localized:**
- Confirm migration ran successfully
- Check if you're using `getTranslatedField()`
- Verify `buildLocalizedSelect()` includes the field

**SEO tags not appearing:**
- Ensure `<SEOHead />` component is used
- Check translation keys exist
- Verify language is loaded before render

## 📧 Support

For questions or issues with the multilingual implementation, refer to the code comments in:
- `src/hooks/useLanguagePreference.ts`
- `src/hooks/useContentTranslation.ts`
- `src/components/SEOHead.tsx`
- `src/components/LanguageRouter.tsx`
