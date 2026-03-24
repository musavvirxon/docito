// src/components/landing/DoctorLanding.tsx
import { motion } from "framer-motion";
import {
  Stethoscope,
  ClipboardList,
  RefreshCw,
  Pill,
  TestTube2,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  BarChart2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Target,
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
  "Switching between tools 10+ times a day",
  "Losing track of follow-ups and referrals",
  "Spending 2–3 hours daily on admin tasks",
  "Patient records scattered across systems",
];

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Every patient detail, always accessible",
    body: "Full history, diagnostics, prescriptions, and notes — unified in one place.",
  },
  {
    icon: RefreshCw,
    title: "Track what happens after you refer",
    body: "Know if a referred patient showed up, the outcome, and what comes next.",
  },
  {
    icon: Pill,
    title: "From doctor to pharmacy without friction",
    body: "Issue prescriptions digitally. Patients get them instantly. No fax, no paper.",
  },
  {
    icon: TestTube2,
    title: "Labs and imaging connected to care",
    body: "Diagnostic results flow directly into the patient record. Review and act in one screen.",
  },
  {
    icon: Clock,
    title: "Appointments that manage themselves",
    body: "Smart scheduling with reminders, cancellation handling, and follow-up prompts.",
  },
  {
    icon: Stethoscope,
    title: "See the full patient journey",
    body: "Every touchpoint is logged, connected, and visible at a glance.",
  },
];

// ─── Doctor quiz — 10 questions ───────────────────────────────────────────────

const DOCTOR_QUIZ: QuizQuestion[] = [
  {
    id: "records",
    question: "How do you currently manage your patient records?",
    hint: "Helps us understand your documentation flow",
    options: [
      "Paper or memory",
      "Multiple tools",
      "One main system",
      "Fully integrated system",
    ],
  },
  {
    id: "history_access",
    question:
      "During consultations, how easily can you see the full patient history?",
    hint: "Speed of access affects decision-making",
    options: [
      "Hard or incomplete",
      "Takes time to find",
      "Mostly accessible",
      "Instant and complete",
    ],
  },
  {
    id: "followups",
    question: "How do you usually handle follow-ups?",
    hint: "Follow-ups directly impact outcomes and retention",
    options: [
      "I don't track them",
      "Manual reminders",
      "Partial system",
      "Fully automated",
    ],
  },
  {
    id: "diagnostics",
    question: "After sending a patient for tests (labs/imaging), what happens?",
    hint: "This is where many workflows break",
    options: [
      "I don't know",
      "I follow up manually",
      "I sometimes get updates",
      "It's fully tracked",
    ],
  },
  {
    id: "tools",
    question: "How many different tools or systems do you use daily?",
    hint: "System switching creates friction",
    options: ["5 or more", "3–5", "2", "Just 1"],
  },
  {
    id: "admin_time",
    question: "How much time do you spend on non-clinical tasks daily?",
    hint: "Admin vs patient time",
    options: ["3+ hours", "1–3 hours", "Less than 1 hour", "Almost none"],
  },
  {
    id: "prescriptions",
    question: "How do you manage prescriptions?",
    hint: "Prescription flow impacts efficiency",
    options: [
      "Paper",
      "Separate system",
      "Partially digital",
      "Fully integrated",
    ],
  },
  {
    id: "dropoff",
    question: "How often do patients miss follow-ups or drop off?",
    hint: "Patient retention signal",
    options: ["Very often", "Sometimes", "Rarely", "Almost never"],
  },
  {
    id: "continuity",
    question: "How confident are you in tracking patient progress over time?",
    hint: "Continuity of care",
    options: [
      "Not confident",
      "Somewhat confident",
      "Mostly confident",
      "Fully confident",
    ],
  },
  {
    id: "priority",
    question: "Which of these matters most to you right now?",
    hint: "Personalization driver",
    options: [
      "Save time",
      "Reduce admin",
      "Improve patient outcomes",
      "Better organization",
    ],
  },
];

// ─── Dynamic results renderer ─────────────────────────────────────────────────

const ADMIN_LOAD = ["High", "High", "Medium", "Low"] as const;
const ADMIN_COLOR: ("red" | "amber" | "green")[] = [
  "red",
  "red",
  "amber",
  "green",
];

