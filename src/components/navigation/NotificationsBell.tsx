// Path: src/components/navigation/NotificationsBell.tsx
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export default function NotificationsBell() {
  const { loading, unreadCount, refetch } = useNotifications({ limit: 25, unreadOnly: false, autoRefreshMs: 0 });

  useRealtimeNotifications({
    enabled: true,
    onChange: () => refetch(),
  });

  // Initial fetch already happens in hook; this is to keep unread count stable if component mounts late.
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Button variant="ghost" size="sm" className="relative" onClick={() => (window.location.href = "/notifications")}>
      <Bell className="h-5 w-5" />
      {!loading && unreadCount > 0 ? (
        <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs">{unreadCount}</Badge>
      ) : null}
    </Button>
  );
}
