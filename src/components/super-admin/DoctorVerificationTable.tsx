import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { CheckCircle, Clock, XCircle, RefreshCw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type VerificationRow = {
  id: string;
  doctor_id: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  verification_data: any;
};

type DoctorRow = {
  id: string;
  user_id: string | null;
  specialty: string | null;
  license_number: string | null;
  verified: boolean | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type JoinedRow = {
  verification: VerificationRow;
  doctor: DoctorRow | null;
  profile: ProfileRow | null;
};

function normalizeStatus(s: string | null | undefined) {
  const v = String(s || "pending").toLowerCase();
  if (v === "declined") return "rejected";
  if (v === "resubmitted") return "pending";
  return v;
}

function statusBadge(status: string | null | undefined) {
  const v = normalizeStatus(status);

  if (v === "verified") {
    return (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    );
  }
  if (v === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Rejected
      </Badge>
    );
  }
  if (v === "under_review") {
    return (
      <Badge className="bg-blue-100 text-blue-800">
        <Clock className="w-3 h-3 mr-1" />
        Under review
      </Badge>
    );
  }

  return (
    <Badge className="bg-yellow-100 text-yellow-800">
      <Clock className="w-3 h-3 mr-1" />
      Pending
    </Badge>
  );
}

function safeDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

export default function DoctorVerificationTable() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<JoinedRow | null>(null);

  const [rejectReason, setRejectReason] = useState<string>("");

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["super-admin-doctor-verifications", statusFilter],
    queryFn: async (): Promise<JoinedRow[]> => {
      let q = supabase
        .from("doctor_verification")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          q = q.in("status", ["pending", "resubmitted"] as any);
        } else if (statusFilter === "rejected") {
          q = q.in("status", ["rejected", "declined"] as any);
        } else {
          q = q.eq("status", statusFilter);
        }
      }

      const { data: verifications, error } = await q;
      if (error) throw error;

      const rows: VerificationRow[] = (verifications as any) || [];
      const doctorIds = rows.map((r) => r.doctor_id).filter(Boolean) as string[];

      if (!doctorIds.length) {
        return rows.map((v) => ({ verification: v, doctor: null, profile: null }));
      }

      const { data: doctors, error: dErr } = await supabase
        .from("doctors")
        .select("id,user_id,specialty,license_number,verified")
        .in("id", doctorIds);
      if (dErr) throw dErr;

      const doctorById = new Map<string, DoctorRow>();
      const userIds: string[] = [];
      (doctors as any[] | null)?.forEach((d) => {
        doctorById.set(d.id, d as DoctorRow);
        if (d.user_id) userIds.push(d.user_id);
      });

      const profileByUserId = new Map<string, ProfileRow>();
      if (userIds.length) {
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("user_id,full_name,email,phone")
          .in("user_id", userIds);
        if (pErr) throw pErr;
        (profiles as any[] | null)?.forEach((p) => profileByUserId.set(p.user_id, p as ProfileRow));
      }

      return rows.map((v) => {
        const doctor = v.doctor_id ? doctorById.get(v.doctor_id) ?? null : null;
        const profile = doctor?.user_id ? profileByUserId.get(doctor.user_id) ?? null : null;
        return { verification: v, doctor, profile };
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data || [];

    return (data || []).filter((r) => {
      const name = String(r.profile?.full_name || "").toLowerCase();
      const email = String(r.profile?.email || "").toLowerCase();
      const phone = String(r.profile?.phone || "").toLowerCase();
      const specialty = String(r.doctor?.specialty || "").toLowerCase();
      const license = String(r.doctor?.license_number || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        specialty.includes(q) ||
        license.includes(q)
      );
    });
  }, [data, search]);

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: {
      verificationId: string;
      doctorId: string | null;
      status: "pending" | "under_review" | "verified" | "rejected";
      rejectionReason?: string | null;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const reviewerId = auth?.user?.id || null;

      const { error: vErr } = await supabase
        .from("doctor_verification")
        .update({
          status: payload.status,
          reviewed_at: payload.status === "pending" ? null : new Date().toISOString(),
          reviewed_by: payload.status === "pending" ? null : reviewerId,
          rejection_reason: payload.status === "rejected" ? payload.rejectionReason || null : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.verificationId);

      if (vErr) throw vErr;

      if (payload.doctorId) {
        const { error: dErr } = await supabase
          .from("doctors")
          .update({
            verified: payload.status === "verified",
          })
          .eq("id", payload.doctorId);

        if (dErr) throw dErr;
      }

      return true;
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Verification status updated." });
      qc.invalidateQueries({ queryKey: ["super-admin-doctor-verifications"] });
      setOpen(false);
      setSelected(null);
      setRejectReason("");
    },
    onError: (e: any) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e?.message || "Unknown error",
      });
    },
  });

  const onOpenRow = (row: JoinedRow) => {
    setSelected(row);
    setRejectReason(row.verification.rejection_reason || "");
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Doctor Verification Requests</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review doctor submissions and approve/reject them.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="w-full md:w-44">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            className="w-full md:w-72"
            placeholder="Search by name/email/phone/specialty/license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <UITableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </UITableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No verification requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const v = row.verification;
                    const doctor = row.doctor;
                    const profile = row.profile;

                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium">
                              {profile?.full_name || "Unknown doctor"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {profile?.email || "—"}{" "}
                              {profile?.phone ? `• ${profile.phone}` : ""}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{doctor?.specialty || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {doctor?.license_number || "—"}
                        </TableCell>
                        <TableCell>{statusBadge(v.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {safeDate(v.submitted_at || v.created_at)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenRow(row)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>

                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  verificationId: v.id,
                                  doctorId: v.doctor_id,
                                  status: "verified",
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelected(row);
                                setRejectReason("");
                                setOpen(true);
                              }}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-muted-foreground">No selection.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {selected.profile?.full_name || "Unknown doctor"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selected.profile?.email || "—"}{" "}
                      {selected.profile?.phone ? `• ${selected.profile.phone}` : ""}
                    </div>
                  </div>
                  {statusBadge(selected.verification.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Specialty: </span>
                    <span>{selected.doctor?.specialty || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">License #: </span>
                    <span className="font-mono">{selected.doctor?.license_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted: </span>
                    <span>{safeDate(selected.verification.submitted_at || selected.verification.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated: </span>
                    <span>{safeDate(selected.verification.updated_at)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <Label className="font-medium">Rejection reason (required for Reject)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this was rejected (missing license, unclear ID, etc.)"
                />
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <Label className="font-medium">Raw verification payload</Label>
                <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-auto max-h-64">
                  {JSON.stringify(selected.verification.verification_data ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSelected(null);
                setRejectReason("");
              }}
            >
              Close
            </Button>

            {selected ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      verificationId: selected.verification.id,
                      doctorId: selected.verification.doctor_id,
                      status: "under_review",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Mark under review
                </Button>

                <Button
                  onClick={() =>
                    updateStatusMutation.mutate({
                      verificationId: selected.verification.id,
                      doctorId: selected.verification.doctor_id,
                      status: "verified",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      toast({
                        variant: "destructive",
                        title: "Rejection reason required",
                        description: "Please provide a reason before rejecting.",
                      });
                      return;
                    }
                    updateStatusMutation.mutate({
                      verificationId: selected.verification.id,
                      doctorId: selected.verification.doctor_id,
                      status: "rejected",
                      rejectionReason: rejectReason.trim(),
                    });
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
