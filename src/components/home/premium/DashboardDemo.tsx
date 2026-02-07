// src/components/home/premium/DashboardDemo.tsx
import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const stats = [
  {
    icon: Calendar,
    label: "Appointments",
    value: "—",
    change: "Preview",
    trend: "up" as const,
  },
  {
    icon: Users,
    label: "Patients",
    value: "—",
    change: "Example",
    trend: "up" as const,
  },
  {
    icon: DollarSign,
    label: "Revenue",
    value: "—",
    change: "Sample",
    trend: "down" as const,
  },
];

const activityItems = [
  {
    type: "Appointment",
    patient: "Patient check-in",
    time: "Just now",
    status: "Scheduled",
  },
  {
    type: "Message",
    patient: "Lab result received",
    time: "A moment ago",
    status: "Updated",
  },
  {
    type: "Billing",
    patient: "Invoice generated",
    time: "Recently",
    status: "Processed",
  },
];

export default function DashboardDemo() {
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
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Dashboard preview
            </span>
          </div>

          <h2 className="text-4xl font-bold mb-6">
            Powerful visibility{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              without spreadsheets
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See appointments, patient flow, and operations at a glance — with activity and next steps
            in one place. (Preview data shown.)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-white/50 border border-primary/10 rounded-3xl p-8 backdrop-blur-sm shadow-xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">Clinic Operations</h3>
                <p className="text-muted-foreground">
                  Live dashboard view (preview)
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Active</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="p-6 bg-white/60 rounded-2xl border border-primary/10 hover:bg-white/80 transition-colors duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        stat.trend === "up"
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {stat.trend === "up" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                      {stat.change}
                    </div>
                  </div>

                  <div>
                    <p className="text-3xl font-bold mb-1">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Activity feed */}
            <div className="bg-white/60 rounded-2xl border border-primary/10 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5 text-primary" />
                <h4 className="text-lg font-bold">Recent activity</h4>
              </div>

              <div className="space-y-4">
                {activityItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-primary/5 hover:bg-white/70 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.patient}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium">{item.time}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.status}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
