// File: src/components/howItWorks/RoleSwitcher.tsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RolePanel, { type RolePanelData } from "./RolePanel";
import FadeIn from "./FadeIn";

type RoleDef = {
  id: string;
  labelKey: string;
  labelFallback: string;
  panel: RolePanelData;
};

const ROLE_ORDER: Array<{ id: string; labelKey: string; labelFallback: string }> = [
  { id: "care-seeker", labelKey: "howItWorks.roles.careSeeker", labelFallback: "Care Seeker" },
  { id: "doctor", labelKey: "howItWorks.roles.doctor", labelFallback: "Doctor" },
  { id: "practice", labelKey: "howItWorks.roles.practice", labelFallback: "Practice" },
  { id: "clinic-staff", labelKey: "howItWorks.roles.clinicStaff", labelFallback: "Clinic Staff" },
  { id: "lab", labelKey: "howItWorks.roles.lab", labelFallback: "Lab" },
  { id: "lab-staff", labelKey: "howItWorks.roles.labStaff", labelFallback: "Lab Staff" },
  { id: "imaging", labelKey: "howItWorks.roles.imaging", labelFallback: "Imaging" },
  { id: "imaging-staff", labelKey: "howItWorks.roles.imagingStaff", labelFallback: "Imaging Staff" },
  { id: "pharmacy", labelKey: "howItWorks.roles.pharmacy", labelFallback: "Pharmacy" },
  { id: "pharmacy-staff", labelKey: "howItWorks.roles.pharmacyStaff", labelFallback: "Pharmacy Staff" },
];

