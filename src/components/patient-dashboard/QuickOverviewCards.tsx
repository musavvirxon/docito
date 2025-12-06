import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Pill, DollarSign, User, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

interface OverviewStats {
  nextAppointment: {
    date?: string;
    doctor?: string;
    reason?: string;
  } | null;
  lastVisit: {
    date?: string;
    summary?: string;
    diagnosis?: string;
  } | null;
  activePrescriptions: number;
  outstandingBalance: number;
}

interface QuickOverviewCardsProps {
  stats: OverviewStats;
}

const QuickOverviewCards = ({ stats }: QuickOverviewCardsProps) => {
  const cards = [
    {
      title: "Next Appointment",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
      content: stats.nextAppointment ? (
        <div>
          <p className="text-lg font-bold">
            {stats.nextAppointment.date
              ? new Date(stats.nextAppointment.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </p>
          {stats.nextAppointment.doctor && (
            <p className="text-xs text-muted-foreground truncate">
              {stats.nextAppointment.doctor}
            </p>
          )}
          {stats.nextAppointment.reason && (
            <p className="text-xs text-muted-foreground truncate">
              {stats.nextAppointment.reason}
            </p>
          )}
        </div>
      ) : (
        <p className="text-lg font-bold text-muted-foreground">No upcoming</p>
      ),
    },
    {
      title: "Last Visit",
      icon: Clock,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      content: stats.lastVisit ? (
        <div>
          <p className="text-lg font-bold">
            {stats.lastVisit.date
              ? new Date(stats.lastVisit.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </p>
          {stats.lastVisit.diagnosis && (
            <p className="text-xs text-muted-foreground truncate">
              {stats.lastVisit.diagnosis}
            </p>
          )}
        </div>
      ) : (
        <p className="text-lg font-bold text-muted-foreground">No visits yet</p>
      ),
    },
    {
      title: "Active Prescriptions",
      icon: Pill,
      color: "text-accent",
      bgColor: "bg-accent/10",
      content: (
        <div>
          <p className="text-2xl font-bold">{stats.activePrescriptions}</p>
          <p className="text-xs text-muted-foreground">
            {stats.activePrescriptions === 1 ? "medication" : "medications"}
          </p>
        </div>
      ),
    },
    {
      title: "Outstanding Balance",
      icon: DollarSign,
      color: stats.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600",
      bgColor: stats.outstandingBalance > 0 ? "bg-amber-100 dark:bg-amber-900/20" : "bg-emerald-100 dark:bg-emerald-900/20",
      content: (
        <div>
          <p className="text-2xl font-bold">
            ${stats.outstandingBalance.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.outstandingBalance === 0 ? "All paid" : "Amount due"}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 md:p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>{card.content}</CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default QuickOverviewCards;
