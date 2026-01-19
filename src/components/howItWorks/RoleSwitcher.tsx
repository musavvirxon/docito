// File: src/components/howItWorks/RoleSwitcher.tsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import RolePanel, { type RolePanelData } from "./RolePanel";
import { Layers, ShieldCheck, LayoutDashboard } from "lucide-react";

type RoleKey =
  | "care-seeker"
  | "doctor"
  | "practice"
  | "clinic-staff"
  | "lab"
  | "lab-staff"
  | "imaging"
  | "imaging-staff"
  | "pharmacy"
  | "pharmacy-staff";

const roleOrder: RoleKey[] = [
  "care-seeker",
  "doctor",
  "practice",
  "clinic-staff",
  "lab",
  "lab-staff",
  "imaging",
  "imaging-staff",
  "pharmacy",
  "pharmacy-staff",
];

function normalizeHash(h: string): RoleKey | null {
  const raw = (h || "").replace(/^#/, "").trim().toLowerCase();
  if (!raw) return null;

  const mapping: Record<string, RoleKey> = {
    "care-seeker": "care-seeker",
    careseeker: "care-seeker",
    patient: "care-seeker",
    "care_seeker": "care-seeker",

    doctor: "doctor",

    practice: "practice",
    clinic: "practice",

    "clinic-staff": "clinic-staff",
    clinicstaff: "clinic-staff",
    staff: "clinic-staff",

    lab: "lab",
    "lab-staff": "lab-staff",
    labstaff: "lab-staff",

    imaging: "imaging",
    "imaging-staff": "imaging-staff",
    imagingstaff: "imaging-staff",

    pharmacy: "pharmacy",
    "pharmacy-staff": "pharmacy-staff",
    pharmacystaff: "pharmacy-staff",
  };

  return mapping[raw] || null;
}

function setHash(role: RoleKey) {
  const next = `#${role}`;
  if (typeof window === "undefined") return;
  if (window.location.hash === next) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isFeaturesArray(v: unknown): v is { title: string; desc: string }[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x &&
        typeof x === "object" &&
        typeof (x as any).title === "string" &&
        typeof (x as any).desc === "string"
    )
  );
}

