// src/components/home/premium/TeamCollaboration.tsx
import { motion } from "framer-motion";
import { Users, Shield, Share2, Clock, MessageSquare, Stethoscope, FileText, Activity, Lock, Plug } from "lucide-react";
import { useTranslation } from "react-i18next";

const featureKeys = [
  { key: "roleAccess", icon: Shield },
  { key: "auditSharing", icon: Lock },
  { key: "secureMessaging", icon: MessageSquare },
  { key: "realtimeHandoffs", icon: Clock },
  { key: "timeline", icon: Share2 },
  { key: "integrations", icon: Plug },
];

export default function TeamCollaboration() {
  const { t } = useTranslation("premium");

  return (
    <section className="py-24 bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t("ctoOps.badge", "For CTOs & Operators")}</span>
              </div>
              <h2 className="text-4xl font-bold text-foreground">
                {t("ctoOps.title.prefix", "One record. One workflow.")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">{t("ctoOps.title.highlight", "Zero handoffs.")}</span>
              </h2>
              <p className="text-xl text-muted-foreground">{t("ctoOps.description")}</p>
            </div>

            <div className="grid gap-6">
              {featureKeys.map((f, index) => {
                const Icon = f.icon;
                return (
                  <motion.div key={f.key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1, duration: 0.5 }} className="flex gap-4 p-4 rounded-xl bg-background/50 border border-border/40 backdrop-blur-sm">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-6 w-6 text-primary" /></div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{t(`ctoOps.features.${f.key}.title`)}</h3>
                      <p className="text-sm text-muted-foreground">{t(`ctoOps.features.${f.key}.description`)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
            <div className="relative bg-background/30 border border-border/40 rounded-3xl p-8 backdrop-blur-sm">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-50" />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="relative w-64 h-64 mx-auto">
                  <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-full" />
                  <div className="absolute inset-12 border border-primary/30 rounded-full" />
                  <div className="absolute inset-24 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center shadow-lg"><Activity className="h-12 w-12 text-white" /></div>
                  {[
                    { icon: Stethoscope, angle: 0 },
                    { icon: FileText, angle: 72 },
                    { icon: MessageSquare, angle: 144 },
                    { icon: Shield, angle: 216 },
                    { icon: Clock, angle: 288 },
                  ].map((node, index) => (
                    <motion.div key={index} animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute w-12 h-12 bg-background rounded-xl shadow-lg flex items-center justify-center border border-border/40" style={{ top: "50%", left: "50%", transform: `translate(-50%, -50%) rotate(${node.angle}deg) translateY(-120px) rotate(-${node.angle}deg)` }}>
                      <node.icon className="h-6 w-6 text-primary" />
                    </motion.div>
                  ))}
                </motion.div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><Stethoscope className="h-4 w-4 text-primary" /></div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{t("ctoOps.cards.careTeam.title", "Care team")}</p>
                        <p className="text-xs text-muted-foreground">{t("ctoOps.cards.careTeam.description", "Assigned + notified automatically")}</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><Shield className="h-4 w-4 text-primary" /></div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{t("ctoOps.cards.accessControls.title", "Access controls")}</p>
                        <p className="text-xs text-muted-foreground">{t("ctoOps.cards.accessControls.description", "Roles, permissions, and audit trails")}</p>
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
