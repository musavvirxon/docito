# Complete clinic admin translations in English, Russian, and Uzbek

Remove every raw translation key and untranslated user-facing string from the clinic admin dashboard, including buttons, dialogs, filters, statuses, notifications, reports, and empty states.

## Verified issues

- The main dashboard requests several labels from the `dashboard` dictionary using paths such as `admin.overview.*`, while those labels currently live in the separate `admin` dictionary as `overview.*`. This is why keys such as `admin.overview.viewAll` and `admin.actions.inviteDoctor` appear on screen.
- The main clinic admin page currently calls 56 keys missing from each of the EN, RU, and UZ `dashboard` dictionaries, plus 12 integration keys missing from all three `admin` dictionaries.
- User-facing English is still hardcoded in clinic admin sections, including analytics/report actions, provider and patient statuses, finance labels, branch selectors, patient finance, superbills, settings, placeholders, accessibility labels, success/error messages, and modal buttons.
- The EN, RU, and UZ dictionaries are not synchronized, so fallback behavior differs by language.

## Implementation

### 1. Correct translation namespace usage

- Route each label through the dictionary where it is actually defined instead of duplicating or displaying the key.
- Use the admin translator for shared admin roots such as overview, actions, providers, services, locations, patients, tabs, setup, and error states.
- Keep existing dashboard-specific sections in the dashboard dictionary where they already belong.
- Correct namespace mismatches in nested clinic admin components as well as the main page.

### 2. Translate the complete clinic admin experience

Audit and replace literals throughout these visible areas:

- Overview, verification status, quick actions, appointments, staff invitations, performance, and financial metrics
- Doctors/providers, schedules, rules, services, locations, patients, documents, and imports
- Billing, patient balances, recorded payments, superbills, invoices, doctor payments, payroll, compensation, and finance ledgers
- Analytics, report builder, generated reports, filters, exports, and scheduled reports
- Staff management, join/access controls, inventory, rooms/beds, queue displays, branches, and clinic settings
- All buttons, icon tooltips, form labels, placeholders, status badges, table headings, empty/loading/error states, confirmations, prompts, and toast messages

Dynamic clinical or business data such as names, service names, and addresses will remain unchanged; only interface text and known status/category labels will be translated.

### 3. Synchronize EN, RU, and UZ dictionaries

- Add every required key to the correct namespace in all three languages.
- Provide natural English, Russian, and Uzbek wording rather than copying English as a fallback.
- Keep interpolation variables and plural/count behavior consistent across languages.
- Translate known dynamic values such as active, pending, approved, rejected, completed, cancelled, payment methods, report units, and recurrence labels before rendering.
- Localize displayed dates and number/currency context using the selected interface language.

### 4. Prevent regressions

- Add a focused translation audit for the clinic admin page and its directly rendered child sections.
- Check that every referenced key exists in EN, RU, and UZ and that visible interface literals are not reintroduced.
- Keep technical identifiers that users must enter exactly, such as spreadsheet column names, medical codes, and currency codes, unchanged while translating their surrounding explanations.

## Verification

- Open every clinic admin sidebar section in English, Russian, and Uzbek.
- Confirm no dotted keys such as `admin.overview.*` appear anywhere.
- Confirm every button, menu item, filter, dialog, status, table, empty state, and notification changes language.
- Exercise report generation, payment/superbill dialogs, staff access, inventory, rooms, and settings actions to cover conditional text.
- Run the translation-key audit and the project checks, then visually verify desktop and mobile layouts for longer Russian and Uzbek labels.
