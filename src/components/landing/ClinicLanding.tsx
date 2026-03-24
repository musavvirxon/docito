// src/components/landing/ClinicLanding.tsx
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  BarChart3,
  Bell,
  Link2,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  BarChart2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react";
import QuizFunnel, {
  ResultSection,
  MetricRow,
  BulletList,
  type QuizQuestion,
  type ScoreLevel,
} from "./QuizFunnel";

// ─── Feature & problem data ───────────────────────────────────────────────────

const PROBLEMS = [
  "Departments using different systems, no shared visibility",
  "Patients falling through the cracks between appointments",
  "Revenue leakage from missed billing and no-shows",
  "Staff spending hours on manual coordination every day",
];

const FEATURES = [
  {
    icon: Building2,
    title: "Centralized operations",
    body: "Every department, every doctor, every patient — all visible from one dashboard.",
  },
  {
    icon: Bell,
    title: "No missed appointments or lost patients",
    body: "Automated reminders, waitlist management, and follow-up prompts keep patients on track.",
  },
  {
    icon: BarChart3,
    title: "Real-time visibility across your clinic",
    body: "Live dashboards showing occupancy, appointment status, staff load, and revenue.",
  },
  {
    icon: Users,
    title: "Your entire team, one system",
    body: "Doctors, admin, nurses, and billing all work in one platform. No more WhatsApp chains.",
  },
  {
    icon: Link2,
    title: "Connected referral and diagnostic flow",
    body: "Track every referral and lab result as part of the patient's journey.",
  },
  {
    icon: CreditCard,
    title: "Clear payments, no confusion",
    body: "Billing linked directly to services delivered. See revenue close faster in real time.",
  },
];

// ─── Clinic quiz — 10 questions ───────────────────────────────────────────────

const CLINIC_QUIZ: QuizQuestion[] = [
  {
    id: "appointments",
    question: "How are appointments managed in your clinic?",
    hint: "Core operational entry point",
    options: [
      "Manual / phone calls",
      "Basic system",
      "Multiple tools",
      "Fully integrated",
    ],
  },
  {
    id: "visibility",
    question: "Do you have real-time visibility into patient flow?",
    hint: "Operational control",
    options: ["No visibility", "Limited visibility", "Mostly visible", "Fully visible"],
  },
  {
    id: "dropoff",
    question: "How often do patients miss appointments or drop off?",
    hint: "Revenue and retention impact",
    options: ["Very often", "Sometimes", "Rarely", "Almost never"],
  },
  {
    id: "communication",
    question: "How do teams communicate internally?",
    hint: "Coordination efficiency",
    options: [
      "Calls / messaging apps",
      "Mixed tools",
      "Internal system",
      "Fully connected workflow",
    ],
  },
  {
    id: "referrals",
    question: "How are referrals (labs, imaging) tracked?",
    hint: "Critical workflow gap",
    options: ["Not tracked", "Manual tracking", "Partial tracking", "Fully tracked"],
  },
  {
    id: "systems",
    question: "How many systems does your clinic rely on?",
    hint: "Complexity level",
    options: ["5 or more", "3–5", "2", "Just 1"],
  },
  {
    id: "records",
    question: "Are patient records centralized?",
    hint: "Data consistency",
    options: ["No", "Partially", "Mostly", "Fully"],
  },
  {
    id: "revenue",
    question: "How do you track revenue and payments?",
    hint: "Financial visibility",
    options: [
      "Manual",
      "Basic system",
      "Partial integration",
      "Fully integrated",
    ],
  },
  {
    id: "staff_dependency",
    question: "How dependent is your clinic on staff coordination?",
    hint: "Scalability factor",
    options: [
      "Fully dependent on people",
      "Highly dependent",
      "Moderately dependent",
      "Mostly system-driven",
    ],
  },
  {
    id: "priority",
    question: "What is your biggest operational priority right now?",
    hint: "Personalization driver",
    options: [
      "Reduce admin workload",
      "Increase revenue",
      "Improve patient flow",
      "Scale operations",
    ],
  },
];

// ─── Dynamic results renderer ─────────────────────────────────────────────────

