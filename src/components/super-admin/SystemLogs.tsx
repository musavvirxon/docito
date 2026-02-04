// File: src/components/super-admin/SystemLogs.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { RefreshCcw, FileText, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AuditLogRow = {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
};

function safeDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function toPreviewJson(v: any) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function severityFromAction(action: string) {
  const a = (action || "").toLowerCase();
  if (a.includes("delete") || a.includes("disable") || a.includes("ban") || a.includes("revoke")) {
    return { label: "High", className: "bg-red-100 text-red-800" };
  }
  if (a.includes("update") || a.includes("approve") || a.includes("reject") || a.includes("role")) {
    return { label: "Medium", className: "bg-yellow-100 text-yellow-800" };
  }
  return { label: "Info", className: "bg-blue-100 text-blue-800" };
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((l) => {
      const hay = [
        l.action,
        l.user_id ?? "",
        l.entity_type ?? "",
        l.entity_id ?? "",
        toPreviewJson(l.details),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [logs, search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("entity_audit_logs")
        .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) throw error;

      // Map to expected shape
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.actor_id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        details: row.metadata,
        created_at: row.created_at,
      }));

      setLogs(mapped as AuditLogRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load system logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = (row: AuditLogRow) => {
    setSelected(row);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
          <p className="text-muted-foreground mt-1">
            Audit trail of important administrative actions across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Audit Logs
          </CardTitle>

          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by action, user, entity, or details..."
                className="pl-9"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span>
              {logs.length !== filtered.length ? (
                <>
                  {" "}
                  of <span className="font-medium text-foreground">{logs.length}</span>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading logs...
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No logs found.</div>
          ) : (
            <ScrollArea className="h-[520px] pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">When</TableHead>
                    <TableHead className="w-[110px]">Severity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[170px]">Entity</TableHead>
                    <TableHead className="w-[240px]">User</TableHead>
                    <TableHead className="text-right w-[120px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const sev = severityFromAction(row.action);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {safeDate(row.created_at)}
                        </TableCell>

                        <TableCell>
                          <Badge className={sev.className}>{sev.label}</Badge>
                        </TableCell>

                        <TableCell className="font-medium">{row.action}</TableCell>

                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {row.entity_type ? row.entity_type : "—"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {row.entity_id ? row.entity_id : "—"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          <span className="truncate inline-block max-w-[220px]">
                            {row.user_id ? row.user_id : "—"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetails(row)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              Review the full payload captured for this audit event.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">When</div>
                    <div className="font-medium">{safeDate(selected.created_at)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Action</div>
                    <div className="font-medium">{selected.action}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">User</div>
                    <div className="font-medium truncate">{selected.user_id || "—"}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Details JSON</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[360px]">
                    <pre className="text-xs bg-muted/40 border border-border rounded-lg p-4 overflow-auto">
                      {toPreviewJson(selected.details)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
