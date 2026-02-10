import { motion } from 'framer-motion';
import { Shield, Check, ArrowRight, FileCheck, CreditCard, Search } from 'lucide-react';

const benefits = [
  'Instant eligibility checks',
  'Direct claims submission',
  'No paperwork for patients',
  'Pre-authorization support',
  'Multi-payer compatibility',
  'Real-time claim status',
];

const steps = [
  {
    icon: Search,
    step: '1',
    title: 'Select provider',
    description: 'Patient selects their insurance during booking — coverage is checked instantly.',
  },
  {
    icon: FileCheck,
    step: '2',
    title: 'Instant verification',
    description: 'Eligibility, copay, and deductible details are surfaced before the visit.',
  },
  {
    icon: CreditCard,
    step: '3',
    title: 'Direct billing',
    description: 'Claims are submitted automatically — patients only pay their share.',
  },
];

export default function InsuranceProviders() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Insurance Integration
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Works with insurance providers worldwide
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Docito integrates with insurance workflows globally — so verification, billing, and claims happen inside the platform.
          </p>
        </motion.div>

        {/* 3-step flow */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((s, index) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative"
            >
              <div className="h-full p-8 rounded-3xl bg-card border border-border/50 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
                  <s.icon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                  Step {s.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Benefits grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-card border border-border/50"
            >
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">{benefit}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
