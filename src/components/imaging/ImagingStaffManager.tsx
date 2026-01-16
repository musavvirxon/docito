// File: src/components/imaging/ImagingStaffManager.tsx

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StaffRow = {
  id: string;
  imaging_center_id: string;
  user_id: string;
  staff_role: string;
  status: string;
  license_number: string | null;
  specializations: string[] | null;
  can_view_orders: boolean | null;
  can_process_scans: boolean | null;
  can_upload_results: boolean | null;
  can_verify_results: boolean | null;
  can_manage_equipment: boolean | null;
  created_at: string;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

function nameOf(p?: ProfileRow | null) {
  if (!p) return "User";
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "User";
}

interface Props {
  centerId: string;
}

const STAFF_ROLES = ["owner", "admin", "manager", "radiologist", "technician", "assistant", "readonly"];

export default function ImagingStaffManager({ centerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("technician");

  const fetchAll = async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const { data: staffData, error: staffErr } = await supabase
        .from("imaging_staff")
        .select(
          "id, imaging_center_id, user_id, staff_role, status, license_number, specializations, can_view_orders, can_process_scans, can_upload_results, can_verify_results, can_manage_equipment, created_at"
        )
        .eq("imaging_center_id", centerId)
        .order("created_at", { ascending: true });

      if (staffErr) throw staffErr;
      const staffRows = (staffData || []) as StaffRow[];
      setStaff(staffRows);

      const { data: inviteData, error: inviteErr } = await supabase
        .from("staff_invitations")
        .select("id, email, role, status, expires_at, created_at")
        .eq("entity_type", "imaging_center")
        .eq("entity_id", centerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (inviteErr) throw inviteErr;
      setInvites((inviteData || []) as InvitationRow[]);

      const userIds = Array.from(new Set(staffRows.map((s) => s.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, first_name, last_name, email")
          .in("user_id", userIds);

        if (profErr) throw profErr;
        const map: Record<string, ProfileRow> = {};
        for (const p of (profs || []) as ProfileRow[]) map[p.user_id] = p;
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load staff");
      setStaff([]);
      setInvites([]);
      setProfiles({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const canInvite = useMemo(() => inviteEmail.trim().includes("@") && inviteRole.trim().length > 0, [inviteEmail, inviteRole]);

  const createInvite = async () => {
    if (!canInvite) {
      toast.error("Enter a valid email and role");
      return;
    }
    setInviting(true);
    try {
      const { error } = await supabase.from("staff_invitations").insert({
        entity_type: "imaging_center",
        entity_id: centerId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Invitation created");
      setInviteEmail("");
      setInviteRole("technician");
      setInviteOpen(false);
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to invite staff");
    } finally {
      setInviting(false);
    }
  };

  const updateStaffStatus = async (staffId: string, status: string) => {
    try {
      const { error } = await supabase.from("imaging_staff").update({ status }).eq("id", staffId);
      if (error) throw error;
      setStaff((prev) => prev.map((s) => (s.id === staffId ? { ...s, status } : s)));
      toast.success("Staff status updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update staff");
    }
  };

  const updateStaffRole = async (staffId: string, staff_role: string) => {
    try {
      const { error } = await supabase.from("imaging_staff").update({ staff_role }).eq("id", staffId);
      if (error) throw error;
      setStaff((prev) => prev.map((s) => (s.id === staffId ? { ...s, staff_role } : s)));
      toast.success("Role updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update role");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>Staff Directory</CardTitle>
            <CardDescription>Manage your imaging center staff and invitations</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Invite Staff</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
                      Cancel
                    </Button>
                    <Button onClick={createInvite} disabled={!canInvite || inviting}>
                      {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Create Invite
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    This creates a staff invitation record. Your existing accept-invite flow can complete onboarding.
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="py-10 text-center text-muted-foreground">No staff added yet.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  staff.map((s) => {
                    const p = profiles[s.user_id];
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium">{nameOf(p)}</div>
                          <div className="text-xs text-muted-foreground">{p?.email || s.user_id}</div>
                        </TableCell>

                        <TableCell className="w-[240px]">
                          <Select value={s.staff_role} onValueChange={(v) => updateStaffRole(s.id, v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAFF_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="w-[220px]">
                          <Select value={s.status} onValueChange={(v) => updateStaffStatus(s.id, v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">active</SelectItem>
                              <SelectItem value="inactive">inactive</SelectItem>
                              <SelectItem value="suspended">suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">orders: {String(Boolean(s.can_view_orders))}</Badge>
                            <Badge variant="outline">scans: {String(Boolean(s.can_process_scans))}</Badge>
                            <Badge variant="outline">upload: {String(Boolean(s.can_upload_results))}</Badge>
                            <Badge variant="outline">verify: {String(Boolean(s.can_verify_results))}</Badge>
                            <Badge variant="outline">equip: {String(Boolean(s.can_manage_equipment))}</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>Pending invites for this imaging center</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="py-10 text-center text-muted-foreground">No invitations.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.email}</TableCell>
                      <TableCell>{i.role}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === "pending" ? "secondary" : "outline"}>{i.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(i.expires_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
