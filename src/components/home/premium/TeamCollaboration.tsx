// src/components/home/premium/TeamCollaboration.tsx
import { motion } from "framer-motion";
import {
  Users,
  Shield,
  Share2,
  Clock,
  MessageSquare,
  Stethoscope,
  FileText,
  Activity,
  Lock,
  Plug,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Role-based access",
    description: "Keep every note, file, and action visible only to the right people.",
  },
  {
    icon: Lock,
    title: "Audit-friendly sharing",
    description: "Share updates with confidence — with clear ownership and traceability.",
  },
  {
    icon: MessageSquare,
    title: "Secure team messaging",
    description: "Coordinate care without leaking PHI into consumer chat apps.",
  },
  {
    icon: Clock,
    title: "Real-time handoffs",
    description: "Status changes move with the patient — no calls, no screenshots, no chasing.",
  },
  {
    icon: Share2,
    title: "One patient timeline",
    description: "Appointments, notes, labs, imaging, and prescriptions in one place.",
  },
  {
    icon: Plug,
    title: "Integrations when you need them",
    description: "Connect systems and workflows without rebuilding your stack overnight.",
  },
];

export default function TeamCollaboration() {
  return (
    <section className="py-24 bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  For CTOs & Operators
                </span>
              </div>

              <h2 className="text-4xl font-bold">
                One record. One workflow.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                  Zero handoffs.
                </span>
              </h2>

              <p className="text-xl text-muted-foreground">
                Coordinate care across doctors, admins, labs, pharmacies, and imaging — without
                chasing files or duplicating work.
              </p>
            </div>

            <div className="grid gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="flex gap-4 p-4 rounded-xl bg-white/50 border border-primary/10 backdrop-blur-sm"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right visualization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative bg-white/30 border border-primary/10 rounded-3xl p-8 backdrop-blur-sm">
              {/* Central hub */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-50" />

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="relative w-64 h-64 mx-auto"
                >
                  {/* Outer ring */}
                  <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-full" />

                  {/* Inner ring */}
                  <div className="absolute inset-12 border border-primary/30 rounded-full" />

                  {/* Center */}
                  <div className="absolute inset-24 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Activity className="h-12 w-12 text-white" />
                  </div>

                  {/* Nodes */}
                  {[
                    { icon: Stethoscope, label: "Clinicians", angle: 0 },
                    { icon: FileText, label: "Records", angle: 72 },
                    { icon: MessageSquare, label: "Messaging", angle: 144 },
                    { icon: Shield, label: "Access", angle: 216 },
                    { icon: Clock, label: "Ops", angle: 288 },
                  ].map((node, index) => (
                    <motion.div
                      key={index}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                      className="absolute w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-primary/10"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${node.angle}deg) translateY(-120px) rotate(-${node.angle}deg)`,
                      }}
                    >
                      <node.icon className="h-6 w-6 text-primary" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Connection lines */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Stethoscope className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Care team</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned + notified automatically
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Access controls</p>
                        <p className="text-xs text-muted-foreground">
                          Roles, permissions, and audit trails
                        </p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
