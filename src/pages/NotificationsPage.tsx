import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCheck, RefreshCw, ExternalLink } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function NotificationsPage() {
  const { t } = useTranslation('common');
  const { loading, items, unreadCount, refetch, markRead, markAllRead } = useNotifications({
    limit: 200,
    unreadOnly: false,
  });

  useRealtimeNotifications({
    enabled: true,
    onChange: () => refetch(),
  });

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = async (id: string, relatedId: string | null) => {
    try {
      await markRead(id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark read");
    }
    if (relatedId) window.location.href = relatedId;
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              Notifications {unreadCount > 0 ? <Badge variant="secondary">{unreadCount} unread</Badge> : null}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={refetch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await markAllRead();
                    toast.success("All marked as read");
                  } catch (e: any) {
                    toast.error(e?.message || "Failed");
                  }
                }}
                disabled={loading || unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No notifications.</div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                    n.is_read ? "opacity-80" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={n.is_read ? "outline" : "secondary"}>{n.type || "info"}</Badge>
                      {!n.is_read ? <Badge variant="default">new</Badge> : null}
                      <div className="font-medium">{n.title}</div>
                    </div>
                    {n.message ? <div className="text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</div> : null}
                    <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => open(n.id, n.related_id)}>
                      Open <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
