import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Shield, Bell, Check } from "lucide-react";

const MobileFriendlySection = () => {
  const { t } = useTranslation('home');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    { icon: Cloud, label: t('features.mobile.cloud', 'Cloud Storage') },
    { icon: Shield, label: t('features.mobile.secure', 'Secure Access') },
    { icon: Bell, label: t('features.mobile.notifications', 'Instant Notifications') },
  ];

  const appointments = [
    { name: "Dr. Sarah Chen", time: "9:00 AM", type: "Cardiology" },
    { name: "Dr. Michael Park", time: "2:30 PM", type: "General" },
  ];

  return (
    <section ref={ref} className="py-24 bg-muted/30 dark:bg-muted/10 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Phone Illustration */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative flex justify-center order-2 lg:order-1"
          >
            {/* Phone Frame */}
            <motion.div
              animate={isInView ? { y: [0, -10, 0] } : {}}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="w-64 h-[500px] bg-card rounded-[3rem] border-4 border-border shadow-2xl overflow-hidden dark:shadow-glow-blue">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-border rounded-b-2xl" />
                
                {/* Phone Screen */}
                <div className="pt-10 px-4 h-full bg-background">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Good Morning</div>
                      <div className="text-lg font-bold text-foreground">John Doe</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">JD</span>
                    </div>
                  </div>

                  {/* Swipe Cards */}
                  <div className="relative mb-6">
                    <motion.div
                      animate={isInView ? { x: [0, -10, 0] } : {}}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                      className="bg-primary rounded-2xl p-4 text-primary-foreground"
                    >
                      <div className="text-xs opacity-80 mb-1">Next Appointment</div>
                      <div className="font-semibold">Dec 7, 9:00 AM</div>
                      <div className="text-sm opacity-90">Dr. Sarah Chen - Cardiology</div>
                      {/* Swipe indicator */}
                      <motion.div
                        animate={{ x: [0, 20, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Appointments List */}
                  <div className="mb-4">
                    <div className="text-sm font-medium text-foreground mb-3">Upcoming</div>
                    <div className="space-y-3">
                      {appointments.map((apt, index) => (
                        <motion.div
                          key={apt.name}
                          initial={{ opacity: 0, x: 20 }}
                          animate={isInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ duration: 0.4, delay: 0.5 + index * 0.2 }}
                          className="bg-muted/50 rounded-xl p-3 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {apt.name.split(' ').slice(1).map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{apt.name}</div>
                            <div className="text-xs text-muted-foreground">{apt.time} • {apt.type}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Checkmark Animation */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 1, type: "spring" }}
                    className="bg-green-500/10 rounded-xl p-3 flex items-center gap-3"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={isInView ? { scale: [0, 1.2, 1] } : {}}
                      transition={{ delay: 1.2, duration: 0.4 }}
                      className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                    <div className="text-sm text-foreground">Appointment Confirmed!</div>
                  </motion.div>
                </div>
              </div>

              {/* Floating Feature Icons */}
              {features.map((feature, index) => {
                const positions = [
                  { x: -100, y: 100 },
                  { x: 180, y: 50 },
                  { x: 180, y: 200 },
                ];
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { 
                      opacity: 1, 
                      scale: 1,
                      y: [0, -5, 0]
                    } : {}}
                    transition={{
                      opacity: { duration: 0.4, delay: 0.8 + index * 0.2 },
                      scale: { duration: 0.4, delay: 0.8 + index * 0.2 },
                      y: { duration: 2 + index * 0.3, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute hidden md:flex flex-col items-center"
                    style={{ left: positions[index].x, top: positions[index].y }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-card border-2 border-border shadow-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">{feature.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
              {t('features.mobile.title', 'Access Anywhere, Anytime')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('features.mobile.description', 'Manage your healthcare on the go with our mobile-optimized platform. Book appointments, view records, and communicate with your care team from any device.')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                t('features.mobile.feature1', 'iOS & Android Ready'),
                t('features.mobile.feature2', 'Offline Mode Support'),
                t('features.mobile.feature3', 'Biometric Security'),
                t('features.mobile.feature4', 'Push Notifications'),
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileFriendlySection;
