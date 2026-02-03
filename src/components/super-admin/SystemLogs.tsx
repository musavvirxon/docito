// src/components/super-admin/SystemLogs.tsx
import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Search, Eye } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { listAuditLogs, type AuditLog } from "@/lib/superadminApi";

function formatDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function shortId(v?: string | null) {
  if (!v) return "—";
  if (v.length <= 12) return v;
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

function actionBadgeClass(action?: string | null) {
  const a = (action || "").toLowerCase();
  if (a.includes("approve") || a.includes("verified")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  if (a.includes("reject") || a.includes("decline")) return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
  if (a.includes("login") || a.includes("auth")) return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
  return "bg-muted/40 text-foreground border-border/50";
}

export default function SystemLogs() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = async (nextOffset = 0) => {
    setLoading(true);
    try {
      const res = await listAuditLogs({ limit, offset: nextOffset });
      setLogs(res.data || []);
      setOffset(nextOffset);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load system logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((l) => {
      const a = (l.action_type || "").toLowerCase();
      const e = (l.entity_type || "").toLowerCase();
      const id = (l.entity_id || "").toLowerCase();
      const u = (l.user_id || "").toLowerCase();
      const ip = (l.ip_address || "").toLowerCase();
      const ua = (l.user_agent || "").toLowerCase();
      const d = JSON.stringify(l.details || {}).toLowerCase();
      return a.includes(q) || e.includes(q) || id.includes(q) || u.includes(q) || ip.includes(q) || ua.includes(q) || d.includes(q);
    });
  }, [logs, search]);

  const openDetails = (log: AuditLog) => {
    setSelected(log);
    setOpen(true);
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                System Logs
              </CardTitle>
              <CardDescription>Recent administrative and system activity.</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full lg:w-[360px]">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search action, entity, user, IP, details…"
                  className="pl-9"
                />
              </div>

              <Button variant="outline" className="gap-2" onClick={() => fetchLogs(offset)} disabled={loading}>
                <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Showing <span className="text-foreground font-medium">{filtered.length}</span> of{" "}
              <span className="text-foreground font-medium">{logs.length}</span> records
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || offset === 0}
                onClick={() => fetchLogs(Math.max(0, offset - limit))}
              >
                Prev
              </Button>
              <Button variant="outline" size="sm" disabled={loading || logs.length < limit} onClick={() => fetchLogs(offset + limit)}>
                Next
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[220px]">When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[260px]">Entity</TableHead>
                  <TableHead className="w-[220px]">User</TableHead>
                  <TableHead className="w-[160px]">IP</TableHead>
                  <TableHead className="w-[110px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-sm text-muted-foreground text-center">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-sm text-muted-foreground text-center">
                      No logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm text-foreground">{formatDate(l.created_at)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${actionBadgeClass(l.action_type)}`}>
                          {l.action_type || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground truncate">
                        {(l.entity_type || "—") + (l.entity_id ? ` • ${shortId(l.entity_id)}` : "")}
                      </TableCell>
                      <TableCell className="text-sm text-foreground truncate">{shortId(l.user_id)}</TableCell>
                      <TableCell className="text-sm text-foreground truncate">{l.ip_address || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => openDetails(l)}>
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Log details</DialogTitle>
            <DialogDescription>Full context for the selected entry.</DialogDescription>
          </DialogHeader>

          <Separator />

          {!selected ? (
            <div className="py-10 text-sm text-muted-foreground text-center">No selection.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">When</div>
                  <div className="text-foreground font-medium">{formatDate(selected.created_at)}</div>
                </div>

                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Action</div>
                  <div className="text-foreground font-medium">{selected.action_type || "—"}</div>
                </div>

                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Entity</div>
                  <div className="text-foreground font-medium">
                    {(selected.entity_type || "—") + (selected.entity_id ? ` • ${selected.entity_id}` : "")}
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">User</div>
                  <div className="text-foreground font-medium">{selected.user_id || "—"}</div>
                </div>

                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">IP</div>
                  <div className="text-foreground font-medium">{selected.ip_address || "—"}</div>
                </div>

                <div className="rounded-xl border border-border/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">User agent</div>
                  <div className="text-foreground font-medium truncate">{selected.user_agent || "—"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-medium text-foreground">Details</div>
                  <Badge variant="secondary">JSON</Badge>
                </div>

                <ScrollArea className="h-[320px] pr-3">
                  <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-auto">
                    {JSON.stringify(selected.details ?? {}, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
