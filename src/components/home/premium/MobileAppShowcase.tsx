import { motion } from 'framer-motion';
import { Smartphone, Bell, Calendar, FileText, Shield, Zap } from 'lucide-react';

const appFeatures = [
  { icon: Calendar, label: 'Book Appointments' },
  { icon: FileText, label: 'View Records' },
  { icon: Bell, label: 'Get Reminders' },
  { icon: Shield, label: 'Secure Access' },
  { icon: Zap, label: 'Fast & Easy' },
];

export default function MobileAppShowcase() {
  return (
    <section className="py-24 bg-gradient-to-b from-violet-500/5 via-background to-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium mb-6">
              <Smartphone className="w-4 h-4" />
              Mobile App
            </div>
            
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-6">
              Healthcare in
              <br />
              <span className="font-normal text-primary">Your Pocket</span>
            </h2>
            
            <p className="text-lg text-muted-foreground font-light mb-8 leading-relaxed">
              Manage your health on the go. Book appointments, access records, 
              and stay connected with your care team — all from your smartphone.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {appFeatures.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50"
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{feature.label}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-black text-white cursor-pointer"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div>
                  <div className="text-[10px] opacity-80">Download on the</div>
                  <div className="text-sm font-semibold -mt-0.5">App Store</div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-black text-white cursor-pointer"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.27 1.31zM6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z"/>
                </svg>
                <div>
                  <div className="text-[10px] opacity-80">GET IT ON</div>
                  <div className="text-sm font-semibold -mt-0.5">Google Play</div>
                </div>
              </motion.div>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Coming Soon — Join 50,000+ on the waitlist
            </p>
          </motion.div>

          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative flex justify-center"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-primary/30 blur-3xl scale-150 opacity-50" />
              
              {/* Phone frame */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-64 h-[520px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-2 shadow-2xl"
              >
                {/* Screen */}
                <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative">
                  {/* Status bar */}
                  <div className="absolute top-0 left-0 right-0 h-8 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-20 h-5 bg-black rounded-full" />
                  </div>
                  
                  {/* App content mockup */}
                  <div className="pt-12 px-4 space-y-4">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-2">
                        <span className="text-primary font-bold">D</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">Good morning!</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Upcoming</p>
                      <p className="text-sm font-medium text-foreground">Dr. Sarah Mitchell</p>
                      <p className="text-xs text-primary">Today, 2:30 PM</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-primary/10 text-center">
                        <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-xs font-medium">Book</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
                        <FileText className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-xs font-medium">Records</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20">
                      <p className="text-xs font-medium text-foreground">Health Score</p>
                      <p className="text-2xl font-bold text-primary">92</p>
                      <p className="text-xs text-muted-foreground">Excellent</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -15, 0], x: [0, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -top-4 -right-8 p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
              >
                <Bell className="w-5 h-5" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-8 p-3 rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-500/30"
              >
                <Calendar className="w-5 h-5" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
