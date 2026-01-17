// Path: src/pages/admin/AdminVerificationQueuePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAdminVerification, type VerificationSubmission, type SubmissionStatus } from "@/hooks/useAdminVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

function statusVariant(status: SubmissionStatus) {
  if (status === "approved") return "default";
  if (status === "submitted") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

function prettyEntity(t: string) {
  if (t === "clinic") return "Clinic";
  if (t === "lab") return "Lab";
  if (t === "imaging") return "Imaging";
  if (t === "pharmacy") return "Pharmacy";
  return t;
}

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function AdminVerificationQueuePage() {
  const { loading, list, get, approve, reject } = useAdminVerification();

  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("submitted");
  const [items, setItems] = useState<VerificationSubmission[]>([]);
  const [total, setTotal] = useState(0);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<VerificationSubmission | null>(null);

  const [open, setOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((s) => {
      const hay = [
        s.id,
        s.entity_type,
        s.entity_id,
        s.submitted_by,
        s.status,
        safeStringify(s.payload),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const refresh = async () => {
    try {
      const res = await list({ status: statusFilter, limit: 100, offset: 0 });
      setItems(res.submissions || []);
      setTotal(Number(res.total || 0));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load verification submissions");
      setItems([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openDetails = async (id: string) => {
    try {
      setSelectedId(id);
      const s = await get(id);
      setSelected(s);
      setRejectReason(s.rejection_reason || "");
      setNote("");
      setOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load submission details");
    }
  };

  const doApprove = async () => {
    if (!selectedId) return;
    try {
      await approve(selectedId, note || null);
      toast.success("Approved");
      setOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Approve failed");
    }
  };

  const doReject = async () => {
    if (!selectedId) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      await reject(selectedId, reason, note || null);
      toast.success("Rejected");
      setOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Reject failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Admin Verification Review</CardTitle>
              <CardDescription>Super-admin queue to approve/reject entity verification submissions.</CardDescription>
            </div>

            <Button variant="outline" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Search</div>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by entity, submitter, payload..." />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Total: <span className="font-medium">{total}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No submissions found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => (
                <div key={s.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(s.status) as any}>{s.status}</Badge>
                      <div className="font-medium">
                        {prettyEntity(s.entity_type)} • {s.entity_id}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Submission: {s.id} • Submitted by: {s.submitted_by}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated: {new Date(s.updated_at).toLocaleString()}
                      {s.submitted_at ? ` • Submitted: ${new Date(s.submitted_at).toLocaleString()}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => openDetails(s.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(selected.status) as any}>{selected.status}</Badge>
                    <div className="font-medium">
                      {prettyEntity(selected.entity_type)} • {selected.entity_id}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Submission: {selected.id} • Submitted by: {selected.submitted_by}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Payload (JSON)</div>
                <Textarea value={safeStringify(selected.payload)} readOnly rows={14} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Rejection reason</div>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                    placeholder="Required only when rejecting"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Note to submitter (optional)</div>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="Optional message for submitter"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>

            <Button
              variant="destructive"
              onClick={doReject}
              disabled={!selected || selected.status !== "submitted" || loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>

            <Button
              onClick={doApprove}
              disabled={!selected || selected.status !== "submitted" || loading}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
