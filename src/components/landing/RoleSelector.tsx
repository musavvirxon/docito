// src/components/landing/RoleSelector.tsx
import { motion } from "framer-motion";
import { Stethoscope, Building2, ArrowRight } from "lucide-react";
import type { LandingRole } from "@/pages/LandingPage";

interface Props {
  onSelect: (role: LandingRole) => void;
}

const CARDS = [
  {
    role: "doctor" as LandingRole,
    icon: Stethoscope,
    eyebrow: "For physicians",
    title: "I'm a Doctor",
    subtitle: "Private practice, clinic, or hospital",
    promise: "Focus on patients, not paperwork.",
    gradient: "from-sky-500/20 to-cyan-500/10",
    border: "hover:border-sky-500/60",
    iconBg: "bg-sky-500/20",
    iconColor: "text-sky-400",
  },
  {
    role: "clinic" as LandingRole,
    icon: Building2,
    eyebrow: "For administrators",
    title: "I run a Clinic",
    subtitle: "Medical center or healthcare facility",
    promise: "Finally see and control your entire clinic.",
    gradient: "from-indigo-500/20 to-purple-500/10",
    border: "hover:border-indigo-400/60",
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
  },
] as const;

export default function RoleSelector({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-gradient-radial from-sky-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-14 flex flex-col items-center gap-3"
      >
        <img
          src="/logos/800x240 horizontal logo+name.png"
          alt="Docito"
          className="h-9 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="text-slate-500 text-xs tracking-[0.2em] uppercase font-medium">
          Healthcare Management Platform
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08 }}
        className="text-center mb-10 max-w-xl"
      >
        <h1
          className="text-3xl md:text-4xl lg:text-5xl text-white font-semibold leading-tight tracking-tight"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          Who are you building
          <br />
          <span className="text-sky-400">this workflow for?</span>
        </h1>
        <p className="mt-4 text-slate-400 text-base md:text-lg">
          We'll show you exactly how Docito works for your role.
        </p>
      </motion.div>

      {/* Role cards */}
      <div className="grid md:grid-cols-2 gap-5 w-full max-w-2xl">
        {CARDS.map((card, i) => (
          <motion.button
            key={card.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 + i * 0.1 }}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(card.role)}
            className={`group relative bg-white/[0.04] border border-white/10 rounded-2xl p-7 text-left transition-all duration-300 cursor-pointer ${card.border}`}
          >
            {/* Gradient overlay on hover */}
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}
                >
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <ArrowRight
                  className={`w-4 h-4 text-slate-600 group-hover:${card.iconColor} group-hover:translate-x-0.5 transition-all duration-200`}
                />
              </div>

              <p className={`text-xs tracking-widest uppercase font-medium ${card.iconColor} mb-2`}>
                {card.eyebrow}
              </p>
              <h2 className="text-white text-xl font-semibold mb-1">
                {card.title}
              </h2>
              <p className="text-slate-500 text-sm mb-4">{card.subtitle}</p>
              <p className="text-slate-300 text-sm font-medium border-t border-white/[0.07] pt-4">
                {card.promise}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-slate-600 text-sm"
      >
        No credit card required · Free to start
      </motion.p>
    </div>
  );
}
