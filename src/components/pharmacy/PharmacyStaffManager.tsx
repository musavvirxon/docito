// File: src/components/pharmacy/PharmacyStaffManager.tsx

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

type PharmacyStaffRow = {
  id: string;
  pharmacy_id: string;
  user_id: string;
  staff_role: string;
  status: string;
  license_number: string | null;
  can_dispense: boolean;
  can_manage_inventory: boolean;
  can_process_prescriptions: boolean;
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
  { value: "pharmacist", label: "Pharmacist" },
  { value: "technician", label: "Pharmacy Technician" },
  { value: "cashier", label: "Cashier" },
  { value: "admin", label: "Administrator" },
];

const STAFF_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

interface Props {
  pharmacyId: string;
}

export default function PharmacyStaffManager({ pharmacyId }: Props) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<PharmacyStaffRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  const [tab, setTab] = useState<"staff" | "invites">("staff");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("technician");
  const [inviteMessage, setInviteMessage] = useState("");

  const [permDispense, setPermDispense] = useState(false);
  const [permInventory, setPermInventory] = useState(false);
  const [permPrescriptions, setPermPrescriptions] = useState(true);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canInvite = useMemo(
    () => inviteEmail.trim().includes("@") && inviteRole.trim().length > 0,
    [inviteEmail, inviteRole],
  );

  const fetchAll = async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const [{ data: staffResp, error: staffErr }, { data: inviteResp, error: inviteErr }] = await Promise.all([
        supabase.functions.invoke("staff-management", {
          body: { action: "list_staff", entityType: "pharmacy", entityId: pharmacyId },
        }),
        supabase.functions.invoke("staff-management", {
          body: { action: "list_invites", entityType: "pharmacy", entityId: pharmacyId },
        }),
      ]);

      if (staffErr) throw staffErr;
      if (inviteErr) throw inviteErr;

      setStaff((staffResp?.staff || []) as PharmacyStaffRow[]);
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
  }, [pharmacyId]);

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
          entityType: "pharmacy",
          entityId: pharmacyId,
          email: inviteEmail.trim().toLowerCase(),
          fullName: inviteFullName.trim() || undefined,
          phone: invitePhone.trim() || undefined,
          role: inviteRole,
          customMessage: inviteMessage.trim() || undefined,
          permissions: {
            can_dispense: permDispense,
            can_manage_inventory: permInventory,
            can_process_prescriptions: permPrescriptions,
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
      setInviteRole("technician");
      setInviteMessage("");

      setPermDispense(false);
      setPermInventory(false);
      setPermPrescriptions(true);

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
        body: { action: "cancel_invite", entityType: "pharmacy", entityId: pharmacyId, invitationId },
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
        body: { action: "update_staff", entityType: "pharmacy", entityId: pharmacyId, staffId, updates },
      });
      if (error) throw error;
      const updated = data?.staff as PharmacyStaffRow | undefined;
      if (updated) setStaff((prev) => prev.map((s) => (s.id === staffId ? updated : s)));
      toast({ title: "Updated", description: "Staff updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to update staff", variant: "destructive" });
    }
  };

  const permissionBadges = (s: PharmacyStaffRow) => {
    const items: string[] = [];
    if (s.can_process_prescriptions) items.push("Process Prescriptions");
    if (s.can_dispense) items.push("Dispense");
    if (s.can_manage_inventory) items.push("Manage Inventory");
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
                  <DialogTitle>Invite pharmacy staff</DialogTitle>
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
                        <div className="text-sm font-medium">Process prescriptions</div>
                        <div className="text-xs text-muted-foreground">Allow processing/handling prescriptions</div>
                      </div>
                      <Switch checked={permPrescriptions} onCheckedChange={setPermPrescriptions} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Dispense</div>
                        <div className="text-xs text-muted-foreground">Allow dispensing medication</div>
                      </div>
                      <Switch checked={permDispense} onCheckedChange={setPermDispense} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Manage inventory</div>
                        <div className="text-xs text-muted-foreground">Allow inventory adjustments</div>
                      </div>
                      <Switch checked={permInventory} onCheckedChange={setPermInventory} />
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
                              <div className="text-sm font-medium">Process prescriptions</div>
                              <div className="text-xs text-muted-foreground">Handle prescriptions</div>
                            </div>
                            <Switch
                              checked={!!s.can_process_prescriptions}
                              onCheckedChange={(v) => updateStaff(s.id, { can_process_prescriptions: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between border rounded-lg p-3">
                            <div>
                              <div className="text-sm font-medium">Dispense</div>
                              <div className="text-xs text-muted-foreground">Dispense medications</div>
                            </div>
                            <Switch checked={!!s.can_dispense} onCheckedChange={(v) => updateStaff(s.id, { can_dispense: v })} />
                          </div>

                          <div className="flex items-center justify-between border rounded-lg p-3 md:col-span-2">
                            <div>
                              <div className="text-sm font-medium">Manage inventory</div>
                              <div className="text-xs text-muted-foreground">Adjust inventory</div>
                            </div>
                            <Switch
                              checked={!!s.can_manage_inventory}
                              onCheckedChange={(v) => updateStaff(s.id, { can_manage_inventory: v })}
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
