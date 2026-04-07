Docito is a connected care platform with two big halves:

Public marketplace (SEO + multilingual):
Patients can search and compare doctors and facilities by specialty, location, insurance, availability, ratings.
Public profile pages and landing pages exist for doctors, practices, labs, imaging, pharmacies.
Booking flow for appointments (including video appointments).
Authenticated operations suite (role-based dashboards):
Separate dashboards and tools for patients, doctors, staff/admins, and each facility type.
End-to-end operational workflows: scheduling → visit/session → orders/results → prescriptions/fulfillment → billing → follow-ups.
Core user types (roles) supported

From the RBAC + routing, the platform supports these primary roles:

Patient
Doctor
Practice / clinic admins & staff
Lab admins & staff
Imaging center admins & staff
Pharmacy admins & staff
Admin / Super Admin (platform operations)

Role switching is built-in (a user can have multiple roles), and dashboards route based on the active role.

Main product areas and workflows
1) Discovery marketplace (public)
Unified search across:
Doctors
Clinics/practices
Labs
Imaging centers
Pharmacies
Filtering by availability, location, specialty, insurance, rating, etc.
Public doctor profiles include education/languages/services, verification state, booking CTAs.
2) Scheduling + appointment lifecycle

Scheduling is a first-class system with:

Provider availability and schedule settings
Appointment slot generation and conflict checks
“Hold / reserve slot” logic to prevent double-booking
Appointment states like pending/confirmed/cancelled/completed
Rescheduling support
Automated reminders/notifications hooks

There are edge functions specifically for:

Getting availability
Booking an appointment
Confirming appointment requests / sessions
3) Visit / session workspace (clinical workflow)

Doctors have an “appointment session” experience that combines:

Patient profile view
Structured notes
Tabs for visit artifacts (medications, files, etc.)
Specialty tooling (notably dental charting is implemented, and there are orthopedic/anatomy components too)
Ability to launch/join video consultation
4) Telemedicine (video consults)

Video visits are supported with:

A waiting room + in-call UI
Mute/video toggles, screen share controls, participant count, notes
Implementation uses Jitsi Meet (embedded via meet.jit.si external API)
5) Messaging (secure chat style)

The platform includes:

Conversations, participants, messages
Attachments
Messaging permissions model
Notifications + “real-time notifications” support (DB + UI hooks)
6) Diagnostics and fulfillment network (labs + imaging + pharmacy)

This is a key “ecosystem” part of the platform:

Labs

Lab registration + verification
Lab dashboard for orders, test catalog, results, result files

Imaging

Imaging registration + verification
Imaging orders workflow
Imaging equipment/config sections
Imaging report generation (PDF generation exists server-side)

Pharmacies

Pharmacy registration + verification
Prescription creation/management
Inventory tracking and fulfillment flow concepts
7) Referrals network

Referrals are modeled as a core workflow:

Referral slots, referral appointments
Notifications + audit logs around referrals
Routing diagnostic work/orders to facilities, tracking status
8) Billing, payments, and subscriptions

The platform has a full billing layer including:

Checkout and billing portal flows
Invoices and transactions
Payment intents / holds
Subscription plans and subscription tracking
Webhooks and payment processing edge functions

This is implemented with Stripe integration (webhook + payment intent flows), and billing is scoped to entities (clinic/lab/imaging/pharmacy) as well as patient flows.

9) Verification system (trust & compliance layer)

Verification is not just a checkbox—it’s an engine:

Verification requests + verification documents
Rule sets by country (a “verification rules engine” migration exists)
Submission states like draft/submitted/under_review/approved/rejected
Separate flows for doctors and facility types
A super-admin verification queue + tooling (approve/reject with notes + notifications)
10) Analytics and admin tooling

There are dashboards and edge functions for:

Top-level platform KPIs (super admin)
Entity-level analytics (practice/lab/imaging/pharmacy)
Revenue / appointment trends
Operational insights and activity feeds
Admin bulk actions, staff management, audit logs
11) Content + Help Center + Legal CMS

The platform includes content management structures:

Help articles
Legal pages + cookie policy
About page content sections
Feedback center + inbox for super admins
Multilingual + SEO architecture

The app is built to be multilingual and SEO-friendly:

Language-prefixed public routes like /en/..., /ru/..., /uz/..., /ar/...
RTL layout support for Arabic
SEO head generation (titles/meta/hreflang/canonical patterns)
UI locale packs exist for 11 languages
Database-localized fields are explicitly present for at least English/Russian/Uzbek/Arabic (e.g., specialty_en, specialty_ru, specialty_uz, specialty_ar on doctors)

Dashboards generally avoid language prefixes and instead respect the user preference.

Data model (what’s stored)

From the generated Supabase types, the major “domain blocks” are:

Identity & roles: profiles, user_roles, user_settings, user_preferences, account_activity
Marketplace: doctors, practices, practice_locations, insurance tables, search history/saved searches
Scheduling: appointments, appointment_holds, appointment_sessions, availability overrides, blocked times, schedule settings
Clinical: medical_records, patient_notes, patient_files, consent forms, treatment_plans (+ procedures/visits/materials/templates)
Dental/ortho specialty: tooth_records, tooth_files, bones, patient bone annotations
Messaging: conversations, messages, message_attachments, messaging_permissions
Diagnostics: lab centers/staff, test catalog/orders/results/files; imaging centers/staff/orders/reports/files
Pharmacy: pharmacies, pharmacy staff, inventory, prescriptions + items
Referrals: referrals, referral slots, referral appointments, notifications/audit
Billing: invoices, payments, payment methods/intents/holds, transactions, subscriptions
Verification & trust: verification_requests, verification_documents + rule sets, audit logs, rate limits
Platform ops: webhook logs, translations tables, help/legal CMS content
Tech stack and architecture (as built in this repo)
Frontend
React + TypeScript (Vite)
Tailwind + Radix UI component primitives (shadcn-style structure)
TanStack Query for server state
i18next for localization
PDF/Export tooling (PDF + XLSX support present)
Backend
Supabase for:
Auth + sessions
Postgres database + RLS policies
Storage buckets (avatars, medical documents, verification docs, lab results, etc.)
Edge Functions (Deno + supabase-js v2) for critical workflows
Integrations
Twilio for SMS sending
Jitsi Meet for embedded video calls
The repository is structured as a Lovable project and deployable via GitHub workflow conventions (per repo README)
In one sentence

Docito is a multilingual, SEO-first healthcare marketplace and operations system that unifies discovery, booking, visit workflows, diagnostics (lab/imaging), prescriptions (pharmacy), referrals, payments/subscriptions, and verification—across multiple role-based dashboards.