const FALLBACK: Record<RoleKey, RolePanelData> = {
  "care-seeker": {
    whatYouDo: [
      "Search verified doctors, clinics, labs, imaging centers, and pharmacies.",
      "Compare availability, services, pricing, and facility capabilities.",
      "Book appointments and track status from one dashboard.",
      "Receive results, prescriptions, and follow-ups with clear next steps.",
    ],
    automates: [
      "Appointment confirmations, reminders, and rescheduling.",
      "Unified inbox for care updates and documents.",
      "Results delivery routing (you + your care team).",
      "Follow-up suggestions and completion tracking.",
    ],
    features: [
      { title: "Unified care timeline", desc: "Appointments, orders, results, and prescriptions in one view." },
      { title: "Verified network", desc: "Providers and facilities with verification signals and audit trails." },
      { title: "Secure sharing", desc: "Control who can see your records and when." },
      { title: "Fast booking", desc: "Availability-first search and streamlined booking flow." },
    ],
    dashboard: {
      title: "Patient Dashboard",
      rows: [
        { k: "Upcoming", v: "Appointments", tag: "Live" },
        { k: "Results", v: "Delivered", tag: "Secure" },
        { k: "Prescriptions", v: "Ready", tag: "Tracked" },
        { k: "Follow-ups", v: "Suggested" },
      ],
    },
    trust:
      "Your data is permissioned by role. Only the teams involved in your care can access relevant information, with audit trails and scoped sharing.",
  },

  doctor: {
    whatYouDo: [
      "Review scheduled patients and clinical context in one place.",
      "Document visits using templates and structured notes.",
      "Order labs/imaging and coordinate referrals from the visit.",
      "Send prescriptions and follow-ups to the patient securely.",
    ],
    automates: [
      "Smart scheduling + reminders to reduce no-shows.",
      "Visit templates and documentation workflows.",
      "Orders routing to lab/imaging and results return.",
      "Follow-up tasks and patient messaging triggers.",
    ],
    features: [
      { title: "Structured documentation", desc: "Diagnosis → treatment → prescriptions → files → notes." },
      { title: "Orders & referrals", desc: "Labs, imaging, and referrals connected directly to scheduling." },
      { title: "Clinical inbox", desc: "Results, messages, and tasks organized by priority." },
      { title: "Audit-ready actions", desc: "Every action logged with role context for accountability." },
    ],
    dashboard: {
      title: "Doctor Dashboard",
      rows: [
        { k: "Today", v: "Schedule", tag: "Auto" },
        { k: "Queue", v: "Patients", tag: "Live" },
        { k: "Results", v: "Incoming", tag: "Secure" },
        { k: "Tasks", v: "Follow-ups" },
      ],
    },
    trust:
      "Doctor access is scoped to your assigned patients, appointments, and orders. Staff access is separated by permissions and fully auditable.",
  },

  practice: {
    whatYouDo: [
      "Manage services, pricing, availability, and staff roles.",
      "Oversee patient volume, operations, and service performance.",
      "Coordinate with labs, imaging, and pharmacies in-network.",
      "Monitor verification and compliance posture for your facility.",
    ],
    automates: [
      "Operational queues across departments and roles.",
      "Automated reminders, check-in flows, and triage routing.",
      "Standardized documentation templates for consistency.",
      "Secure results and fulfillment delivery tracking.",
    ],
    features: [
      { title: "Role dashboards", desc: "Doctors, staff, lab, imaging, pharmacy — each sees what they need." },
      { title: "Operational visibility", desc: "Queues, statuses, and workload balancing in real time." },
      { title: "Configurable services", desc: "Service catalog + pricing + availability controls." },
      { title: "Verification signals", desc: "Provider/facility verification surfaced across the platform." },
    ],
    dashboard: {
      title: "Practice Console",
      rows: [
        { k: "Operations", v: "Queues", tag: "Live" },
        { k: "Scheduling", v: "Capacity", tag: "Smart" },
        { k: "Staff", v: "Permissions", tag: "RBAC" },
        { k: "Quality", v: "Audit Logs" },
      ],
    },
    trust:
      "Practices control access through roles and permissions. Every sensitive action is recorded with audit trails for governance.",
  },

  "clinic-staff": {
    whatYouDo: [
      "Handle check-in, queue status, and patient flow.",
      "Prepare visit context and coordinate documents.",
      "Route orders to lab/imaging and track completion.",
      "Support follow-up scheduling and patient communications.",
    ],
    automates: [
      "Check-in workflows and queue management.",
      "Task assignment and status updates by role.",
      "Result routing and delivery notifications.",
      "Follow-up reminders and completion tracking.",
    ],
    features: [
      { title: "Work queues", desc: "Clear tasks, statuses, and ownership across the day." },
      { title: "Front-desk tools", desc: "Check-in, identity confirmation, and flow control." },
      { title: "Coordination", desc: "Route orders and follow-ups without manual chasing." },
      { title: "Permissions", desc: "Staff sees only what’s needed for assigned tasks." },
    ],
    dashboard: {
      title: "Staff Dashboard",
      rows: [
        { k: "Check-in", v: "Ready", tag: "Fast" },
        { k: "Queue", v: "Live", tag: "Ops" },
        { k: "Orders", v: "Routed", tag: "Auto" },
        { k: "Follow-ups", v: "Scheduled" },
      ],
    },
    trust:
      "Staff access is constrained by role and task assignment. Sensitive clinical details remain restricted unless explicitly permitted.",
  },

  lab: {
    whatYouDo: [
      "Receive lab orders from clinics and doctors.",
      "Manage sample intake and processing stages.",
      "Deliver results back to the originating care team.",
      "Track turnaround time and completion status.",
    ],
    automates: [
      "Order intake routing with required metadata.",
      "Status updates across processing stages.",
      "Results delivery with secure access controls.",
      "Audit logs for every result change and delivery.",
    ],
    features: [
      { title: "Order intake", desc: "Structured orders with required fields and attachments." },
      { title: "Processing pipeline", desc: "Stage-based workflow: received → in progress → complete." },
      { title: "Results delivery", desc: "Delivered to the right role automatically." },
      { title: "Turnaround insights", desc: "Track volume and turnaround by service." },
    ],
    dashboard: {
      title: "Lab Dashboard",
      rows: [
        { k: "Incoming", v: "Orders", tag: "Auto" },
        { k: "Pipeline", v: "Stages", tag: "Live" },
        { k: "Results", v: "Deliver", tag: "Secure" },
        { k: "TAT", v: "Tracking" },
      ],
    },
    trust:
      "Lab users access only assigned orders and result workflows. Delivery is permissioned and logged for traceability.",
  },

  "lab-staff": {
    whatYouDo: [
      "Process assigned lab orders and update stages.",
      "Attach result files and structured findings.",
      "Coordinate exceptions and recollection if needed.",
      "Confirm delivery back to the requesting team.",
    ],
    automates: [
      "Assignment and workload balancing.",
      "Stage transitions with notifications.",
      "Secure results attachment and access control.",
      "Audit trail for edits and approvals.",
    ],
    features: [
      { title: "Assigned queue", desc: "Only your tasks, prioritized and clearly scoped." },
      { title: "Structured results", desc: "Attach files and enter findings consistently." },
      { title: "Exception handling", desc: "Recollection and flags built into the workflow." },
      { title: "Delivery confirmation", desc: "Know when results reach the right roles." },
    ],
    dashboard: {
      title: "Lab Staff",
      rows: [
        { k: "My Queue", v: "Assigned", tag: "RBAC" },
        { k: "Stages", v: "Update", tag: "Live" },
        { k: "Results", v: "Attach", tag: "Secure" },
        { k: "Delivery", v: "Confirmed" },
      ],
    },
    trust:
      "Lab staff permissions are scoped to assigned orders and workflow steps. Result edits and deliveries are fully auditable.",
  },

  imaging: {
    whatYouDo: [
      "Receive imaging orders and schedule slots.",
      "Coordinate preparation, scanning, and reporting.",
      "Deliver results to the ordering clinician and patient (as allowed).",
      "Track completion and turnaround time.",
    ],
    automates: [
      "Order intake and scheduling coordination.",
      "Status updates for scanning and reporting.",
      "Secure results delivery with audit trails.",
      "Notifications for follow-up recommendations.",
    ],
    features: [
      { title: "Order + schedule", desc: "Orders connect to availability and slots." },
      { title: "Status timeline", desc: "Received → scheduled → scanned → reported." },
      { title: "Secure delivery", desc: "Results delivered to the right people automatically." },
      { title: "Follow-up routing", desc: "Flags and next steps routed to care team." },
    ],
    dashboard: {
      title: "Imaging Center",
      rows: [
        { k: "Incoming", v: "Orders", tag: "Auto" },
        { k: "Schedule", v: "Slots", tag: "Smart" },
        { k: "Reporting", v: "Queue", tag: "Live" },
        { k: "Results", v: "Deliver", tag: "Secure" },
      ],
    },
    trust:
      "Imaging access is restricted to assigned orders and reporting workflows. Result visibility is controlled by role and consent, with full audit logs.",
  },

  "imaging-staff": {
    whatYouDo: [
      "Work assigned imaging tasks and update status.",
      "Prepare and execute scans, then hand off for reporting.",
      "Attach files and structured notes where appropriate.",
      "Confirm completion and delivery.",
    ],
    automates: [
      "Task assignment and checklist workflows.",
      "Status changes and queue movement.",
      "Secure file handling and role-based visibility.",
      "Delivery confirmations and audit history.",
    ],
    features: [
      { title: "Assigned tasks", desc: "Only what you need to do, clearly scoped." },
      { title: "Checklist flows", desc: "Prep → scan → handoff → complete." },
      { title: "Secure files", desc: "Encrypted storage and scoped access." },
      { title: "Operational clarity", desc: "Queue + ownership + timestamps." },
    ],
    dashboard: {
      title: "Imaging Staff",
      rows: [
        { k: "My Queue", v: "Assigned", tag: "RBAC" },
        { k: "Prep", v: "Checklist" },
        { k: "Scan", v: "Status", tag: "Live" },
        { k: "Handoff", v: "Reporting" },
      ],
    },
    trust:
      "Imaging staff access is task-scoped. Sensitive patient details remain restricted unless required, and all actions are logged.",
  },

  pharmacy: {
    whatYouDo: [
      "Receive prescriptions from clinics and doctors.",
      "Confirm stock, preparation, and pickup/delivery options.",
      "Update fulfillment stages and confirmations.",
      "Coordinate substitutions and clarifications securely.",
    ],
    automates: [
      "Prescription intake and validation routing.",
      "Fulfillment workflow tracking (prepare → ready → dispensed → confirmed).",
      "Patient notifications and confirmations.",
      "Audit logs for changes and approvals.",
    ],
    features: [
      { title: "Fulfillment workflow", desc: "Track each prescription through stages clearly." },
      { title: "Clarifications", desc: "Secure messaging with the care team when needed." },
      { title: "Inventory signals", desc: "Basic readiness signals for smoother fulfillment." },
      { title: "Confirmation", desc: "Dispense + confirm with role-based visibility." },
    ],
    dashboard: {
      title: "Pharmacy Console",
      rows: [
        { k: "Incoming", v: "Rx", tag: "Auto" },
        { k: "Prepare", v: "Queue", tag: "Live" },
        { k: "Ready", v: "Pickup/Delivery" },
        { k: "Confirmed", v: "Dispensed", tag: "Audit" },
      ],
    },
    trust:
      "Pharmacy access is restricted to prescription workflows and required patient identifiers. Every change is tracked with audit trails.",
  },

  "pharmacy-staff": {
    whatYouDo: [
      "Process assigned prescriptions and update stages.",
      "Prepare and mark ready for pickup/delivery.",
      "Record dispense confirmations with timestamps.",
      "Escalate issues for pharmacist review when needed.",
    ],
    automates: [
      "Assignment and prioritization of Rx tasks.",
      "Stage changes with notifications.",
      "Confirmation workflow with audit logging.",
      "Secure messaging for clarifications.",
    ],
    features: [
      { title: "My queue", desc: "Assigned prescriptions with clear status and priority." },
      { title: "Stage controls", desc: "Prepare → ready → dispensed → confirmed." },
      { title: "Audit-ready", desc: "Timestamps and responsibility tracking." },
      { title: "Escalations", desc: "Route exceptions to pharmacist review fast." },
    ],
    dashboard: {
      title: "Pharmacy Staff",
      rows: [
        { k: "My Queue", v: "Assigned", tag: "RBAC" },
        { k: "Stages", v: "Update", tag: "Live" },
        { k: "Ready", v: "Notify" },
        { k: "Confirm", v: "Dispensed", tag: "Audit" },
      ],
    },
    trust:
      "Pharmacy staff permissions are scoped to assigned prescriptions and actions. Confirmations and edits are logged for compliance and accountability.",
  },
};