const VISIBILITY_MAP = ["Low", "Low", "Medium", "High"] as const;
const VISIBILITY_COLOR: ("red" | "amber" | "green")[] = [
  "red",
  "red",
  "amber",
  "green",
];

const FRAGMENTATION_MAP = ["High", "High", "Medium", "Low"] as const;
const FRAGMENTATION_COLOR: ("red" | "amber" | "green")[] = [
  "red",
  "red",
  "amber",
  "green",
];

const STAFF_DEPENDENCY_MAP = ["High", "High", "Medium", "Low"] as const;
const STAFF_DEPENDENCY_COLOR: ("red" | "amber" | "green")[] = [
  "red",
  "red",
  "amber",
  "green",
];

const LEVEL_SUMMARY: Record<ScoreLevel, string> = {
  low: "Operational Chaos — manual coordination, fragmented systems",
  medium: "Growing Structure — some systems in place, still highly manual",
  high: "Well-Structured — clear operations with integration gaps remaining",
};

const PRIORITY_BENEFIT: Record<number, string> = {
  0: "Eliminate manual admin and coordination overhead across every department",
  1: "Close revenue gaps by automating billing, follow-ups, and no-show recovery",
  2: "Give patients a seamless journey from booking to discharge with zero drop-offs",
  3: "Add capacity and departments without adding complexity or chaos",
};

