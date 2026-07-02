## Goal
Every visible string in the Appointment Session page and the Appointment Preview popup goes through `useTranslation`, with matching English, Russian, and Uzbek translations. No raw `doctor.session.finish` keys, no hardcoded English left.

## Scope
Only these two surfaces (plus their inline children):

1. `src/pages/AppointmentSession.tsx` — header actions, tab labels, in‑person / video banners, Quick Actions, Clinical Findings form, Session Notes, empty states, toasts, PDF buttons ("043/y RU", "043/u UZ"), Finish Appointment button, Reviews tab.
2. `src/components/doctor/calendar/AppointmentQuickPreview.tsx` — remaining hardcoded fragments (dialog is mostly wired but a few keys like `appointmentPreview.diagnoses`, `loading`, etc. and the status badge text `appointment.status` are not localized).
3. Patient sidebar inside session (`PatientProfileView` tabs: Overview / Medical History / Appointments, "Recent appointments", "View all", status chips like `confirmed` / `completed`, "Direct patient" label) — only the parts rendered inside the session split view.

Out of scope: Finance panel, Procedures panel, Treatment Plan panel, Rx / Prescription panel, Dental chart — those are separate components already covered by their own i18n namespaces.

## Approach

### 1. Namespace + keys
Use the existing `dashboard` namespace (already loaded by the page) and add a single new subtree so keys stay together and easy to audit:

```
dashboard.json
└── doctor.session
    ├── header: { finish, finishing, downloadRuPdf, downloadUzPdf, back, close }
    ├── tabs: { session, diagnoses, dental, treatmentPlan, rx, notes, reviews }
    ├── visit: { inPerson, video, homeVisit, roomChair, checkIn, notCheckedIn, checkedInAt, markCheckedIn }
    ├── quickActions: { title, bookFollowUp, prescription, referral, labOrder }
    ├── findings: { title, save, saving, complaint, complaintPh, extraOral, extraOralPh,
    │              oralCavity, oralCavityPh, labXray, labXrayPh, diagnosisFree,
    │              diagnosisFreePh, mergeHint }
    ├── notes: { title, save, saving, placeholder }
    ├── reviews: { title, empty }
    ├── status: { scheduled, confirmed, in_progress, completed, cancelled, no_show, pending }
    ├── patientSidebar: { title, directPatient, overview, medicalHistory, appointments,
    │                    recent, viewAll, noAppointments }
    └── toasts: { finished, finishError, notesSaved, notesSaveError,
                  findingsSaved, findingsSaveError, ...existing keys kept }
```

Existing `doctor.session.*` keys already used in the file (`ended`, `endError`, `loading`, `loadError`, `notFoundTitle`, etc.) stay as-is; only missing ones get added.

For `AppointmentQuickPreview` I extend the existing `appointmentPreview` block with `statusBadge.*` (confirmed / pending / …) and any remaining raw strings, so nothing prints a raw key.

### 2. Component edits
- Replace every hardcoded string, `title=`, `placeholder=`, `aria-label=`, and toast literal in the two files with `t('doctor.session.<path>')` / `t('appointmentPreview.<path>')`.
- The status pill (`{appointment.status}`) becomes `t(\`appointmentPreview.statusBadge.${status}\`)`.
- The "043/y RU" / "043/u UZ" buttons: keep the code label ("043/y", "043/u") as literal identifiers of the Uzbek official form codes, wrap only the language suffix and tooltip in `t()` — those form codes are legal identifiers, not translatable copy.
- Patient sidebar tabs and "Recent appointments" strings inside the session view move to `doctor.session.patientSidebar.*`.

### 3. Translations (en / ru / uz)
Add the full block to all three locale files. Other 8 locales get the English strings mirrored as fallback so nothing regresses; a follow-up turn can localize them.

### 4. Verification
- After edit, `rg` for suspicious raw strings in the two files: `rg -n '>[A-Z][A-Za-z ]{2,}<' src/pages/AppointmentSession.tsx src/components/doctor/calendar/AppointmentQuickPreview.tsx` should return only dynamic data (patient names, times).
- Reload `/appointment-session/...?tab=session` in en, ru, uz — no raw keys, no English leaking into ru/uz.

## Technical notes
- No refactor of component structure or logic — pure i18n substitution.
- No changes to the Finance / Procedures / Treatment Plan / Rx / Dental sub-panels.
- No backend / edge-function text is touched (nothing user-visible in this view originates from a Deno function response body).
