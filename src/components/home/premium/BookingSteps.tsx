import { motion } from 'framer-motion';
import { Search, UserCheck, CalendarCheck, HeartPulse } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Search',
    description: 'Find doctors, labs, or pharmacies by specialty, location, or insurance',
    icon: Search,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: '02',
    title: 'Select',
    description: 'Compare providers, check ratings, reviews and available time slots',
    icon: UserCheck,
    color: 'from-violet-500 to-purple-500'
  },
  {
    number: '03',
    title: 'Book',
    description: 'Schedule your appointment instantly with real-time confirmation',
    icon: CalendarCheck,
    color: 'from-emerald-500 to-green-500'
  },
  {
    number: '04',
    title: 'Get Care',
    description: 'Visit your provider and manage all follow-ups through the platform',
    icon: HeartPulse,
    color: 'from-rose-500 to-pink-500'
  },
];

export default function BookingSteps() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Healthcare in 4 Simple Steps
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            From search to care, we've made healthcare access effortless
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2" />
          
          {/* Animated progress line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="hidden lg:block absolute top-1/2 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-rose-500 -translate-y-1/2 origin-left"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Icon circle */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.2, type: 'spring' }}
                    className="relative mb-6"
                  >
                    {/* Outer glow */}
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} opacity-20 blur-xl scale-150`} />
                    
                    {/* Main circle */}
                    <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${step.color} p-[2px]`}>
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <step.icon className="w-10 h-10 text-foreground" />
                      </div>
                    </div>

                    {/* Step number */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.15 + 0.4 }}
                      className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                    >
                      {index + 1}
                    </motion.div>
                  </motion.div>

                  {/* Content */}
                  <motion.h3
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.15 + 0.3 }}
                    className="text-2xl font-semibold text-foreground mb-3"
                  >
                    {step.title}
                  </motion.h3>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.15 + 0.4 }}
                    className="text-muted-foreground font-light leading-relaxed"
                  >
                    {step.description}
                  </motion.p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
