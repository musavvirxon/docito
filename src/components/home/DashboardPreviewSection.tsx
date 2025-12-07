import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Bell, MessageSquare, Calendar, TrendingUp, Users, Activity } from "lucide-react";

const DashboardPreviewSection = () => {
  const { t } = useTranslation('home');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const patients = [
    { name: "Sarah Johnson", time: "9:00 AM", status: "confirmed" },
    { name: "Michael Chen", time: "10:30 AM", status: "pending" },
    { name: "Emily Davis", time: "11:00 AM", status: "confirmed" },
    { name: "James Wilson", time: "2:00 PM", status: "confirmed" },
  ];

  return (
    <section ref={ref} className="py-24 bg-muted/30 dark:bg-muted/10 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {t('features.dashboardPreview.title', 'Powerful Dashboard')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('features.dashboardPreview.subtitle', 'Everything you need to manage your practice in one place')}
          </p>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-card rounded-3xl border-2 border-border shadow-2xl overflow-hidden dark:shadow-glow-blue">
            {/* Dashboard Header */}
            <div className="bg-muted/50 dark:bg-muted/30 px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-sm text-muted-foreground">Docito Dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Pulsing notification */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                </motion.div>
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Users, label: "Patients", value: "1,247", change: "+12%" },
                  { icon: Calendar, label: "Today", value: "18", change: "+3" },
                  { icon: TrendingUp, label: "Revenue", value: "$24.5k", change: "+8%" },
                  { icon: Activity, label: "Rating", value: "4.9", change: "★" },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    className="bg-muted/30 dark:bg-muted/20 rounded-xl p-4"
                  >
                    <stat.icon className="w-5 h-5 text-primary mb-2" />
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className="text-xs text-green-500">{stat.change}</span>
                    </div>
                  </motion.div>
                ))}

                {/* Chart */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="col-span-2 md:col-span-4 bg-muted/30 dark:bg-muted/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-foreground">Weekly Overview</span>
                    <span className="text-xs text-muted-foreground">Last 7 days</span>
                  </div>
                  <div className="flex items-end justify-between h-24 gap-2">
                    {[40, 65, 45, 80, 55, 70, 90].map((height, index) => (
                      <motion.div
                        key={index}
                        initial={{ height: 0 }}
                        animate={isInView ? { height: `${height}%` } : {}}
                        transition={{ duration: 0.6, delay: 1 + index * 0.1, ease: "easeOut" }}
                        className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t-md"
                      />
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Patient List */}
              <div className="bg-muted/30 dark:bg-muted/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-foreground">Today's Patients</span>
                  <span className="text-xs text-primary cursor-pointer">View all</span>
                </div>
                <div className="space-y-3">
                  {patients.map((patient, index) => (
                    <motion.div
                      key={patient.name}
                      initial={{ opacity: 0, x: 30 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.6 + index * 0.15 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{patient.name}</div>
                        <div className="text-xs text-muted-foreground">{patient.time}</div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        patient.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreviewSection;
