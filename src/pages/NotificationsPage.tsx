// Path: src/pages/NotificationsPage.tsx
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCheck, RefreshCw, ExternalLink } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { toast } from "sonner";
import PageShell from "@/components/ui/PageShell";

export default function NotificationsPage() {
  const { loading, items, unreadCount, error, refetch, markRead, markAllRead } = useNotifications({
    limit: 100,
    unreadOnly: false,
    autoRefreshMs: 0,
  });

  useRealtimeNotifications({
    enabled: true,
    onChange: () => refetch(),
  });

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = async (id: string, url: string | null) => {
    try {
      await markRead(id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark read");
    }
    if (url) window.location.href = url;
  };

  return (
    <PageShell
      title="Notifications"
      description="Your entity-scoped inbox."
      loading={loading}
      error={error}
      actions={
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? <Badge variant="secondary">{unreadCount} unread</Badge> : null}

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
      }
      empty={{
        show: !loading && !error && items.length === 0,
        title: "No notifications",
        description: "You’ll see updates here when referrals, orders, billing, or verification changes.",
      }}
    >
      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            className={`rounded-lg border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
              n.read_at ? "opacity-80" : ""
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={n.read_at ? "outline" : "secondary"}>{n.level}</Badge>
                {!n.read_at ? <Badge variant="default">new</Badge> : null}
                <div className="font-medium">{n.title}</div>
              </div>
              {n.body ? <div className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</div> : null}
              <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => open(n.id, n.action_url)}>
                Open <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
