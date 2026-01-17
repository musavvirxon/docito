// File: src/components/imaging/ImagingStaffManager.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, UserPlus, Copy, Check, XCircle, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type ImagingStaffRow = {
  id: string;
  imaging_center_id: string;
  user_id: string;
  staff_role: string;
  status: string;
  license_number: string | null;
  specializations: string[] | null;
  can_view_orders: boolean;
  can_process_scans: boolean;
  can_upload_results: boolean;
  can_verify_results: boolean;
  can_manage_equipment: boolean;
  created_at: string;
};

type InviteRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: string;
  invite_type: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
  permissions?: Record<string, any>;
};

function displayName(p?: ProfileRow | null, fallbackEmail?: string | null) {
  if (!p) return fallbackEmail || "User";
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || fallbackEmail || "User";
}

const STAFF_ROLES = [
  { value: "technologist", label: "Imaging Technologist" },
  { value: "radiologist", label: "Radiologist" },
  { value: "reception", label: "Front Desk" },
  { value: "admin", label: "Administrator" },
];

const STAFF_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

interface Props {
  imagingCenterId: string;
}

export default function ImagingStaffManager({ imagingCenterId }: Props) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<ImagingStaffRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  const [tab, setTab] = useState<"staff" | "invites">("staff");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("technologist");
  const [inviteMessage, setInviteMessage] = useState("");

  const [permViewOrders, setPermViewOrders] = useState(true);
  const [permProcessScans, setPermProcessScans] = useState(false);
  const [permUpload, setPermUpload] = useState(false);
  const [permVerify, setPermVerify] = useState(false);
  const [permEquipment, setPermEquipment] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canInvite = useMemo(
    () => inviteEmail.trim().includes("@") && inviteRole.trim().length > 0,
    [inviteEmail, inviteRole],
  );

  const fetchAll = async () => {
    if (!imagingCenterId) return;
    setLoading(true);
    try {
      const [{ data: staffResp, error: staffErr }, { data: inviteResp, error: inviteErr }] = await Promise.all([
        supabase.functions.invoke("staff-management", {
          body: { action: "list_staff", entityType: "imaging_center", entityId: imagingCenterId },
        }),
        supabase.functions.invoke("staff-management", {
          body: { action: "list_invites", entityType: "imaging_center", entityId: imagingCenterId },
        }),
      ]);

      if (staffErr) throw staffErr;
      if (inviteErr) throw inviteErr;

      setStaff((staffResp?.staff || []) as ImagingStaffRow[]);
      setInvites((inviteResp?.invitations || []) as InviteRow[]);
      setProfiles((staffResp?.profiles || {}) as Record<string, ProfileRow>);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to load staff", variant: "destructive" });
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
  }, [imagingCenterId]);

  const copyInviteLink = async (token: string, id: string) => {
    const link = `${window.location.origin}/accept-invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      toast({ title: "Copied", description: "Invite link copied to clipboard" });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  const createInvite = async () => {
    if (!canInvite) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-management", {
        body: {
          action: "create_invite",
          entityType: "imaging_center",
          entityId: imagingCenterId,
          email: inviteEmail.trim().toLowerCase(),
          fullName: inviteFullName.trim() || undefined,
          phone: invitePhone.trim() || undefined,
          role: inviteRole,
          customMessage: inviteMessage.trim() || undefined,
          permissions: {
            can_view_orders: permViewOrders,
            can_process_scans: permProcessScans,
            can_upload_results: permUpload,
            can_verify_results: permVerify,
            can_manage_equipment: permEquipment,
          },
          sendEmail: true,
          platformUrl: window.location.origin,
        },
      });

      if (error) throw error;

      toast({ title: "Invitation created", description: `Invite sent to ${inviteEmail}` });

      setInviteEmail("");
      setInviteFullName("");
      setInvitePhone("");
      setInviteRole("technologist");
      setInviteMessage("");

      setPermViewOrders(true);
      setPermProcessScans(false);
      setPermUpload(false);
      setPermVerify(false);
      setPermEquipment(false);

      setInviteOpen(false);
      setTab("invites");

      await fetchAll();

      if (data?.invite?.invite_token) {
        await copyInviteLink(data.invite.invite_token, data.invite.id);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to create invitation", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const cancelInvite = async (invitationId: string) => {
    try {
      const { error } = await supabase.functions.invoke("staff-management", {
        body: { action: "cancel_invite", entityType: "imaging_center", entityId: imagingCenterId, invitationId },
      });
      if (error) throw error;
      toast({ title: "Cancelled", description: "Invitation cancelled" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to cancel invite", variant: "destructive" });
    }
  };

  const updateStaff = async (staffId: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.functions.invoke("staff-management", {
        body: { action: "update_staff", entityType: "imaging_center", entityId: imagingCenterId, staffId, updates },
      });
      if (error) throw error;
      const updated = data?.staff as ImagingStaffRow | undefined;
      if (updated) setStaff((prev) => prev.map((s) => (s.id === staffId ? updated : s)));
      toast({ title: "Updated", description: "Staff updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to update staff", variant: "destructive" });
    }
  };

  const permissionBadges = (s: ImagingStaffRow) => {
    const items: string[] = [];
    if (s.can_view_orders) items.push("View Orders");
    if (s.can_process_scans) items.push("Process Scans");
    if (s.can_upload_results) items.push("Upload Results");
    if (s.can_verify_results) items.push("Verify Results");
    if (s.can_manage_equipment) items.push("Manage Equipment");
    return items;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading staff...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="invites">Invitations</TabsTrigger>
          </TabsList>

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

              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Invite imaging staff</DialogTitle>
                  <DialogDescription>Invite a staff member by email and configure their initial permissions.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="staff@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Custom message</Label>
                    <Input value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} placeholder="Optional note to the invitee" />
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="font-medium text-sm">Permissions</div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">View orders</div>
                        <div className="text-xs text-muted-foreground">Allow viewing imaging orders and queue</div>
                      </div>
                      <Switch checked={permViewOrders} onCheckedChange={setPermViewOrders} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Process scans</div>
                        <div className="text-xs text-muted-foreground">Allow processing and updating scan status</div>
                      </div>
                      <Switch checked={permProcessScans} onCheckedChange={setPermProcessScans} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Upload results</div>
                        <div className="text-xs text-muted-foreground">Allow uploading imaging reports/results</div>
                      </div>
                      <Switch checked={permUpload} onCheckedChange={setPermUpload} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Verify results</div>
                        <div className="text-xs text-muted-foreground">Allow verification/sign-off of reports</div>
                      </div>
                      <Switch checked={permVerify} onCheckedChange={setPermVerify} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Manage equipment</div>
                        <div className="text-xs text-muted-foreground">Allow managing imaging equipment</div>
                      </div>
                      <Switch checked={permEquipment} onCheckedChange={setPermEquipment} />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
                    Cancel
                  </Button>
                  <Button onClick={createInvite} disabled={!canInvite || inviting}>
                    {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="staff" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Members ({staff.length})
              </CardTitle>
              <CardDescription>Admins can update roles and permissions here (entity-scoped).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">No staff members yet.</div>
              ) : (
                <div className="space-y-3">
                  {staff.map((s) => {
                    const p = profiles[s.user_id];
                    const perms = permissionBadges(s);
                    return (
                      <div key={s.id} className="border rounded-xl p-4 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{displayName(p, p?.email || null)}</div>
                            <div className="text-sm text-muted-foreground truncate">{p?.email || s.user_id}</div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge variant="outline">{s.staff_role}</Badge>
                              <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                              {s.license_number ? <Badge variant="secondary">License: {s.license_number}</Badge> : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Select value={s.staff_role} onValueChange={(v) => updateStaff(s.id, { staff_role: v })}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STAFF_ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={s.status} onValueChange={(v) => updateStaff(s.id, { status: v })}>
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STAFF_STATUSES.map((st) => (
                                  <SelectItem key={st.value} value={st.value}>
                                    {st.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {perms.length ? (
                            perms.map((x) => (
                              <Badge key={x} variant="secondary" className="text-xs">
                                {x}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No permissions enabled</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between border rounded-lg p-3">
                            <div>
                              <div className="text-sm font-medium">View orders</div>
                              <div className="text-xs text-muted-foreground">View imaging orders</div>
                            </div>
                            <Switch checked={!!s.can_view_orders} onCheckedChange={(v) => updateStaff(s.id, { can_view_orders: v })} />
                          </div>

                          <div className="flex items-center justify-between border rounded-lg p-3">
                            <div>
                              <div className="text-sm font-medium">Process scans</div>
                              <div className="text-xs text-muted-foreground">Update scan statuses</div>
                            </div>
                            <Switch
                              checked={!!s.can_process_scans}
                              onCheckedChange={(v) => updateStaff(s.id, { can_process_scans: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between border rounded-lg p-3">
                            <div>
                              <div className="text-sm font-medium">Upload results</div>
                              <div className="text-xs text-muted-foreground">Upload imaging reports</div>
                            </div>
                            <Switch
                              checked={!!s.can_upload_results}
                              onCheckedChange={(v) => updateStaff(s.id, { can_upload_results: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between border rounded-lg p-3">
                            <div>
                              <div className="text-sm font-medium">Verify results</div>
                              <div className="text-xs text-muted-foreground">Verify/sign-off reports</div>
                            </div>
                            <Switch
                              checked={!!s.can_verify_results}
                              onCheckedChange={(v) => updateStaff(s.id, { can_verify_results: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between border rounded-lg p-3 md:col-span-2">
                            <div>
                              <div className="text-sm font-medium">Manage equipment</div>
                              <div className="text-xs text-muted-foreground">Manage imaging equipment</div>
                            </div>
                            <Switch
                              checked={!!s.can_manage_equipment}
                              onCheckedChange={(v) => updateStaff(s.id, { can_manage_equipment: v })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invitations ({invites.length})</CardTitle>
              <CardDescription>Pending and awaiting-signup invites. Copy links for manual sharing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invites.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">No invitations found.</div>
              ) : (
                <div className="space-y-3">
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{inv.full_name || inv.email}</div>
                        <div className="text-sm text-muted-foreground truncate">{inv.email}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">{inv.role}</Badge>
                          <Badge variant={inv.status === "pending" ? "default" : "secondary"}>{inv.status}</Badge>
                          <Badge variant="secondary">{inv.invite_type}</Badge>
                          <Badge variant="outline" className="text-xs">
                            Sent {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => copyInviteLink(inv.invite_token, inv.id)}>
                          {copiedId === inv.id ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {copiedId === inv.id ? "Copied" : "Copy"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancelInvite(inv.id)}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
