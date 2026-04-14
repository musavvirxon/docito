

## Plan: Build Full Settings Section with 6-Tab Navigation

**Single file:** `src/pages/AdminDashboard.tsx`

### 1. Add import for Textarea (line 12)
Add `import { Textarea } from "@/components/ui/textarea";` after the Input import.

### 2. Add 3 new state variables (after line 258)
```tsx
const [settingsTab, setSettingsTab] = useState<'clinic' | 'booking' | 'notifications' | 'branding' | 'security' | 'data'>('clinic');
const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({...});
const [bookingSettings, setBookingSettings] = useState({...});
```
Exact shapes as specified in the task.

### 3. Replace `case "settings":` block (lines 4476–4490)
Replace `<EntitySettingsPage>` render with full 6-tab layout inside existing SectionWrapper.

**Header:** "Settings" title with t() key + "Save Changes" button with guard/allowModals.

**Tab bar:** 6 tabs (Clinic Profile, Booking, Notifications, Branding, Security, Data) controlled by `settingsTab`.

**Tab: Clinic Profile**
- No-practice fallback preserved with existing t() keys
- Clinic Information card: 2-col form (name, phone, email, website, address, tax ID, description textarea)
- Social Media card: Instagram, Facebook, LinkedIn, Twitter/X inputs
- Practice Details card: ID + copy button, verification badge using existing `getVerificationStatusColor`, member-since date

**Tab: Booking**
- Online Booking card with master toggle + status badge
- Booking Rules card: 5 numeric settings (window days, min notice, cancellation notice, buffer, max/day)
- Confirmation & Waitlist card with two toggles

**Tab: Notifications**
- Notification events table: 5 event rows × 2 channels (In-App, Email) using toggle buttons from `notifSettings`
- Patient Reminders card: reminder hours + email/SMS toggles
- Admin Alerts card: daily summary, weekly digest, revenue threshold

**Tab: Branding**
- Logo placeholder card with upload button
- Color Theme card: 8 color circles with selection ring
- Booking Page card: custom URL slug input
- Email Template card: header, footer, signature inputs

**Tab: Security**
- Authentication card: 2FA toggle, session timeout select
- Login Activity card: placeholder rows
- Password Policy card: min length + 3 requirement toggles

**Tab: Data**
- Export Data card: full ZIP button + 4 individual CSV buttons
- Data Retention card: retention period select
- Compliance card: GDPR toggle, audit log link
- Danger Zone card: red border, delete practice button with confirm()

### Technical notes
- Add `Textarea` import (only new import needed)
- All toggles implemented as styled `<button>` elements (same pattern used in Booking tab across the codebase) — no Switch component import needed
- All existing t() keys preserved
- guard() + disabled={!allowModals} on all action buttons
- practice?.created_at date formatting in try/catch
- No new files or packages
- Local state only — no Supabase calls