const WORKFLOW_CLARITY = ["Low", "Low", "Medium", "High"] as const;
const WORKFLOW_COLOR: ("red" | "amber" | "green")[] = [
  "red",
  "red",
  "amber",
  "green",
];

const CONTINUITY_MAP = ["Weak", "Weak", "Moderate", "Strong"] as const;
const CONTINUITY_COLOR: ("red" | "amber" | "green")[] = [
  "red",
  "red",
  "amber",
  "green",
];

const TIME_ESTIMATES = ["3+ hours", "1–3 hours", "< 1 hour", "minimal time"];
const DROPOFF_RISK = ["high", "moderate", "low", "very low"];

const PRIORITY_BENEFIT: Record<number, string> = {
  0: "Save 1–3 hours of admin time daily",
  1: "Eliminate manual paperwork and admin overhead",
  2: "Never miss a follow-up or patient touchpoint",
  3: "Bring structure and clarity to every patient journey",
};

const LEVEL_SUMMARY: Record<ScoreLevel, string> = {
  low: "Fragmented — high manual effort, disconnected tools",
  medium: "Partially Structured — works but depends on manual effort",
  high: "Structured — clear workflows with integration gaps remaining",
};

function renderDoctorResults(
  answers: number[],
  _score: number,
  level: ScoreLevel,
  _totalQ: number
): React.ReactNode {
  const adminLoad = ADMIN_LOAD[answers[5] ?? 0];
  const adminColor = ADMIN_COLOR[answers[5] ?? 0];
  const workflowClarity = WORKFLOW_CLARITY[answers[2] ?? 0];
  const workflowColor = WORKFLOW_COLOR[answers[2] ?? 0];
  const continuity = CONTINUITY_MAP[answers[8] ?? 0];
  const continuityColor = CONTINUITY_COLOR[answers[8] ?? 0];
  const dailyTime = TIME_ESTIMATES[answers[5] ?? 0];
  const dropoffRisk = DROPOFF_RISK[answers[7] ?? 0];
  const priorityBenefit = PRIORITY_BENEFIT[answers[9] ?? 0];

  const gaps: string[] = [];
  if (answers[3] < 3) gaps.push("Referral and diagnostic visibility");
  if (answers[2] < 3) gaps.push("Follow-up tracking");
  if (answers[4] > 1) gaps.push("System switching and tool fragmentation");
  if (answers[6] < 2) gaps.push("Prescription workflow");
  if (!gaps.length) gaps.push("Minor integration improvements still available");

  const thisLeadsTo =
    level === "low"
      ? [
          "Missed follow-ups and patient drop-offs",
          "Repeated questions at each consultation",
          "Longer consultations due to record hunting",
          "Administrative fatigue reducing care quality",
        ]
      : level === "medium"
      ? [
          "Occasional missed follow-ups",
          "Manual coordination slowing you down",
          "Limited scalability as your practice grows",
        ]
      : [
          "Minor workflow inefficiencies adding up over time",
          "Gaps when one system doesn't talk to another",
        ];

  const docAdaptsTo = [
    "Centralize all patient records into one timeline",
    "Automatically track referrals and diagnostics",
    ...(answers[2] < 3
      ? ["Automate follow-up scheduling and reminders"]
      : []),
    ...(answers[5] < 2
      ? ["Reduce admin time with connected workflows"]
      : []),
    ...(answers[6] < 2 ? ["Integrate prescriptions digitally"] : []),
  ];

  return (
    <>
      {/* Section 1 — Summary */}
      <ResultSection
        icon={<BarChart2 className="w-4 h-4" />}
        title="Section 1 — Summary"
      >
        <p className="mb-3">
          Your current workflow is:{" "}
          <span className="text-white font-semibold">
            {LEVEL_SUMMARY[level]}
          </span>
        </p>
        <div className="bg-white/[0.04] rounded-lg p-3 space-y-0 divide-y divide-white/[0.06]">
          <MetricRow
            label="Admin load"
            value={adminLoad}
            valueColor={adminColor}
          />
          <MetricRow
            label="Workflow clarity"
            value={workflowClarity}
            valueColor={workflowColor}
          />
          <MetricRow
            label="Patient continuity"
            value={continuity}
            valueColor={continuityColor}
          />
        </div>
      </ResultSection>

      {/* Section 2 — Key Observations */}
      <ResultSection
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Section 2 — Key Observations"
      >
        <p className="mb-3 text-slate-300 font-medium">
          1. Time Loss
        </p>
        <p className="mb-4">
          You are likely spending{" "}
          <span className="text-amber-400 font-semibold">{dailyTime}</span> on
          administrative tasks that could be significantly reduced.
        </p>
        <p className="mb-2 text-slate-300 font-medium">2. Workflow Gaps</p>
        <p className="mb-3">Your workflow shows gaps in:</p>
        <BulletList items={gaps} />
        <p className="mt-4 mb-2 text-slate-300 font-medium">
          3. Patient Drop-off Risk
        </p>
        <p>
          There is a{" "}
          <span className="text-amber-400 font-semibold">{dropoffRisk}</span>{" "}
          risk of patients not completing their care journey due to lack of
          structured follow-up.
        </p>
      </ResultSection>

      {/* Section 3 — What This Means */}
      <ResultSection
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Section 3 — What This Means"
      >
        <p className="mb-3">This setup can lead to:</p>
        <BulletList items={thisLeadsTo} />
      </ResultSection>

      {/* Section 4 — How Docito Adapts */}
      <ResultSection
        icon={<Lightbulb className="w-4 h-4" />}
        title="Section 4 — How Docito Adapts to You"
      >
        <p className="mb-3">Based on your answers, Docito would:</p>
        <BulletList items={docAdaptsTo} />
      </ResultSection>

      {/* Section 5 — Personalized Benefit */}
      <ResultSection
        icon={<Zap className="w-4 h-4" />}
        title="Section 5 — Personalized Benefit"
      >
        <p className="mb-3">
          You said your top priority is:{" "}
          <span className="text-white font-semibold">
            {DOCTOR_QUIZ[9].options[answers[9] ?? 0]}
          </span>
        </p>
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-4 py-3">
          <p className="text-sky-300">
            <span className="font-semibold">If optimized, you could:</span>{" "}
            {priorityBenefit}, improve patient follow-up completion, and reduce
            manual coordination significantly.
          </p>
        </div>
      </ResultSection>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mb-2">
        <div className="flex items-center gap-2.5 mb-1">
          <Target className="w-4 h-4 text-sky-400" />
          <p className="text-white text-sm font-semibold">
            See how your workflow looks when everything is connected.
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

export default function DoctorLanding({ onChangeRole }: Props) {
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
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
              }}
            />
            <span className="hidden sm:inline-block bg-sky-50 text-sky-600 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-100">
              For Doctors
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-600/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="inline-flex items-center gap-2 text-sky-400 text-xs tracking-widest uppercase font-medium mb-6">
              <Stethoscope className="w-3.5 h-3.5" />
              For Physicians
            </p>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl text-white font-semibold leading-tight tracking-tight mb-6"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Focus on patients,
              <br />
              <span className="text-sky-400">not paperwork.</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10">
              Everything about your patient — in one place. Docito connects
              your records, diagnostics, prescriptions, and follow-ups into one
              seamless system.
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
              Map my workflow
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
              Healthcare isn't slow because of care.{" "}
              <span className="text-slate-400">
                It's slow because of systems.
              </span>
            </h2>
            <p className="mt-4 text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
              Most doctors manage patients across disconnected tools, calls,
              spreadsheets, and manual follow-ups — creating delays, missed
              handoffs, and constant administrative pressure.
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
            Docito brings everything into one flow.
          </h2>
          <p className="mt-3 text-sky-100 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            From the first appointment to diagnostics, prescriptions, and
            follow-ups — every step is connected inside one platform.
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
              Everything you need. Nothing you don't.
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
              What changes with Docito
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
            "Designed with doctors in mind",
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
        role="doctor"
        questions={DOCTOR_QUIZ}
        renderResults={renderDoctorResults}
      />

      {/* ── FINAL CTA ── */}
      <section className="bg-white py-24 px-4">
        <FadeIn className="max-w-xl mx-auto text-center">
          <p className="text-sky-500 text-xs tracking-widest uppercase font-medium mb-4">
            Get started
          </p>
          <h2
            className="text-3xl md:text-4xl text-slate-900 font-semibold leading-snug mb-4"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            Docito is not another tool.
            <br />
            <span className="text-sky-500">
              It's the system that connects your entire workflow.
            </span>
          </h2>
          <p className="text-slate-500 text-base mb-8">
            Join doctors already running cleaner practices with Docito.
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
