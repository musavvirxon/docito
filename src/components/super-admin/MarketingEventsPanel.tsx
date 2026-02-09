// File: src/components/super-admin/MarketingEventsPanel.tsx

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, RefreshCw, Search, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MarketingEventRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  event_name: string;
  page_path: string | null;
  referrer: string | null;
  ip: string | null;
  meta: Record<string, unknown> | null;
};

const PAGE_SIZE = 50;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return '"' + s.split('"').join('""') + '"';
}

function toIsoStart(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toISOString();
}

function toIsoEndExclusive(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export default function MarketingEventsPanel() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [eventName, setEventName] = useState("");
  const [pagePath, setPagePath] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);

  const debouncedSearch = useDebounce(search, 300);

  const queryKey = useMemo(
    () => [
      "marketing-events",
      { debouncedSearch, eventName, pagePath, fromDate, toDate, page },
    ],
    [debouncedSearch, eventName, pagePath, fromDate, toDate, page]
  );

  const eventsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = (supabase as any)
        .from("marketing_events")
        .select("id,created_at,user_id,event_name,page_path,referrer,ip,meta", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (eventName.trim()) q = q.ilike("event_name", `%${eventName.trim()}%`);
      if (pagePath.trim()) q = q.ilike("page_path", `%${pagePath.trim()}%`);
      if (fromDate) q = q.gte("created_at", toIsoStart(fromDate));
      if (toDate) q = q.lt("created_at", toIsoEndExclusive(toDate));

      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        q = q.or(
          `event_name.ilike.%${s}%,page_path.ilike.%${s}%,referrer.ilike.%${s}%`
        );
      }

      const { data, error, count } = await q;
      if (error) throw error;

      return {
        rows: (data as MarketingEventRow[]) ?? [],
        total: count ?? 0,
      };
    },
  });

  const total = eventsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("marketing_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Event deleted");
      await queryClient.invalidateQueries({ queryKey: ["marketing-events"] });
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const purgeMutation = useMutation({
    mutationFn: async (cutoffDate: string) => {
      const cutoff = toIsoStart(cutoffDate);
      const { error } = await (supabase as any)
        .from("marketing_events")
        .delete()
        .lt("created_at", cutoff);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Purge completed");
      await queryClient.invalidateQueries({ queryKey: ["marketing-events"] });
    },
    onError: (e: any) => toast.error(e?.message || "Purge failed"),
  });

  const exportCsv = async () => {
    try {
      let q = (supabase as any)
        .from("marketing_events")
        .select("id,created_at,user_id,event_name,page_path,referrer,ip,meta")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (eventName.trim()) q = q.ilike("event_name", `%${eventName.trim()}%`);
      if (pagePath.trim()) q = q.ilike("page_path", `%${pagePath.trim()}%`);
      if (fromDate) q = q.gte("created_at", toIsoStart(fromDate));
      if (toDate) q = q.lt("created_at", toIsoEndExclusive(toDate));

      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        q = q.or(
          `event_name.ilike.%${s}%,page_path.ilike.%${s}%,referrer.ilike.%${s}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data as MarketingEventRow[]) ?? [];
      const header = [
        "created_at",
        "event_name",
        "page_path",
        "user_id",
        "ip",
        "referrer",
        "meta",
        "id",
      ].join(",");

      const lines = rows.map((r) =>
        [
          csvEscape(r.created_at),
          csvEscape(r.event_name),
          csvEscape(r.page_path),
          csvEscape(r.user_id),
          csvEscape(r.ip),
          csvEscape(r.referrer),
          csvEscape(r.meta),
          csvEscape(r.id),
        ].join(",")
      );

      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marketing-events-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(rows.length ? `Exported ${rows.length} rows` : "No rows to export");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };

  const askDelete = (row: MarketingEventRow) => {
    const ok = window.confirm(`Delete event "${row.event_name}"?`);
    if (!ok) return;
    deleteMutation.mutate(row.id);
  };

  const askPurge = () => {
    if (!fromDate) {
      toast.error("Pick a cutoff date first");
      return;
    }
    const ok = window.confirm(
      `Purge all events before ${fromDate}? This cannot be undone.`
    );
    if (!ok) return;
    purgeMutation.mutate(fromDate);
  };

  return (
    <Card className="border-2 border-border hover:border-primary transition-colors">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Marketing Events</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search (event, path, referrer)"
                className="pl-9"
              />
            </div>
          </div>

          <Input
            value={eventName}
            onChange={(e) => {
              setEventName(e.target.value);
              setPage(0);
            }}
            placeholder="Event name"
          />

          <Input
            value={pagePath}
            onChange={(e) => {
              setPagePath(e.target.value);
              setPage(0);
            }}
            placeholder="Page path"
          />

          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            aria-label="From date"
          />

          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            aria-label="To date"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => eventsQuery.refetch()}
            disabled={eventsQuery.isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${eventsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          <Button
            variant="destructive"
            onClick={askPurge}
            disabled={purgeMutation.isPending}
            className="gap-2"
            title="Purge events before the selected From date"
          >
            <Trash2 className="w-4 h-4" />
            Purge before From
          </Button>

          <div className="flex-1" />

          <div className="text-sm text-muted-foreground">
            Showing {eventsQuery.data?.rows?.length ?? 0} of {total}
          </div>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="hidden lg:table-cell">Referrer</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {eventsQuery.isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading events...
                  </TableCell>
                </TableRow>
              )}

              {eventsQuery.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    {(eventsQuery.error as any)?.message || "Failed to load events"}
                  </TableCell>
                </TableRow>
              )}

              {!eventsQuery.isLoading &&
                !eventsQuery.isError &&
                (eventsQuery.data?.rows?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No events yet.
                    </TableCell>
                  </TableRow>
                )}

              {(eventsQuery.data?.rows ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {row.event_name}
                    </Badge>
                  </TableCell>

                  <TableCell className="max-w-[240px] truncate">
                    {row.page_path || <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  <TableCell className="max-w-[240px] truncate font-mono text-xs">
                    {row.user_id ? (
                      row.user_id
                    ) : (
                      <span className="text-muted-foreground">anonymous</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell max-w-[280px] truncate">
                    {row.referrer || <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => askDelete(row)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || eventsQuery.isFetching}
          >
            Prev
          </Button>

          <span className="font-mono text-xs">
            Page {page + 1} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || eventsQuery.isFetching}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
