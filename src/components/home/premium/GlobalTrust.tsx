// src/components/home/premium/GlobalTrust.tsx
import { motion } from "framer-motion";
import { Globe, MapPin, Shield, Zap } from "lucide-react";

const regions = [
  { flag: "🇺🇸", name: "North America", description: "Patient access & practice ops" },
  { flag: "🇪🇺", name: "Europe", description: "Privacy-aware care coordination" },
  { flag: "🇸🇬", name: "Asia Pacific", description: "Fast scheduling & mobile-first care" },
  { flag: "🇦🇺", name: "Oceania", description: "Clinic workflows and referrals" },
  { flag: "🌍", name: "Middle East & Africa", description: "Cross-team visibility and access" },
  { flag: "🇧🇷", name: "Latin America", description: "Connected care journeys" },
];

const trustFeatures = [
  {
    icon: Shield,
    title: "Privacy-first by design",
    description: "Role-based access and secure collaboration built into everyday workflows.",
  },
  {
    icon: Zap,
    title: "Fast, modern UX",
    description: "A responsive experience for patients and teams — on any device.",
  },
  {
    icon: Globe,
    title: "Built for teams everywhere",
    description: "Designed to support multi-location operations and international growth.",
  },
];

export default function GlobalTrust() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Built for modern healthcare teams
            </span>
          </div>

          <h2 className="text-4xl font-bold mb-6">
            Designed to work{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              anywhere
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Docito is built for clinics, labs, pharmacies, and patients — with a modern, secure
            foundation that scales as your network grows.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Map/regions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="bg-white/50 border border-primary/10 rounded-3xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">Global presence</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {regions.map((region, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    className="p-4 rounded-2xl bg-white/60 border border-primary/10 hover:bg-white/80 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{region.flag}</span>
                      <div>
                        <h4 className="font-semibold">{region.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {region.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Trust features */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {trustFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-white/50 border border-primary/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/70 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-3xl p-8 border border-primary/20">
              <h3 className="text-2xl font-bold mb-4">Built to grow with you</h3>
              <p className="text-muted-foreground mb-6">
                Start small — then connect more teams, locations, and services without rebuilding your
                workflows.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Multi-location ready", "Role-based access", "Modern UI", "Audit-friendly"].map(
                  (tag, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-white/60 rounded-full text-sm font-medium border border-primary/10"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