function safeHashToRoleId(hash: string) {
  const h = (hash || "").replace(/^#/, "").trim().toLowerCase();
  if (!h) return ROLE_ORDER[0].id;

  // Accept common variants like #labstaff, #lab-staff, #lab_staff
  const normalized = h.replace(/_/g, "-");
  const direct = ROLE_ORDER.find((r) => r.id === normalized)?.id;
  if (direct) return direct;

  const collapsed = normalized.replace(/-/g, "");
  const byCollapsed = ROLE_ORDER.find((r) => r.id.replace(/-/g, "") === collapsed)?.id;
  return byCollapsed || ROLE_ORDER[0].id;
}

function setHash(roleId: string) {
  const url = new URL(window.location.href);
  url.hash = roleId;
  window.history.replaceState({}, "", url.toString());
}

export default function RoleSwitcher() {
  const { t } = useTranslation(["howItWorks"]);
  const roles = useMemo<RoleDef[]>(() => buildRoles(), []);
  const [active, setActive] = useState<string>(() => safeHashToRoleId(window.location.hash));

  useEffect(() => {
    const onHash = () => setActive(safeHashToRoleId(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    // Ensure URL hash matches current tab (without forcing scroll)
    setHash(active);
  }, [active]);

  return (
    <FadeIn rootMargin="120px">
      <div id="roles" className="scroll-mt-24 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
            {t("howItWorks.roles.title", "Explore by role")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
            {t(
              "howItWorks.roles.description",
              "Docito adapts the workflow to each role — with role-based dashboards, queues, and permissions."
            )}
          </p>
        </div>

        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="w-full h-auto flex flex-wrap gap-2 justify-start bg-transparent p-0">
            {ROLE_ORDER.map((r) => (
              <TabsTrigger
                key={r.id}
                value={r.id}
                className="rounded-full border border-border/50 bg-background/40 px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {t(r.labelKey, r.labelFallback)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {roles.map((r) => (
              <TabsContent key={r.id} value={r.id} className="m-0">
                <RolePanel data={r.panel} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </FadeIn>
  );
}

function buildRoles(): RoleDef[] {
  const base = (roleId: string, labelKey: string, labelFallback: string): RolePanelData => ({
    roleId,
    roleLabelKey: labelKey,
    roleLabelFallback: labelFallback,
    whatYouDo: [],
    automates: [],
    features: [],
    dashboard: {
      titleKey: `howItWorks.roleContent.${roleId}.dashboardTitle`,
      titleFallback: "Your dashboard",
      widgets: [
        { labelKey: `howItWorks.roleContent.${roleId}.widget1`, labelFallback: "Today" },
        { labelKey: `howItWorks.roleContent.${roleId}.widget2`, labelFallback: "Queue" },
        { labelKey: `howItWorks.roleContent.${roleId}.widget3`, labelFallback: "Messages" },
        { labelKey: `howItWorks.roleContent.${roleId}.widget4`, labelFallback: "Results" },
      ],
    },
    trust: [],
  });

  const make = (id: string, labelKey: string, labelFallback: string, patch: Partial<RolePanelData>) => {
    const b = base(id, labelKey, labelFallback);
    return { ...b, ...patch, dashboard: { ...b.dashboard, ...(patch.dashboard || {}) } };
  };

  return ROLE_ORDER.map((r) => {
    switch (r.id) {
      case "care-seeker":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.care-seeker.whatYouDo.1", fallback: "Search doctors, labs, imaging, and pharmacies by need, location, and availability." },
              { key: "howItWorks.roleContent.care-seeker.whatYouDo.2", fallback: "Compare verified profiles, services, prices, and timings." },
              { key: "howItWorks.roleContent.care-seeker.whatYouDo.3", fallback: "Book in a few taps and get reminders automatically." },
              { key: "howItWorks.roleContent.care-seeker.whatYouDo.4", fallback: "Track results, prescriptions, and follow-ups in one place." },
            ],
            automates: [
              { key: "howItWorks.roleContent.care-seeker.automates.1", fallback: "Smart intake, reminders, and secure delivery of documents." },
              { key: "howItWorks.roleContent.care-seeker.automates.2", fallback: "Care coordination when labs/imaging/pharmacy are involved." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.care-seeker.features.1.title",
                titleFallback: "Verified marketplace",
                descKey: "howItWorks.roleContent.care-seeker.features.1.desc",
                descFallback: "See verified providers and facilities with transparent details.",
              },
              {
                titleKey: "howItWorks.roleContent.care-seeker.features.2.title",
                titleFallback: "Instant booking",
                descKey: "howItWorks.roleContent.care-seeker.features.2.desc",
                descFallback: "Pick a time and confirm — with fewer calls and delays.",
              },
              {
                titleKey: "howItWorks.roleContent.care-seeker.features.3.title",
                titleFallback: "Unified timeline",
                descKey: "howItWorks.roleContent.care-seeker.features.3.desc",
                descFallback: "Appointments, results, prescriptions, and follow-ups together.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.care-seeker.trust.1", fallback: "Your data is shared only with the teams involved in your care." },
              { key: "howItWorks.roleContent.care-seeker.trust.2", fallback: "Audit trails help ensure accountable access." },
            ],
          }),
        };

      case "doctor":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.doctor.whatYouDo.1", fallback: "Receive bookings and manage schedule with precision." },
              { key: "howItWorks.roleContent.doctor.whatYouDo.2", fallback: "Document visits and coordinate diagnostics/referrals." },
              { key: "howItWorks.roleContent.doctor.whatYouDo.3", fallback: "Review results and share follow-up plans." },
            ],
            automates: [
              { key: "howItWorks.roleContent.doctor.automates.1", fallback: "Pre-visit intake, templates, and structured notes." },
              { key: "howItWorks.roleContent.doctor.automates.2", fallback: "Referrals that link directly into scheduling and queues." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.doctor.features.1.title",
                titleFallback: "Schedule controls",
                descKey: "howItWorks.roleContent.doctor.features.1.desc",
                descFallback: "Availability rules, buffers, and smart rescheduling.",
              },
              {
                titleKey: "howItWorks.roleContent.doctor.features.2.title",
                titleFallback: "Clinical workflow",
                descKey: "howItWorks.roleContent.doctor.features.2.desc",
                descFallback: "Diagnosis → treatment → prescriptions → files → notes.",
              },
              {
                titleKey: "howItWorks.roleContent.doctor.features.3.title",
                titleFallback: "Care coordination",
                descKey: "howItWorks.roleContent.doctor.features.3.desc",
                descFallback: "Send diagnostics and referrals with tracked completion.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.doctor.trust.1", fallback: "Role-based access keeps staff views separated from clinical privileges." },
              { key: "howItWorks.roleContent.doctor.trust.2", fallback: "Audit logs support compliance and internal review." },
            ],
          }),
        };

      case "practice":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.practice.whatYouDo.1", fallback: "Manage services, doctors, availability, and pricing." },
              { key: "howItWorks.roleContent.practice.whatYouDo.2", fallback: "Assign staff roles and run daily operations via queues." },
              { key: "howItWorks.roleContent.practice.whatYouDo.3", fallback: "Track performance with analytics and operational visibility." },
            ],
            automates: [
              { key: "howItWorks.roleContent.practice.automates.1", fallback: "Scheduling, reminders, check-in, and queue orchestration." },
              { key: "howItWorks.roleContent.practice.automates.2", fallback: "Standard operating workflows for referrals and diagnostics." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.practice.features.1.title",
                titleFallback: "Operational dashboards",
                descKey: "howItWorks.roleContent.practice.features.1.desc",
                descFallback: "See bookings, queues, throughput, and bottlenecks.",
              },
              {
                titleKey: "howItWorks.roleContent.practice.features.2.title",
                titleFallback: "Staff & permissions",
                descKey: "howItWorks.roleContent.practice.features.2.desc",
                descFallback: "Invite staff, assign roles, and control access.",
              },
              {
                titleKey: "howItWorks.roleContent.practice.features.3.title",
                titleFallback: "Service management",
                descKey: "howItWorks.roleContent.practice.features.3.desc",
                descFallback: "Keep offerings consistent across doctors and shifts.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.practice.trust.1", fallback: "RBAC ensures least-privilege access for each staff type." },
              { key: "howItWorks.roleContent.practice.trust.2", fallback: "Audit trails for operational events and access history." },
            ],
          }),
        };

      case "clinic-staff":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.clinic-staff.whatYouDo.1", fallback: "Handle check-ins, queues, and patient readiness." },
              { key: "howItWorks.roleContent.clinic-staff.whatYouDo.2", fallback: "Coordinate rooms, doctor availability, and rescheduling." },
              { key: "howItWorks.roleContent.clinic-staff.whatYouDo.3", fallback: "Send updates and manage operational tasks." },
            ],
            automates: [
              { key: "howItWorks.roleContent.clinic-staff.automates.1", fallback: "Queue routing, reminders, and staff task handoffs." },
              { key: "howItWorks.roleContent.clinic-staff.automates.2", fallback: "Status updates across the whole care chain." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.clinic-staff.features.1.title",
                titleFallback: "Smart check-in",
                descKey: "howItWorks.roleContent.clinic-staff.features.1.desc",
                descFallback: "Fast intake and queue entry with minimal friction.",
              },
              {
                titleKey: "howItWorks.roleContent.clinic-staff.features.2.title",
                titleFallback: "Queue management",
                descKey: "howItWorks.roleContent.clinic-staff.features.2.desc",
                descFallback: "Prioritize and route patients with clear status signals.",
              },
              {
                titleKey: "howItWorks.roleContent.clinic-staff.features.3.title",
                titleFallback: "Coordination tools",
                descKey: "howItWorks.roleContent.clinic-staff.features.3.desc",
                descFallback: "Messages and tasks aligned to the schedule.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.clinic-staff.trust.1", fallback: "Staff views are scoped to operational needs." },
              { key: "howItWorks.roleContent.clinic-staff.trust.2", fallback: "Sensitive clinical data remains permissioned." },
            ],
          }),
        };

      case "lab":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.lab.whatYouDo.1", fallback: "Publish services, availability, and verified facility profile." },
              { key: "howItWorks.roleContent.lab.whatYouDo.2", fallback: "Receive requests and manage capacity for collections/tests." },
            ],
            automates: [
              { key: "howItWorks.roleContent.lab.automates.1", fallback: "Order intake, queue creation, and results delivery." },
              { key: "howItWorks.roleContent.lab.automates.2", fallback: "Notifications to patient and ordering clinician." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.lab.features.1.title",
                titleFallback: "Service catalog",
                descKey: "howItWorks.roleContent.lab.features.1.desc",
                descFallback: "Keep tests, turnaround, and requirements clear.",
              },
              {
                titleKey: "howItWorks.roleContent.lab.features.2.title",
                titleFallback: "Capacity visibility",
                descKey: "howItWorks.roleContent.lab.features.2.desc",
                descFallback: "Manage workload with queues and scheduling.",
              },
              {
                titleKey: "howItWorks.roleContent.lab.features.3.title",
                titleFallback: "Secure results",
                descKey: "howItWorks.roleContent.lab.features.3.desc",
                descFallback: "Deliver results with audit-ready access controls.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.lab.trust.1", fallback: "Verified facilities build trust across the ecosystem." },
              { key: "howItWorks.roleContent.lab.trust.2", fallback: "Results access is logged and permissioned." },
            ],
          }),
        };

      case "lab-staff":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.lab-staff.whatYouDo.1", fallback: "Work assigned queues: collection, processing, review." },
              { key: "howItWorks.roleContent.lab-staff.whatYouDo.2", fallback: "Mark statuses and publish results through governed steps." },
            ],
            automates: [
              { key: "howItWorks.roleContent.lab-staff.automates.1", fallback: "Task routing and status updates across teams." },
              { key: "howItWorks.roleContent.lab-staff.automates.2", fallback: "Controlled result release and notifications." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.lab-staff.features.1.title",
                titleFallback: "Queues & tasks",
                descKey: "howItWorks.roleContent.lab-staff.features.1.desc",
                descFallback: "A clear list of what’s next, with priorities.",
              },
              {
                titleKey: "howItWorks.roleContent.lab-staff.features.2.title",
                titleFallback: "Status controls",
                descKey: "howItWorks.roleContent.lab-staff.features.2.desc",
                descFallback: "Move work forward with consistent states.",
              },
              {
                titleKey: "howItWorks.roleContent.lab-staff.features.3.title",
                titleFallback: "Audit-ready delivery",
                descKey: "howItWorks.roleContent.lab-staff.features.3.desc",
                descFallback: "Every access and update is traceable.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.lab-staff.trust.1", fallback: "Permissions align to staff responsibilities." },
              { key: "howItWorks.roleContent.lab-staff.trust.2", fallback: "Audit trails help reduce operational risk." },
            ],
          }),
        };

      case "imaging":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.imaging.whatYouDo.1", fallback: "Offer imaging services with verified facility listing." },
              { key: "howItWorks.roleContent.imaging.whatYouDo.2", fallback: "Receive orders and schedule studies with visibility." },
            ],
            automates: [
              { key: "howItWorks.roleContent.imaging.automates.1", fallback: "Order intake, scheduling, and results delivery workflows." },
              { key: "howItWorks.roleContent.imaging.automates.2", fallback: "Notifications for patient and referring team." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.imaging.features.1.title",
                titleFallback: "Scheduling",
                descKey: "howItWorks.roleContent.imaging.features.1.desc",
                descFallback: "Capacity-aware slots and controlled rescheduling.",
              },
              {
                titleKey: "howItWorks.roleContent.imaging.features.2.title",
                titleFallback: "Orders & prep",
                descKey: "howItWorks.roleContent.imaging.features.2.desc",
                descFallback: "Clear instructions, prep steps, and confirmations.",
              },
              {
                titleKey: "howItWorks.roleContent.imaging.features.3.title",
                titleFallback: "Secure delivery",
                descKey: "howItWorks.roleContent.imaging.features.3.desc",
                descFallback: "Deliver reports with governed access.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.imaging.trust.1", fallback: "Verification and access controls reduce errors." },
              { key: "howItWorks.roleContent.imaging.trust.2", fallback: "Audit logs for sensitive reports." },
            ],
          }),
        };

      case "imaging-staff":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.imaging-staff.whatYouDo.1", fallback: "Work assigned studies through queues and statuses." },
              { key: "howItWorks.roleContent.imaging-staff.whatYouDo.2", fallback: "Coordinate prep, completion, and report handoff." },
            ],
            automates: [
              { key: "howItWorks.roleContent.imaging-staff.automates.1", fallback: "Task assignment and status propagation." },
              { key: "howItWorks.roleContent.imaging-staff.automates.2", fallback: "Structured delivery steps and notifications." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.imaging-staff.features.1.title",
                titleFallback: "Queue view",
                descKey: "howItWorks.roleContent.imaging-staff.features.1.desc",
                descFallback: "See what’s next and what’s blocked.",
              },
              {
                titleKey: "howItWorks.roleContent.imaging-staff.features.2.title",
                titleFallback: "Status steps",
                descKey: "howItWorks.roleContent.imaging-staff.features.2.desc",
                descFallback: "Consistent workflow from prep to completion.",
              },
              {
                titleKey: "howItWorks.roleContent.imaging-staff.features.3.title",
                titleFallback: "Handoff controls",
                descKey: "howItWorks.roleContent.imaging-staff.features.3.desc",
                descFallback: "Reduce mistakes with controlled handoffs.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.imaging-staff.trust.1", fallback: "Least-privilege access across staff roles." },
              { key: "howItWorks.roleContent.imaging-staff.trust.2", fallback: "Audit trails for all report interactions." },
            ],
          }),
        };

      case "pharmacy":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.pharmacy.whatYouDo.1", fallback: "List services and manage fulfillment capacity." },
              { key: "howItWorks.roleContent.pharmacy.whatYouDo.2", fallback: "Receive prescriptions and confirm fulfillment." },
            ],
            automates: [
              { key: "howItWorks.roleContent.pharmacy.automates.1", fallback: "Prescription intake, status updates, and patient notifications." },
              { key: "howItWorks.roleContent.pharmacy.automates.2", fallback: "Secure communication with ordering clinicians." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.pharmacy.features.1.title",
                titleFallback: "Prescription workflow",
                descKey: "howItWorks.roleContent.pharmacy.features.1.desc",
                descFallback: "Track from received → prepared → fulfilled.",
              },
              {
                titleKey: "howItWorks.roleContent.pharmacy.features.2.title",
                titleFallback: "Inventory-aware ops",
                descKey: "howItWorks.roleContent.pharmacy.features.2.desc",
                descFallback: "Support availability decisions with visibility.",
              },
              {
                titleKey: "howItWorks.roleContent.pharmacy.features.3.title",
                titleFallback: "Secure status updates",
                descKey: "howItWorks.roleContent.pharmacy.features.3.desc",
                descFallback: "Keep patients informed with minimal calls.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.pharmacy.trust.1", fallback: "Access controls protect sensitive prescription data." },
              { key: "howItWorks.roleContent.pharmacy.trust.2", fallback: "Audit logs record fulfillment confirmations." },
            ],
          }),
        };

      case "pharmacy-staff":
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: make(r.id, r.labelKey, r.labelFallback, {
            whatYouDo: [
              { key: "howItWorks.roleContent.pharmacy-staff.whatYouDo.1", fallback: "Process queued prescriptions and confirm fulfillment." },
              { key: "howItWorks.roleContent.pharmacy-staff.whatYouDo.2", fallback: "Update statuses and communicate exceptions safely." },
            ],
            automates: [
              { key: "howItWorks.roleContent.pharmacy-staff.automates.1", fallback: "Queue routing, reminders, and status notifications." },
              { key: "howItWorks.roleContent.pharmacy-staff.automates.2", fallback: "Controlled release steps and tracking." },
            ],
            features: [
              {
                titleKey: "howItWorks.roleContent.pharmacy-staff.features.1.title",
                titleFallback: "Task queues",
                descKey: "howItWorks.roleContent.pharmacy-staff.features.1.desc",
                descFallback: "A clear operational list with statuses.",
              },
              {
                titleKey: "howItWorks.roleContent.pharmacy-staff.features.2.title",
                titleFallback: "Fulfillment confirmation",
                descKey: "howItWorks.roleContent.pharmacy-staff.features.2.desc",
                descFallback: "Fast confirmation with traceability.",
              },
              {
                titleKey: "howItWorks.roleContent.pharmacy-staff.features.3.title",
                titleFallback: "Exceptions handling",
                descKey: "howItWorks.roleContent.pharmacy-staff.features.3.desc",
                descFallback: "Escalate issues to the right team quickly.",
              },
            ],
            trust: [
              { key: "howItWorks.roleContent.pharmacy-staff.trust.1", fallback: "Permissions reflect operational scope." },
              { key: "howItWorks.roleContent.pharmacy-staff.trust.2", fallback: "Audit logs for every status change." },
            ],
          }),
        };

      default:
        return {
          id: r.id,
          labelKey: r.labelKey,
          labelFallback: r.labelFallback,
          panel: base(r.id, r.labelKey, r.labelFallback),
        };
    }
  });
}
