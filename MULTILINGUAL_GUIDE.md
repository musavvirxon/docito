# Multilingual Support Guide

Your application now has comprehensive multilingual support for **English, Russian, Uzbek, and Arabic**.

## 🌍 What's Been Implemented

### 1. **User Interface Translations**
- All UI text is now translatable using i18next
- Translation files located in `public/locales/{language}/`
- Currently supported: `en`, `ru`, `uz`, `ar`

### 2. **Language Switcher**
- Visible in the navbar (desktop & mobile)
- Displays language flag and name
- Persists selection in localStorage
- Supports RTL languages (Arabic)

### 3. **Translation Files Structure**
```
public/locales/
├── en/
│   ├── common.json    (navigation, buttons, forms)
│   ├── home.json      (homepage content)
│   ├── auth.json      (authentication pages)
│   ├── dashboard.json (dashboard content)
│   ├── doctors.json   (doctor-related content)
│   └── patients.json  (patient-related content)
├── ru/
├── uz/
└── ar/
```

### 4. **Database Content Translations**
- Use the `useContentTranslation()` hook for database content
- Store translations in the `page_translations` table
- Three helper functions available:
  - `getTranslatedContent(pageKey, contentKey, fallback)`
  - `getPageTranslations(pageKey)`
  - `getTranslatedField(record, fieldName)`

---

## 📝 How to Use Translations in Components

### Basic Translation
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation('common'); // or 'home', 'auth', etc.
  
  return (
    <button>{t('buttons.save')}</button>
  );
};
```

### With Namespace
```tsx
const { t } = useTranslation('home');
<h1>{t('hero.title1')}</h1>
```

### With Fallback
```tsx
<p>{t('search.searching', 'Searching...')}</p>
```

---

## 🗄️ Database Content Translation Strategies

### Strategy 1: Using `page_translations` Table (Recommended)
Store structured translations in the database:

```tsx
import { useContentTranslation } from '@/hooks/useContentTranslation';

const MyPage = () => {
  const { getPageTranslations } = useContentTranslation();
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const translations = await getPageTranslations('about');
      setContent(translations);
    };
    loadContent();
  }, []);

  return <h1>{content?.hero?.title}</h1>;
};
```

### Strategy 2: Language-Specific Columns
Add columns to your tables: `name_en`, `name_ru`, `name_uz`, `name_ar`

```tsx
const { getTranslatedField } = useContentTranslation();

const specialty = getTranslatedField(doctor, 'specialty');
// Returns: doctor.specialty_ru if language is 'ru'
// Falls back to doctor.specialty_en or doctor.specialty
```

### Strategy 3: Separate Translation Table
Create a `translations` table:
```sql
CREATE TABLE translations (
  id uuid PRIMARY KEY,
  entity_type varchar,  -- 'doctor', 'practice', etc.
  entity_id uuid,
  field_name varchar,   -- 'name', 'description', etc.
  language varchar(2),
  value text
);
```

---

## ➕ Adding New Translations

### 1. Add to Translation Files
Edit `public/locales/{lang}/{namespace}.json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}
```

### 2. Use in Component
```tsx
const { t } = useTranslation('common');
<h1>{t('myFeature.title')}</h1>
```

---

## 🌐 Adding New Languages

### 1. Update Language Config
Edit `src/i18n/config.ts`:
```typescript
export const languages = [
  // ... existing languages
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];
```

### 2. Create Translation Files
Create folder: `public/locales/fr/`
Add files: `common.json`, `home.json`, etc.

### 3. Add to Supabase (if using database translations)
Update the `page_translations` table structure to include the new language.

---

## 🔄 RTL Language Support

Arabic and other RTL languages are automatically supported:
- Document direction changes to `dir="rtl"`
- CSS automatically adjusts layout
- Handled in `App.tsx` via `useEffect`

---

## 🎨 Current Implementation

### Components Using Translations:
- ✅ `ModernNavbar` - Navigation & auth buttons
- ✅ `ModernHeroSection` - Hero content & features
- ✅ `ProminentSearchBar` - Search placeholders & button
- ✅ `LanguageSwitcher` - Language dropdown

### Translation Files Populated:
- ✅ `common.json` - All 4 languages
- ✅ `home.json` - All 4 languages
- ⚠️ Other files (auth, dashboard, etc.) - Ready for content

---

## 📋 Next Steps

1. **Translate Remaining Components**
   - Add translations for other sections (Features, Specialties, etc.)
   - Update forms and modals

2. **Populate Translation Files**
   - Fill `auth.json` for login/signup pages
   - Fill `dashboard.json` for dashboard content
   - Fill `doctors.json` and `patients.json`

3. **Database Content**
   - Decide on translation strategy (columns vs table)
   - Migrate existing data
   - Update queries to fetch translated content

4. **Testing**
   - Test all pages in all languages
   - Verify RTL layout for Arabic
   - Check mobile responsiveness

---

## 🛠️ Useful Hooks & Utilities

### `useTranslation(namespace)`
Core i18next hook for UI translations

### `useContentTranslation()`
Custom hook for database content:
- `currentLanguage` - Current selected language
- `getTranslatedContent()` - Get specific translation
- `getPageTranslations()` - Get all page translations
- `getTranslatedField()` - Get translated field from record

### Language Switching
```tsx
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
i18n.changeLanguage('ru'); // Switch to Russian
```

---

## 💡 Best Practices

1. **Always use translation keys** - Never hardcode text
2. **Provide fallbacks** - Use `t('key', 'Fallback text')`
3. **Organize by namespace** - Keep translation files manageable
4. **Use nested keys** - `t('hero.features.payments')`
5. **Test RTL layouts** - Especially for Arabic users
6. **Keep keys consistent** - Same structure across all languages

---

## 🐛 Troubleshooting

### Translations not loading?
- Check browser console for errors
- Verify file paths: `public/locales/{lang}/{namespace}.json`
- Ensure namespace is registered in `src/i18n/config.ts`

### Language not switching?
- Check localStorage: `i18nextLng`
- Verify language code matches config
- Clear browser cache

### RTL not working?
- Check `App.tsx` useEffect for direction logic
- Verify language has `dir: 'rtl'` in config
- Check CSS for `[dir="rtl"]` specificity issues

---

For questions or issues, refer to the [i18next documentation](https://www.i18next.com/).