function renderClinicResults(
  answers: number[],
  _score: number,
  level: ScoreLevel,
  _totalQ: number
): React.ReactNode {
  const opVisibility = VISIBILITY_MAP[answers[1] ?? 0];
  const visibilityColor = VISIBILITY_COLOR[answers[1] ?? 0];
  const fragmentation = FRAGMENTATION_MAP[answers[5] ?? 0];
  const fragmentationColor = FRAGMENTATION_COLOR[answers[5] ?? 0];
  const staffDep = STAFF_DEPENDENCY_MAP[answers[8] ?? 0];
  const staffDepColor = STAFF_DEPENDENCY_COLOR[answers[8] ?? 0];

  const issues: string[] = [];
  if (answers[4] < 2) issues.push("Referral and diagnostic tracking gaps");
  if (answers[3] < 2) issues.push("Fragmented team communication");
  if (answers[7] < 2) issues.push("Limited financial and revenue visibility");
  if (answers[6] < 2) issues.push("Decentralized or incomplete patient records");
  if (!issues.length) issues.push("Minor integration improvements available");

  const thisLeadsTo =
    level === "low"
      ? [
          "Missed appointments and patient drop-offs",
          "Inefficient staff workload and burnout",
          "Revenue leakage from untracked billing",
          "Limited ability to scale without adding chaos",
        ]
      : level === "medium"
      ? [
          "Occasional coordination failures between departments",
          "Manual effort that doesn't scale as you grow",
          "Partial revenue visibility leading to blind spots",
        ]
      : [
          "Minor inefficiencies in cross-department handoffs",
          "Visibility gaps that appear under high patient volume",
        ];

  const docitoBenefits = [
    "Unify all departments into one connected system",
    "Provide real-time visibility into patient flow and operations",
    ...(answers[8] > 1
      ? []
      : ["Reduce reliance on staff for day-to-day coordination"]),
    ...(answers[4] < 3
      ? ["Track every referral and diagnostic automatically"]
      : []),
    ...(answers[7] < 2
      ? ["Connect billing directly to clinical workflows"]
      : []),
  ];

  const improvements =
    level === "low"
      ? [
          "Reduce admin workload by 40–60%",
          "Improve patient retention through automated follow-ups",
          "Increase operational efficiency across every department",
          "Scale without increasing coordination complexity",
        ]
      : level === "medium"
      ? [
          "Eliminate manual coordination between departments",
          "Close revenue leakage with connected billing",
          "Give every staff member a single source of truth",
        ]
      : [
          "Complete the integration picture for full visibility",
          "Remove the last manual handoffs slowing your team down",
        ];

  return (
    <>
      {/* Section 1 — Summary */}
      <ResultSection
        icon={<BarChart2 className="w-4 h-4" />}
        title="Section 1 — Summary"
      >
        <p className="mb-3">
          Your clinic operations are:{" "}
          <span className="text-white font-semibold">
            {LEVEL_SUMMARY[level]}
          </span>
        </p>
        <div className="bg-white/[0.04] rounded-lg p-3 space-y-0 divide-y divide-white/[0.06]">
          <MetricRow
            label="Operational visibility"
            value={opVisibility}
            valueColor={visibilityColor}
          />
          <MetricRow
            label="System fragmentation"
            value={fragmentation}
            valueColor={fragmentationColor}
          />
          <MetricRow
            label="Staff dependency"
            value={staffDep}
            valueColor={staffDepColor}
          />
        </div>
      </ResultSection>

      {/* Section 2 — Key Issues */}
      <ResultSection
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Section 2 — Key Issues"
      >
        <p className="mb-3 text-slate-300 font-medium">
          1. Coordination Load
        </p>
        <p className="mb-4">
          Your clinic relies{" "}
          <span className="text-amber-400 font-semibold">
            {staffDep === "High" ? "heavily" : "significantly"}
          </span>{" "}
          on manual coordination between teams, which creates friction and
          limits scalability.
        </p>
        <p className="mb-2 text-slate-300 font-medium">
          2. Revenue Leakage Risk
        </p>
        <p className="mb-4">
          Missed appointments and untracked follow-ups may be impacting
          revenue. Financial visibility is currently{" "}
          <span className="text-amber-400 font-semibold">
            {VISIBILITY_MAP[answers[7] ?? 0] === "High" ? "adequate" : "limited"}
          </span>
          .
        </p>
        <p className="mb-2 text-slate-300 font-medium">3. Workflow Gaps</p>
        <BulletList items={issues} />
      </ResultSection>

      {/* Section 3 — What This Means */}
      <ResultSection
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Section 3 — What This Means"
      >
        <p className="mb-3">This setup can lead to:</p>
        <BulletList items={thisLeadsTo} />
      </ResultSection>

      {/* Section 4 — How Docito Fits */}
      <ResultSection
        icon={<Lightbulb className="w-4 h-4" />}
        title="Section 4 — How Docito Fits Your Clinic"
      >
        <p className="mb-3">Docito would:</p>
        <BulletList items={docitoBenefits} />
      </ResultSection>

      {/* Section 5 — Expected Improvements */}
      <ResultSection
        icon={<TrendingUp className="w-4 h-4" />}
        title="Section 5 — Expected Improvements"
      >
        <p className="mb-3">
          With a connected system, your clinic could:
        </p>
        <BulletList items={improvements} />
      </ResultSection>

      {/* Section 6 — Personalized */}
      <ResultSection
        icon={<Zap className="w-4 h-4" />}
        title="Section 6 — Your Priority: Personalized"
      >
        <p className="mb-3">
          You said your biggest priority is:{" "}
          <span className="text-white font-semibold">
            {CLINIC_QUIZ[9].options[answers[9] ?? 0]}
          </span>
        </p>
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-4 py-3">
          <p className="text-sky-300 leading-relaxed">
            {PRIORITY_BENEFIT[answers[9] ?? 0]}
          </p>
        </div>
      </ResultSection>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mb-2">
        <div className="flex items-center gap-2.5 mb-1">
          <Target className="w-4 h-4 text-sky-400" />
          <p className="text-white text-sm font-semibold">
            Run your clinic with full visibility and control.
          </p>
        </div>
        <p className="text-slate-500 text-xs ml-6.5">
          Start free · No credit card · Set up in minutes
        </p>
      </div>
    </>
  );
}

// ─── Animation helper ─────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

interface Props {
  onChangeRole: () => void;
}

