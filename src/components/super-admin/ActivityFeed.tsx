// src/components/super-admin/ActivityFeed.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSystemLogs } from "@/hooks/useSuperAdminData";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  showAll?: boolean;
}

const ActivityFeed = ({ showAll = false }: ActivityFeedProps) => {
  const { data: logs, isLoading } = useSystemLogs(showAll ? 100 : 10);

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      login: "signed in",
      signup: "created account",
      verification_approved: "approved verification",
      verification_rejected: "rejected verification",
      verification_updated: "updated verification",
      payment: "processed payment",
      appointment_created: "created appointment",
      appointment_updated: "updated appointment",
      appointment_cancelled: "cancelled appointment",
    };
    return labels[actionType] || actionType.replace(/_/g, " ");
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("approved") || actionType.includes("completed")) return "text-green-600";
    if (actionType.includes("rejected") || actionType.includes("cancelled")) return "text-red-600";
    if (actionType.includes("pending") || actionType.includes("updated")) return "text-yellow-600";
    return "text-blue-600";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system activities and updates</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest system activities and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className={showAll ? "h-[600px]" : "h-[400px]"}>
          <div className="space-y-4">
            {logs && logs.length > 0 ? (
              logs.map((log: any) => {
                const actionType = String(log.action_type ?? log.action ?? "unknown");
                return (
                  <div key={String(log.id)} className="flex items-start gap-4 pb-3 border-b last:border-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {log.profiles?.full_name
                          ? log.profiles.full_name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                          : "SY"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{log.profiles?.full_name || "System"}</span>{" "}
                        <span className={getActionColor(actionType)}>{getActionLabel(actionType)}</span>
                        {log.details?.entity_name && (
                          <span className="text-muted-foreground"> {" "}- {log.details.entity_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                      {log.entity_type && (
                        <p className="text-xs text-muted-foreground">
                          Type: <span className="font-medium">{log.entity_type}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No activity logs yet</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
