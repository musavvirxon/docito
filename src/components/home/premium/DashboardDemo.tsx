import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Calendar, Users, TrendingUp, Clock, 
  Bell, Activity, CheckCircle 
} from 'lucide-react';

const mockWidgets = [
  { icon: Calendar, label: 'Appointments', value: '24', change: '+12%', color: 'text-blue-500' },
  { icon: Users, label: 'Patients', value: '1,247', change: '+8%', color: 'text-emerald-500' },
  { icon: TrendingUp, label: 'Revenue', value: '$48.2K', change: '+23%', color: 'text-violet-500' },
  { icon: Clock, label: 'Avg. Wait', value: '8 min', change: '-15%', color: 'text-amber-500' },
];

const recentActivity = [
  { type: 'appointment', text: 'New appointment booked', time: '2 min ago' },
  { type: 'message', text: 'Patient message received', time: '5 min ago' },
  { type: 'payment', text: 'Payment processed', time: '12 min ago' },
  { type: 'record', text: 'Lab results uploaded', time: '18 min ago' },
];

export default function DashboardDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  return (
    <section className="py-24 bg-muted/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Powerful Dashboard
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Everything at your fingertips. Manage your practice with precision.
          </p>
        </motion.div>

        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          {/* Dashboard mockup */}
          <div className="bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden">
            {/* Top bar */}
            <div className="h-12 bg-muted/50 border-b border-border/50 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-lg bg-background/50 text-xs text-muted-foreground">
                  dashboard.docito.com
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* Stats widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {mockWidgets.map((widget, index) => (
                  <motion.div
                    key={widget.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="p-4 rounded-2xl bg-background border border-border/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <widget.icon className={`w-5 h-5 ${widget.color}`} />
                      <span className="text-xs text-muted-foreground">{widget.label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-semibold text-foreground">
                        {widget.value}
                      </span>
                      <span className={`text-xs ${widget.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {widget.change}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart placeholder */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="lg:col-span-2 p-6 rounded-2xl bg-background border border-border/50"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-foreground">Weekly Overview</h3>
                    <Activity className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex items-end justify-between h-40 gap-2">
                    {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={isInView ? { height: `${height}%` } : {}}
                        transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t-lg"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                </motion.div>

                {/* Recent activity */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="p-6 rounded-2xl bg-background border border-border/50"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-foreground">Recent Activity</h3>
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 10 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{activity.text}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="absolute -top-4 -right-4 md:-right-8 p-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          >
            <CheckCircle className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