export default function ClinicLanding({ onChangeRole }: Props) {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onChangeRole}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change</span>
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <img
              src="/logos/logo-full-light.png"
              alt="Docito"
              className="h-7 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="hidden sm:inline-block bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
              For Clinic Owners
            </span>
          </div>
          <a
            href="https://app.docito.app/signup"
            className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Start free
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#070F1E] pt-32 pb-24 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-800/25 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="inline-flex items-center gap-2 text-indigo-400 text-xs tracking-widest uppercase font-medium mb-6">
              <Building2 className="w-3.5 h-3.5" />
              For Clinic Owners
            </p>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl text-white font-semibold leading-tight tracking-tight mb-6"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Run your entire clinic
              <br />
              <span className="text-sky-400">without the chaos.</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10">
              Docito connects scheduling, patient records, diagnostics,
              prescriptions, referrals, and billing into one system — so you
              finally see and control your entire operation.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href="https://app.docito.app/signup"
              className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors group"
            >
              Start free
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="#quiz"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] text-white font-medium px-8 py-3.5 rounded-xl border border-white/10 transition-colors"
            >
              Map my clinic
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-slate-600 text-xs mt-5"
          >
            No credit card required · Upgrade only when you grow
          </motion.p>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-sky-500 text-xs tracking-widest uppercase font-medium mb-3">
              The problem
            </p>
            <h2
              className="text-3xl md:text-4xl text-slate-900 font-semibold leading-snug max-w-xl mx-auto"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Most clinics operate in{" "}
              <span className="text-slate-400">organized chaos.</span>
            </h2>
            <p className="mt-4 text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
              Departments work in silos, patients get lost between touchpoints,
              and owners struggle to see what's actually happening — in real
              time.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {PROBLEMS.map((p, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs font-bold">✕</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-snug">{p}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION BANNER ── */}
      <section className="bg-sky-500 py-14 px-4">
        <FadeIn className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl text-white font-semibold leading-snug"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            Docito gives you one system
            <br />
            for your entire clinic.
          </h2>
          <p className="mt-3 text-sky-100 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            From the front desk to diagnostics to billing — every step
            connected, every team member aligned, every patient tracked.
          </p>
        </FadeIn>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-white py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-sky-500 text-xs tracking-widest uppercase font-medium mb-3">
              What changes with Docito
            </p>
            <h2
              className="text-3xl md:text-4xl text-slate-900 font-semibold"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Built for how clinics actually operate.
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.07}>
                <div className="group p-6 rounded-2xl border border-slate-100 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-50 transition-all duration-300 h-full">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center mb-4 transition-colors">
                    <f.icon className="w-5 h-5 text-sky-500" />
                  </div>
                  <h3 className="text-slate-900 font-semibold text-base mb-2 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUTCOMES ── */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl text-slate-900 font-semibold"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              What your clinic looks like with Docito
            </h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              "No more chasing patients manually",
              "No more switching between systems",
              "No more lost referrals or missed steps",
              "Clear, structured patient journeys",
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />
                  <p className="text-slate-700 text-sm font-medium">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="bg-white py-12 px-4 border-y border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8">
          {[
            "Built for real clinical workflows",
            "Designed with clinic owners in mind",
            "Made for modern healthcare teams",
          ].map((tag, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <span className="text-sky-400">◆</span>
                {tag}
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── QUIZ ── */}
      <QuizFunnel
        role="clinic"
        questions={CLINIC_QUIZ}
        renderResults={renderClinicResults}
      />

      {/* ── FINAL CTA ── */}
      <section className="bg-white py-24 px-4">
        <FadeIn className="max-w-xl mx-auto text-center">
          <p className="text-sky-500 text-xs tracking-widest uppercase font-medium mb-4">
            Take control
          </p>
          <h2
            className="text-3xl md:text-4xl text-slate-900 font-semibold leading-snug mb-4"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            Docito is not another tool.
            <br />
            <span className="text-sky-500">
              It's the system that connects your entire clinic.
            </span>
          </h2>
          <p className="text-slate-500 text-base mb-8">
            Join clinic owners already running cleaner operations with Docito.
          </p>
          <a
            href="https://app.docito.app/signup"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-10 py-4 rounded-xl transition-colors text-base group"
          >
            Start free
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <p className="text-slate-400 text-xs mt-3">
            No credit card required · Upgrade only when you grow
          </p>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-50 border-t border-slate-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img
            src="/logos/logo-full-light.png"
            alt="Docito"
            className="h-6 object-contain opacity-60"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="text-slate-400 text-xs">
            © {new Date().getFullYear()} Docito®. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
