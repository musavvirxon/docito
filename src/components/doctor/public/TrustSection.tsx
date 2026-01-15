import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Lock,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const trustItems = [
  {
    icon: BadgeCheck,
    key: "verified",
    color: "text-green-500",
    gradient: "from-green-500/20 to-emerald-500/10",
  },
  {
    icon: Lock,
    key: "encrypted",
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-cyan-500/10",
  },
  {
    icon: ShieldCheck,
    key: "hipaa",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-violet-500/10",
  },
  {
    icon: Eye,
    key: "noSell",
    color: "text-amber-500",
    gradient: "from-amber-500/20 to-orange-500/10",
  },
];

export default function TrustSection() {
  const { t, i18n } = useTranslation("doctors");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const isRTL = i18n.language === "ar";

  return (
    <section
      ref={ref}
      className={cn(
        "py-12 lg:py-16",
        isRTL && "rtl"
      )}
    >
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t("publicProfile.trust.headline", "Your data. Your control.")}
          </h2>
          <p className="text-muted-foreground">
            {t("publicProfile.trust.subheadline", "We take security and privacy seriously.")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {trustItems.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={cn(
                "relative p-4 rounded-xl border border-border/50 bg-gradient-to-br",
                item.gradient
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-2", item.color)} />
              <h4 className="font-medium text-sm text-foreground">
                {t(`publicProfile.trust.${item.key}.title`, getDefaultTitle(item.key))}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {t(`publicProfile.trust.${item.key}.description`, getDefaultDescription(item.key))}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Animated Security Line SVG */}
        <motion.svg
          viewBox="0 0 400 20"
          className="w-full max-w-md mx-auto mt-8 h-5"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
        >
          <motion.path
            d="M0 10 Q100 5, 200 10 T400 10"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          <motion.circle
            cx="200"
            cy="10"
            r="4"
            fill="hsl(var(--primary))"
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ delay: 1.2, duration: 0.3 }}
          />
        </motion.svg>
      </div>
    </section>
  );
}

function getDefaultTitle(key: string): string {
  const titles: Record<string, string> = {
    verified: "Verified Provider",
    encrypted: "End-to-End Encrypted",
    hipaa: "HIPAA & GDPR",
    noSell: "No Data Selling",
  };
  return titles[key] || key;
}

function getDefaultDescription(key: string): string {
  const descriptions: Record<string, string> = {
    verified: "Credentials checked",
    encrypted: "Secure communications",
    hipaa: "Compliant standards",
    noSell: "We never sell your data",
  };
  return descriptions[key] || "";
}
