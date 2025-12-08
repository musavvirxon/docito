# Docito Visual Assets

This folder contains all visual assets for the Docito platform including Lottie animations, SVG fallbacks, and static images.

## Folder Structure

```
/public/visuals/
├── lottie/           # Lottie JSON animation files
├── svg/              # SVG fallback images
├── images/           # Static images (WebP, PNG)
└── README.md         # This file
```

## Lottie Animations

| File Name | Usage Location | Alt Text Key | Description |
|-----------|---------------|--------------|-------------|
| `hero-search.json` | Homepage Hero | `visuals.hero.altText` | Dashboard with floating avatars and search |
| `features-appointments.json` | Features Section | `visuals.appointments.altText` | Calendar with flipping dates |
| `features-prescriptions.json` | Features Section | `visuals.prescriptions.altText` | Prescription form being filled |
| `features-files.json` | Features Section | `visuals.files.altText` | Files organizing into folders |
| `features-notes.json` | Features Section | `visuals.notes.altText` | Note being written with pen |
| `dashboard-preview.json` | Dashboard Preview, Doctor Profile | `visuals.dashboard.altText` | Animated dashboard interface |
| `collaboration.json` | Collaboration Section | `visuals.collaboration.altText` | Team members connected to patient file |
| `mobile-ui.json` | Mobile Section | `visuals.mobile.altText` | Mobile app swipe animations |
| `success-confetti.json` | Sign Up Success | `visuals.success.altText` | Confetti celebration |
| `security-shield.json` | Auth Pages | `visuals.security.altText` | Security shield with lock |

## SVG Fallbacks

Each Lottie animation has a corresponding SVG fallback for:
- Users with `prefers-reduced-motion` enabled
- Browsers that don't support Lottie
- Performance optimization on mobile

## Usage

### React Component
```tsx
import LottieIllustration from '@/components/Visuals/LottieIllustration';

<LottieIllustration 
  name="hero-search"
  mode="loop"
  size="large"
  ariaLabel={t('visuals.hero.altText')}
/>
```

### Props
- `name`: Animation name (matches file name without extension)
- `mode`: `'idle'` | `'play-once'` | `'hover'` | `'loop'`
- `size`: `'small'` | `'medium'` | `'large'`
- `ariaLabel`: Accessibility label (use i18n key)
- `className`: Additional CSS classes
- `fallbackComponent`: Custom fallback React component

## Accessibility

All animations respect `prefers-reduced-motion` media query. When enabled:
- Lottie animations are replaced with static SVG fallbacks
- Hover effects are disabled
- Auto-play is prevented

## Performance Guidelines

- Total Lottie weight per page should be < 300KB
- Use `loading="lazy"` for below-the-fold animations
- Preload hero animation only if < 100KB
- Use WebP format for static images

## i18n Keys

All alt text and labels should use translation keys:
- `visuals.hero.altText`
- `visuals.appointments.altText`
- `visuals.prescriptions.altText`
- `visuals.files.altText`
- `visuals.notes.altText`
- `visuals.dashboard.altText`
- `visuals.collaboration.altText`
- `visuals.mobile.altText`
- `visuals.success.altText`
- `visuals.security.altText`