export default function RoleSwitcher() {
  const { t } = useTranslation(["howItWorks"]);
  const [active, setActive] = useState<RoleKey>("care-seeker");

  useEffect(() => {
    const initial = normalizeHash(window.location.hash);
    if (initial) setActive(initial);
  }, []);

  useEffect(() => {
    setHash(active);
  }, [active]);

  const labels = useMemo(() => {
    return {
      "care-seeker": t("howItWorks.roles.careSeeker", "Care Seeker"),
      doctor: t("howItWorks.roles.doctor", "Doctor"),
      practice: t("howItWorks.roles.practice", "Practice"),
      "clinic-staff": t("howItWorks.roles.clinicStaff", "Clinic Staff"),
      lab: t("howItWorks.roles.lab", "Lab"),
      "lab-staff": t("howItWorks.roles.labStaff", "Lab Staff"),
      imaging: t("howItWorks.roles.imaging", "Imaging"),
      "imaging-staff": t("howItWorks.roles.imagingStaff", "Imaging Staff"),
      pharmacy: t("howItWorks.roles.pharmacy", "Pharmacy"),
      "pharmacy-staff": t("howItWorks.roles.pharmacyStaff", "Pharmacy Staff"),
    } as Record<RoleKey, string>;
  }, [t]);

  const sectionTitles = useMemo(() => {
    return {
      whatYouDoTitle: t("howItWorks.rolePanel.whatYouDoTitle", "What you do in Docito"),
      automatesTitle: t("howItWorks.rolePanel.automatesTitle", "What Docito automates"),
      featuresTitle: t("howItWorks.rolePanel.featuresTitle", "Key features"),
      dashboardPreviewTitle: t("howItWorks.rolePanel.dashboardPreviewTitle", "Dashboard preview"),
      trustTitle: t("howItWorks.rolePanel.trustTitle", "Trust & permissions"),
    };
  }, [t]);

  const content: Record<RoleKey, RolePanelData> = useMemo(() => {
    const roleKeys: Record<RoleKey, string> = {
      "care-seeker": "careSeeker",
      doctor: "doctor",
      practice: "practice",
      "clinic-staff": "clinicStaff",
      lab: "lab",
      "lab-staff": "labStaff",
      imaging: "imaging",
      "imaging-staff": "imagingStaff",
      pharmacy: "pharmacy",
      "pharmacy-staff": "pharmacyStaff",
    };

    const getRole = (rk: RoleKey): RolePanelData => {
      const base = `howItWorks.roleContent.${roleKeys[rk]}`;

      const whatYouDoRaw = t(`${base}.whatYouDo`, { returnObjects: true }) as unknown;
      const automatesRaw = t(`${base}.automates`, { returnObjects: true }) as unknown;
      const featuresRaw = t(`${base}.features`, { returnObjects: true }) as unknown;
      const trustRaw = t(`${base}.trust`, { defaultValue: "" }) as unknown;

      const fb = FALLBACK[rk];

      return {
        whatYouDo: isStringArray(whatYouDoRaw) ? whatYouDoRaw : fb.whatYouDo,
        automates: isStringArray(automatesRaw) ? automatesRaw : fb.automates,
        features: isFeaturesArray(featuresRaw) ? featuresRaw : fb.features,
        trust: typeof trustRaw === "string" && trustRaw.trim().length ? trustRaw : fb.trust,
        dashboard: fb.dashboard,
      };
    };

    return {
      "care-seeker": getRole("care-seeker"),
      doctor: getRole("doctor"),
      practice: getRole("practice"),
      "clinic-staff": getRole("clinic-staff"),
      lab: getRole("lab"),
      "lab-staff": getRole("lab-staff"),
      imaging: getRole("imaging"),
      "imaging-staff": getRole("imaging-staff"),
      pharmacy: getRole("pharmacy"),
      "pharmacy-staff": getRole("pharmacy-staff"),
    };
  }, [t]);

  return (
    <section className="py-24 scroll-mt-24" id="roles">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground">
              {t("howItWorks.hero.ctaSecondary", "Explore by role")}
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              {t(
                "howItWorks.rolesIntro.subtitle",
                "Docito is one platform with role-based dashboards — patients, doctors, and operational teams all work in a single connected workflow. Each role sees only what they need, with permissions and audit trails built in."
              )}
            </p>

            <div className="mt-2 grid gap-4 md:grid-cols-3">
              <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">
                    {t("howItWorks.rolesIntro.cards.platform.title", "One platform")}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "howItWorks.rolesIntro.cards.platform.desc",
                    "Scheduling, queues, documentation, results, and fulfillment — unified end-to-end."
                  )}
                </p>
              </Card>

              <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">
                    {t("howItWorks.rolesIntro.cards.dashboards.title", "Role dashboards")}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "howItWorks.rolesIntro.cards.dashboards.desc",
                    "Each role gets the right tools: patient timeline, clinical workflows, and staff ops queues."
                  )}
                </p>
              </Card>

              <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">
                    {t("howItWorks.rolesIntro.cards.trust.title", "Trust by design")}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "howItWorks.rolesIntro.cards.trust.desc",
                    "RBAC, scoped sharing, verification signals, and audit logs across every action."
                  )}
                </p>
              </Card>
            </div>
          </div>
        </Reveal>

        <Tabs value={active} onValueChange={(v) => setActive(v as RoleKey)} className="mt-10">
          <TabsList className="w-full flex flex-wrap justify-start gap-2 h-auto bg-transparent p-0">
            {roleOrder.map((rk) => (
              <TabsTrigger
                key={rk}
                value={rk}
                className="rounded-full border border-border/50 bg-background/40 backdrop-blur px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary/40"
              >
                {labels[rk]}
              </TabsTrigger>
            ))}
          </TabsList>

          {roleOrder.map((rk) => (
            <TabsContent key={rk} value={rk} className="mt-8">
              <div id={rk} className="scroll-mt-24" />
              <RolePanel roleKey={labels[rk]} labels={sectionTitles} data={content[rk]} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
