import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Calendar, CreditCard, Shield, Settings } from "lucide-react";

interface ActivityFeedProps {
  showAll?: boolean;
}

const activities = [
  {
    icon: UserPlus,
    title: "New Doctor Registered",
    description: "Dr. Sarah Johnson joined the platform",
    time: "5 minutes ago",
    color: "text-blue-500",
  },
  {
    icon: Calendar,
    title: "Appointment Booked",
    description: "John Doe booked with Dr. Smith",
    time: "12 minutes ago",
    color: "text-green-500",
  },
  {
    icon: CreditCard,
    title: "Payment Processed",
    description: "$150 payment completed",
    time: "23 minutes ago",
    color: "text-yellow-500",
  },
  {
    icon: Shield,
    title: "Practice Verified",
    description: "City Medical Center approved",
    time: "1 hour ago",
    color: "text-purple-500",
  },
  {
    icon: Settings,
    title: "System Update",
    description: "Security patches applied",
    time: "2 hours ago",
    color: "text-gray-500",
  },
  {
    icon: UserPlus,
    title: "New Patient Signed Up",
    description: "Emma Wilson created an account",
    time: "3 hours ago",
    color: "text-blue-500",
  },
];

const ActivityFeed = ({ showAll = false }: ActivityFeedProps) => {
  const displayedActivities = showAll ? activities : activities.slice(0, 5);

  return (
    <Card className="border-2 border-border">
      <CardHeader className="border-b-2 border-border">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={showAll ? "h-[600px]" : "h-[400px]"}>
          <div className="p-6 space-y-4">
            {displayedActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent/5 transition-colors border-l-4 border-transparent hover:border-primary"
                >
                  <div className={`p-2 rounded-lg bg-accent/10 ${activity.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
