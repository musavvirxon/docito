import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Apple, Play, Bell, Calendar, FileText, Heart } from 'lucide-react';

export default function MobileAppBanner() {
  const { t } = useTranslation(['home']);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6"
            >
              <Smartphone className="w-4 h-4" />
              {t('home:mobile.badge', 'Mobile Experience')}
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground mb-4"
            >
              {t('home:mobile.title', 'Mobile App')}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-6"
            >
              {t('home:mobile.comingSoon', 'Coming Soon')}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg text-muted-foreground mb-8 max-w-md mx-auto lg:mx-0"
            >
              {t('home:mobile.description', 'A faster, smarter way to manage your health — available soon on iOS & Android.')}
            </motion.p>

            {/* Store buttons placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <button 
                disabled
                className="flex items-center gap-3 px-6 py-3 bg-muted/50 border border-border rounded-xl opacity-60 cursor-not-allowed"
              >
                <Apple className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">Coming to</div>
                  <div className="text-sm font-medium">App Store</div>
                </div>
              </button>
              <button 
                disabled
                className="flex items-center gap-3 px-6 py-3 bg-muted/50 border border-border rounded-xl opacity-60 cursor-not-allowed"
              >
                <Play className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">Coming to</div>
                  <div className="text-sm font-medium">Google Play</div>
                </div>
              </button>
            </motion.div>
          </div>

          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50, rotateY: 15 }}
            animate={isInView ? { opacity: 1, y: 0, rotateY: 0 } : {}}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative flex justify-center"
          >
            {/* Phone frame */}
            <div className="relative w-[280px] h-[560px] bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[50px] p-3 shadow-2xl">
              {/* Screen */}
              <div className="relative w-full h-full bg-background rounded-[40px] overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-2xl" />

                {/* Screen content */}
                <div className="pt-12 px-4 h-full bg-gradient-to-b from-muted/50 to-background">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/20 rounded-2xl flex items-center justify-center">
                      <Heart className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Docito</h3>
                    <p className="text-xs text-muted-foreground">Your Health, Simplified</p>
                  </div>

                  {/* Feature cards */}
                  <div className="space-y-3">
                    {[
                      { icon: Calendar, label: 'Book Appointments', color: 'bg-blue-500/20 text-blue-500' },
                      { icon: FileText, label: 'View Records', color: 'bg-emerald-500/20 text-emerald-500' },
                      { icon: Bell, label: 'Get Reminders', color: 'bg-amber-500/20 text-amber-500' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-background/80 rounded-xl border border-border/50"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Coming soon overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 1 }}
                    className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center"
                  >
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-2xl font-bold text-primary mb-2"
                      >
                        Coming Soon
                      </motion.div>
                      <p className="text-xs text-muted-foreground">iOS & Android</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-2xl blur-xl"
            />
            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -bottom-4 -left-4 w-20 h-20 bg-accent/20 rounded-full blur-xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
