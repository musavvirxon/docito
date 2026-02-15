import { motion } from 'framer-motion';
import { Smartphone, Bell, Calendar, FileText, Shield, Zap, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const featureIcons = [Calendar, FileText, Bell, Shield, Zap];
const featureKeys = ["bookAppointments", "viewRecords", "getReminders", "secureAccess"] as const;

export default function MobileAppShowcase() {
  const { t } = useTranslation("premium");

  return (
    <section className="py-24 bg-gradient-to-b from-violet-500/5 via-background to-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium mb-6">
              <Smartphone className="w-4 h-4" />
              {t("mobile.badge", "Mobile App")}
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-6">
              {t("mobile.title.line1", "Healthcare in")}<br />
              <span className="font-normal text-primary">{t("mobile.title.highlight", "Your Pocket")}</span>
            </h2>
            <p className="text-lg text-muted-foreground font-light mb-8 leading-relaxed">{t("mobile.description")}</p>

            <div className="flex flex-wrap gap-3 mb-8">
              {featureKeys.map((key, index) => {
                const Icon = featureIcons[index];
                return (
                  <motion.div key={key} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.05 }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{t(`mobile.features.${key}`)}</span>
                  </motion.div>
                );
              })}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }} className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-primary/10 border border-violet-500/20 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{t("mobile.comingSoon.title", "Coming Soon")}</h3>
                  <p className="text-sm text-muted-foreground">{t("mobile.comingSoon.platforms", "iOS & Android")}</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">{t("mobile.comingSoon.description")}</p>
            </motion.div>

            <div className="flex items-center gap-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gray-400 text-white">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div><div className="text-[10px] opacity-80">{t("mobile.store.comingTo", "Coming to")}</div><div className="text-sm font-semibold -mt-0.5">{t("mobile.store.appStore", "App Store")}</div></div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gray-400 text-white">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.27 1.31zM6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z"/></svg>
                <div><div className="text-[10px] opacity-80">{t("mobile.store.comingTo", "Coming to")}</div><div className="text-sm font-semibold -mt-0.5">{t("mobile.store.googlePlay", "Google Play")}</div></div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-primary/30 blur-3xl scale-150 opacity-50" />
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="relative w-64 h-[520px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-8 bg-background/80 backdrop-blur-sm flex items-center justify-center"><div className="w-20 h-5 bg-black rounded-full" /></div>
                  <div className="pt-12 px-4 space-y-4">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-2"><span className="text-primary font-bold">D</span></div>
                      <p className="text-sm font-medium text-foreground">{t("mobile.mock.goodMorning", "Good morning!")}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-card border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">{t("mobile.mock.upcoming", "Upcoming")}</p>
                      <p className="text-sm font-medium text-foreground">{t("mobile.mock.yourAppointment", "Your Appointment")}</p>
                      <p className="text-xs text-primary">{t("mobile.mock.scheduleNow", "Schedule Now")}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-primary/10 text-center"><Calendar className="w-5 h-5 text-primary mx-auto mb-1" /><p className="text-xs font-medium text-foreground">{t("mobile.mock.book", "Book")}</p></div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-center"><FileText className="w-5 h-5 text-emerald-500 mx-auto mb-1" /><p className="text-xs font-medium text-foreground">{t("mobile.mock.records", "Records")}</p></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20">
                      <p className="text-xs font-medium text-foreground">{t("mobile.mock.healthScore", "Health Score")}</p>
                      <p className="text-2xl font-bold text-primary">--</p>
                      <p className="text-xs text-muted-foreground">{t("mobile.comingSoon.title", "Coming Soon")}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div animate={{ y: [0, -15, 0], x: [0, 5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute -top-4 -right-8 p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"><Bell className="w-5 h-5" /></motion.div>
              <motion.div animate={{ y: [0, 10, 0], x: [0, -5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute -bottom-4 -left-8 p-3 rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-500/30"><Calendar className="w-5 h-5" /></motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
