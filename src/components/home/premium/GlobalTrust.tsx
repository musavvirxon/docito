// src/components/home/premium/GlobalTrust.tsx
import { motion } from "framer-motion";
import { Globe, Shield, Lock, CheckCircle2, Languages, Banknote, Clock, Scale } from "lucide-react";

const globalFeatures = [
  {
    icon: Languages,
    title: "Multi-language",
    description: "Use Docito in English, Arabic, Russian, Uzbek, and more — with full RTL support.",
  },
  {
    icon: Banknote,
    title: "Multi-currency",
    description: "Accept payments and display pricing in any local currency.",
  },
  {
    icon: Clock,
    title: "Any timezone",
    description: "Scheduling, reminders, and availability adapt to each user's timezone automatically.",
  },
  {
    icon: Scale,
    title: "Regional compliance",
    description: "Architecture designed to support healthcare regulations in any jurisdiction.",
  },
];

const principles = [
  {
    icon: Shield,
    label: "Privacy-first by design",
    description: "Role-based access and secure sharing",
  },
  {
    icon: Lock,
    label: "Security program",
    description: "Modern auth, audit trails, and monitoring",
  },
  {
    icon: CheckCircle2,
    label: "Compliance-ready architecture",
    description: "Designed to support regulated healthcare workflows",
  },
];

export default function GlobalTrust() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Global platform
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            One platform. Every country. Any language.
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Docito is built to work anywhere — no matter where your team or patients are located.
          </p>
        </motion.div>

        {/* Global features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {globalFeatures.map((f, index) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="p-6 rounded-3xl bg-card border border-border/50 text-center hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Trust principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {principles.map((p, index) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-card to-muted/30 border border-border/50 text-center"
            >
              <motion.div
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
              >
                <p.icon className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="font-semibold text-foreground mb-2">{p.label}</h3>
              <p className="text-sm text-muted-foreground">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
