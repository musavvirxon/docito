import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import RolePanel, { type RolePanelContent } from "./RolePanel";
import Reveal from "./Reveal";

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
      whatYouDo: t("howItWorks.rolePanel.whatYouDoTitle", "What you do in Docito"),
      automates: t("howItWorks.rolePanel.automatesTitle", "What Docito automates"),
      features: t("howItWorks.rolePanel.featuresTitle", "Key features"),
      dashboard: t("howItWorks.rolePanel.dashboardPreviewTitle", "Dashboard preview"),
      trust: t("howItWorks.rolePanel.trustTitle", "Trust & permissions"),
    };
  }, [t]);

  const content: Record<RoleKey, RolePanelContent> = useMemo(() => {
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

    const getRole = (rk: RoleKey): RolePanelContent => {
      const base = `howItWorks.roleContent.${roleKeys[rk]}`;

      const whatYouDoRaw = t(`${base}.whatYouDo`, { returnObjects: true }) as unknown;
      const automatesRaw = t(`${base}.automates`, { returnObjects: true }) as unknown;
      const featuresRaw = t(`${base}.features`, { returnObjects: true }) as unknown;
      const trustRaw = t(`${base}.trust`, { defaultValue: "" }) as unknown;

      const fallback = {
        whatYouDo: [] as string[],
        automates: [] as string[],
        features: [] as { title: string; desc: string }[],
        trust: typeof trustRaw === "string" ? trustRaw : "",
      };

      return {
        whatYouDo: isStringArray(whatYouDoRaw) ? whatYouDoRaw : fallback.whatYouDo,
        automates: isStringArray(automatesRaw) ? automatesRaw : fallback.automates,
        features: isFeaturesArray(featuresRaw) ? featuresRaw : fallback.features,
        trust: typeof trustRaw === "string" ? trustRaw : fallback.trust,
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
    <section className="py-16" id="roles">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
            {t("howItWorks.hero.ctaSecondary", "Explore by role")}
          </h2>
        </Reveal>

        <Tabs value={active} onValueChange={(v) => setActive(v as RoleKey)} className="mt-6">
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
            <TabsContent key={rk} value={rk} className="mt-0">
              <RolePanel
                title={labels[rk]}
                content={content[rk]}
                whatYouDoTitle={sectionTitles.whatYouDo}
                automatesTitle={sectionTitles.automates}
                featuresTitle={sectionTitles.features}
                dashboardPreviewTitle={sectionTitles.dashboard}
                trustTitle={sectionTitles.trust}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
