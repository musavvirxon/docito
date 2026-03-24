// src/components/landing/QuizFunnel.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  MailOpen,
  ChevronRight,
  Clock,
  TrendingDown,
  Users,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { LandingRole } from "@/pages/LandingPage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  hint: string;
  options: string[];
}

export type ScoreLevel = "low" | "medium" | "high";

export interface Props {
  role: LandingRole;
  questions: QuizQuestion[];
  renderResults: (
    answers: number[],
    score: number,
    level: ScoreLevel,
    totalQ: number
  ) => React.ReactNode;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calcScore(answers: number[]): number {
  return answers.reduce((sum, a) => sum + (a + 1), 0);
}

export function getScoreLevel(score: number, total: number): ScoreLevel {
  const pct = score / (total * 4);
  if (pct <= 0.45) return "low";
  if (pct <= 0.72) return "medium";
  return "high";
}

// ─── Shared result primitives (imported by landing pages) ─────────────────────

export function ResultBadge({ level }: { level: ScoreLevel }) {
  const map: Record<ScoreLevel, { cls: string; label: string }> = {
    low: {
      cls: "bg-red-500/15 border-red-500/30 text-red-400",
      label: "⚠ Fragmented",
    },
    medium: {
      cls: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      label: "◑ Partially Structured",
    },
    high: {
      cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      label: "✓ Well Structured",
    },
  };
  const { cls, label } = map[level];
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border ${cls}`}
    >
      {label}
    </span>
  );
}

export function ScoreBar({
  score,
  total,
  level,
}: {
  score: number;
  total: number;
  level: ScoreLevel;
}) {
  const colorMap: Record<ScoreLevel, string> = {
    low: "bg-red-500",
    medium: "bg-amber-400",
    high: "bg-emerald-500",
  };
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span className="font-medium text-slate-400">
          Workflow Efficiency Score
        </span>
        <span className="text-white font-semibold tabular-nums">
          {score} / {total * 4}
        </span>
      </div>
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorMap[level]}`}
          initial={{ width: "0%" }}
          animate={{ width: `${(score / (total * 4)) * 100}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1.5 px-0.5">
        <span>Fragmented</span>
        <span>Partially Structured</span>
        <span>Fully Integrated</span>
      </div>
    </div>
  );
}

export function MetricRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: "red" | "amber" | "green";
}) {
  const colors: Record<string, string> = {
    red: "text-red-400",
    amber: "text-amber-400",
    green: "text-emerald-400",
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${colors[valueColor]}`}>
        {value}
      </span>
    </div>
  );
}

