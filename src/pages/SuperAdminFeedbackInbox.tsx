import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, RefreshCcw } from "lucide-react";

type Status = "new" | "working" | "done";
type Kind = "bug" | "feature";

type Row = {
  id: string;
  created_at: string;
  kind: Kind;
  role: string;
  subject: string;
  description: string;
  upvotes_count: number;
  status: Status;
  page_path: string | null;
  language: string | null;
};

const statusVariant = (s: Status) => (s === "done" ? "secondary" : s === "working" ? "default" : "outline");

export default function SuperAdminFeedbackInbox() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("feedback_requests")
        .select("*")
        .order("upvotes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message ?? "Check RLS for select." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id: string, status: Status) => {
    try {
      const { error } = await (supabase as any).from("feedback_requests").update({ status }).eq("id", id);
      if (error) throw error;

      toast({ title: "Updated", description: `Marked as ${status}.` });
      await load();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e?.message ?? "Ensure super_admin update policy is installed.",
      });
    }
  };

  const grouped = useMemo(() => {
    const byStatus: Record<Status, Row[]> = { new: [], working: [], done: [] };
    for (const r of rows) byStatus[r.status].push(r);
    return byStatus;
  }, [rows]);

  const Section = ({ title, status }: { title: string; status: Status }) => (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Badge variant={statusVariant(status)}>{grouped[status].length}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground py-6">Loading…</div>
        ) : grouped[status].length === 0 ? (
          <div className="text-sm text-muted-foreground py-6">No items.</div>
        ) : (
          grouped[status].map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 p-4 bg-card">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline">{r.kind === "bug" ? "Bug" : "Feature"}</Badge>
                    <Badge variant="outline">{r.role}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {r.upvotes_count}
                    </Badge>
                  </div>
                  <div className="font-semibold text-foreground">{r.subject}</div>
                  <div className="text-sm text-muted-foreground">{r.description}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {r.page_path ? <span>Page: <span className="font-mono">{r.page_path}</span></span> : null}
                    {r.language ? <span>Lang: <span className="font-mono">{r.language}</span></span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {status !== "new" && (
                    <Button variant="outline" onClick={() => setStatus(r.id, "new")}>
                      Mark New
                    </Button>
                  )}
                  {status !== "working" && (
                    <Button onClick={() => setStatus(r.id, "working")}>
                      Mark Working
                    </Button>
                  )}
                  {status !== "done" && (
                    <Button variant="secondary" onClick={() => setStatus(r.id, "done")}>
                      Mark Done
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feedback Inbox</h1>
            <p className="text-muted-foreground mt-1">
              Sorted globally by upvotes. Mark items as <b>Working</b> or <b>Done</b>.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-6">
          <Section title="New" status="new" />
          <Section title="Working On" status="working" />
          <Section title="Done" status="done" />
        </div>
      </div>
    </div>
  );
}
