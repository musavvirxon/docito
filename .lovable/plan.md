

## Plan: Build Full Patients Section with Directory + Profile Views

**Single file:** `src/pages/AdminDashboard.tsx`

### 1. Add 5 new state variables (~line 210, after provider state block)
- `selectedPatient`, `patientTab`, `patientSearch`, `patientStatusFilter`, `patientProviderFilter`

### 2. Replace `case "patients":` block (lines 1793–2009)
Replace entirely with two-view structure toggled by `selectedPatient`:

**View 1 — Directory** (when `selectedPatient === null`):
- Keep existing header row (title + export button with guard)
- Keep existing 4 KPI cards
- NEW filters row: search input, status buttons (All/Active/Inactive), provider dropdown
- Replace flat patient list with filtered rows showing avatar initials, name, doctor, last visit, status badge, and Eye "View Profile" button
- Keep existing right sidebar (Patient Statistics card, lg:col-span-4)
- Keep existing 3 insight cards (Provider Assignment, Recent Visits, Status Segmentation)

**View 2 — Profile** (when `selectedPatient !== null`):
- Back button → `setSelectedPatient(null)`
- Profile header card with avatar, name, status, contact info, action buttons (Edit/New Appointment/Block → toast.info)
- 6-tab bar: Overview, Appointments, Billing, Documents, Notes, Activity
- **Overview**: Personal info card + Medical summary card (left), Quick stats + Insurance card (right)
- **Appointments**: Filter buttons + appointment table from `appointments`, summary stats row
- **Billing**: Summary cards (Total/Paid/Outstanding from `payments`), payments table
- **Documents**: 3 category cards (Prescriptions/Test Results/Other) — placeholder
- **Notes**: Textarea + empty state — placeholder
- **Activity**: Timeline derived from appointments, sorted desc, limit 20

### Technical notes
- All icons already imported (Eye, FileText, MessageCircle, CreditCard, Calendar, ArrowLeft, Phone, Clock, Filter)
- All t() keys preserved, guard() and allowModals maintained
- Date parsing wrapped in try/catch
- Uses existing sectionShellClass, sectionMainGridClass, sectionInsightGridClass
- Avatar colors cycled from palette array by index
- No new files, packages, or imports needed