export function ResultSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-sky-400 shrink-0">{icon}</span>
        <h4 className="text-white font-semibold text-sm leading-snug">
          {title}
        </h4>
      </div>
      <div className="text-slate-400 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-sky-500 mt-0.5 shrink-0 font-bold text-xs">
            ›
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function QuizFunnel({ role, questions, renderResults }: Props) {
  const [step, setStep] = useState<"intro" | "quiz" | "email" | "done">(
    "intro"
  );
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const totalQ = questions.length;
  const q = questions[current];
  const progress = (current / totalQ) * 100;

  const finalScore = calcScore(answers);
  const level = getScoreLevel(finalScore, totalQ);

  function handleOptionClick(idx: number) {
    setSelected(idx);
    setTimeout(() => {
      const next = [...answers, idx];
      setAnswers(next);
      setSelected(null);
      if (current + 1 < totalQ) {
        setCurrent((c) => c + 1);
      } else {
        setStep("email");
      }
    }, 350);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await supabase.functions.invoke("submit-lead", {
        body: {
          email: email.trim().toLowerCase(),
          role,
          quizAnswers: Object.fromEntries(
            questions.map((q, i) => [q.id, answers[i]])
          ),
          score: finalScore,
          scoreLevel: level,
        },
      });
    } catch (_) {
      // Silent fail — never block the user
    } finally {
      setSubmitting(false);
      setStep("done");
    }
  }

  return (
    <section id="quiz" className="bg-[#070F1E] py-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-sky-400 text-xs tracking-widest uppercase font-medium text-center mb-4"
        >
          Free Workflow Assessment
        </motion.p>

        {step === "intro" && (
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="text-3xl md:text-4xl text-white font-semibold text-center mb-10 leading-snug"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            Let's map your workflow.
          </motion.h2>
        )}

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ── INTRO ── */}
            {step === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="p-8 md:p-10"
              >
                <p className="text-slate-300 text-base leading-relaxed mb-8">
                  This takes less than 2 minutes.
                  <br />
                  We'll analyze how you currently work and show you:
                </p>

                <div className="space-y-2.5 mb-8">
                  {[
                    { icon: Clock, text: "Where time is being lost" },
                    { icon: TrendingDown, text: "Where patients drop off" },
                    {
                      icon: Users,
                      text: "How your workflow can be improved",
                    },
                  ].map(({ icon: Icon, text }, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3"
                    >
                      <Icon className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-slate-300 text-sm">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3 mb-8">
                  <p className="text-sky-300 text-sm leading-relaxed">
                    At the end, you'll get a{" "}
                    <span className="font-semibold text-sky-200">
                      personalized overview
                    </span>{" "}
                    of how Docito can adapt to your specific setup.
                  </p>
                </div>

                <button
                  onClick={() => setStep("quiz")}
                  className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors text-base"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Start the assessment
                  <span className="text-sky-200 text-sm font-normal">
                    · {totalQ} questions
                  </span>
                </button>
              </motion.div>
            )}

            {/* ── QUIZ ── */}
            {step === "quiz" && (
              <motion.div
                key={`q-${current}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.24 }}
                className="p-8 md:p-10"
              >
                {/* Progress */}
                <div className="flex items-center gap-3 mb-7">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-sky-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.35 }}
                    />
                  </div>
                  <span className="text-slate-500 text-xs font-medium shrink-0 tabular-nums">
                    {current + 1} / {totalQ}
                  </span>
                </div>

                {/* Question + hint */}
                <h3 className="text-white text-xl font-semibold mb-1.5 leading-snug">
                  {q.question}
                </h3>
                <p className="text-sky-400/60 text-xs italic mb-6">
                  → {q.hint}
                </p>

                {/* Options */}
                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(idx)}
                      disabled={selected !== null}
                      className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        selected === idx
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-sky-500/40 hover:text-white"
                      } disabled:cursor-not-allowed`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full border text-[11px] flex items-center justify-center shrink-0 font-bold transition-colors ${
                            selected === idx
                              ? "border-white/60 text-white"
                              : "border-slate-600 text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── EMAIL ── */}
            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28 }}
                className="p-8 md:p-10"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/20 mx-auto mb-6">
                  <MailOpen className="w-7 h-7 text-sky-400" />
                </div>
                <h3
                  className="text-white text-2xl font-semibold text-center mb-2"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Your analysis is ready.
                </h3>
                <p className="text-slate-400 text-center text-sm mb-1">
                  Enter your email to unlock your personalized workflow
                  analysis.
                </p>
                <p className="text-slate-600 text-center text-xs mb-8">
                  We'll also send you insights on how to fix the gaps we found.
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <input
                    type="email"
                    placeholder="you@yourclinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500/60 transition-colors"
                    required
                    autoFocus
                  />
                  {formError && (
                    <p className="text-red-400 text-xs">{formError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Show my analysis <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-slate-600 text-xs text-center">
                    No spam · Unsubscribe anytime
                  </p>
                </form>
              </motion.div>
            )}

            {/* ── RESULTS ── */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="p-8 md:p-10"
              >
                {/* Score header */}
                <div className="text-center mb-6">
                  <ResultBadge level={level} />
                  <h3
                    className="text-white text-2xl font-semibold mt-4 mb-1 leading-snug"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Your{" "}
                    {role === "doctor" ? "Practice" : "Clinic"} Workflow
                    Analysis
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Based on your {totalQ} answers
                  </p>
                </div>

                <ScoreBar score={finalScore} total={totalQ} level={level} />

                {/* Dynamic role-specific sections */}
                {renderResults(answers, finalScore, level, totalQ)}

                {/* CTA */}
                <a
                  href="https://app.docito.app/signup"
                  className="flex items-center justify-center gap-2 w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-4 rounded-xl transition-colors group mt-2"
                >
                  Start using Docito for free
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <p className="text-slate-600 text-xs text-center mt-3">
                  No credit card required · Upgrade only when you grow
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
