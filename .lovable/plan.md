# Fix Build Errors and Restore Platform

The platform is broken due to duplicate code blocks left in two critical files, plus a few type errors in blog components. Here is the plan to fix everything:

## 1. Fix `src/i18n/config.ts` -- Remove duplicate code block

The file contains the entire module twice (lines 1-401 is the old version, lines 402-818 is the new version with blog namespace support). The new version (lines 402-818) is the better one with `supportedLanguageCodes`, `BLOG_I18N_NAMESPACE`, and `I18N_NAMESPACES` exports.

**Action**: Keep only the new version (lines 402-818), removing the `// src/i18n/config.ts` comment at line 402 and fixing the duplicate default export.

## 2. Fix `src/components/SEOHead.tsx` -- Remove duplicate code blocks

The file has THREE versions of `SEOHead` concatenated:

- Lines 1-334: Old imperative DOM-based version (no Helmet)
- Lines 336-601: New Helmet-based version with article/blog support (best version)
- Lines 602-848: Third older Helmet version

**Action**: Keep only the second version (lines 336-601) which has the richest feature set (article metadata, blog SEO support, proper Helmet usage). Merge in the useful schema helpers (`generateDoctorSchema`, `generateFAQSchema`, `generateBreadcrumbSchema`) from the first version and the `generateOrganizationSchema`/`generateMedicalWebsiteSchema` from version 1 (the second version already has its own).

## 3. Fix `src/hooks/useBlogDrafts.ts` -- Fix import

Line 2 imports `BlogLanguage` from `@/config/blog` but that type is exported from `@/types/blog`. Change the import source.

## 4. Fix `src/hooks/blog/useBlogStudio.ts` -- Relax `updateActiveSharedFields` signature

The function requires `Pick<BlogPostRecord, "featured" | "coverImage" | "tags">` (all three fields mandatory), but callers pass partial objects like `{ groupId: value }` or `{ coverImage: value }`. Change the signature to `Partial<BlogPostRecord>`.

## 5. Fix `src/components/super-admin/blog/RichBlogEditor.tsx` -- Fix `setContent` call

Line 157: `editor.commands.setContent(incoming as JSONContent, false)` -- the second argument should be an options object `{ emitUpdate: false }`, not a bare `false`.

---

## Technical Details

### File: `src/i18n/config.ts`

- Delete lines 1-401 (old duplicate)
- Remove the comment `// src/i18n/config.ts` at line 402
- The remaining code (new version) already has `supportedLanguageCodes` and `I18N_NAMESPACES`

### File: `src/components/SEOHead.tsx`

- Keep lines 336-601 as the primary `SEOHead` component (Helmet-based with full article/blog support)
- Port `generateDoctorSchema`, `generateFAQSchema`, `generateBreadcrumbSchema` from lines 284-334 into the final file
- Port `generateOrganizationSchema` and `generateMedicalWebsiteSchema` from lines 255-282
- Delete lines 1-335 and lines 602-848

### File: `src/hooks/useBlogDrafts.ts`

- Change `import { ... type BlogLanguage } from "@/config/blog"` to import `BlogLanguage` from `"@/types/blog"`

### File: `src/hooks/blog/useBlogStudio.ts`

- Change `updateActiveSharedFields` parameter type from `Pick<BlogPostRecord, "featured" | "coverImage" | "tags"> & Partial<BlogPostRecord>` to `Partial<BlogPostRecord>`
- Also update the same signature in `useBlogDrafts.ts` `updateSharedFields`

### File: `src/components/super-admin/blog/RichBlogEditor.tsx`

- Change `editor.commands.setContent(incoming as JSONContent, false)` to `editor.commands.setContent(incoming as JSONContent, { emitUpdate: false })`

also fix backend if there is any error.