// src/components/super-admin/UsersAdmin.tsx
import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, UserCog, ShieldCheck, ShieldOff, Pencil } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

type UserRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
  roles: string[];
};

type RolesMode = "replace" | "add" | "remove";

const ROLE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "patient", label: "Patient" },
  { key: "doctor", label: "Doctor" },
  { key: "staff", label: "Staff" },
  { key: "admin", label: "Admin" },
  { key: "clinic_admin", label: "Clinic Admin" },
  { key: "lab_admin", label: "Lab Admin" },
  { key: "pharmacy_admin", label: "Pharmacy Admin" },
  { key: "imaging_admin", label: "Imaging Admin" },
  { key: "super_admin", label: "Super Admin" },
];

async function invokeSuperadmin<T = any>(body: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("superadmin", { body });
  if (error) {
    const msg = (error as any)?.context?.message || (error as any)?.message || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

function formatDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export default function UsersAdmin() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [mode, setMode] = useState<RolesMode>("replace");

  const [disableOpen, setDisableOpen] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [disableUser, setDisableUser] = useState<UserRow | null>(null);
  const [disableAction, setDisableAction] = useState<"disable_user" | "enable_user">("disable_user");

  const fetchUsers = async (nextOffset = 0) => {
    setLoading(true);
    try {
      const res = await invokeSuperadmin<{
        data: UserRow[];
        meta: { limit: number; offset: number; query?: string | null; role?: string | null };
      }>({
        action: "list_users",
        limit,
        offset: nextOffset,
        query: query.trim() || null,
        role: roleFilter.trim() || null,
      });

      setRows(res.data || []);
      setOffset(nextOffset);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayRows = useMemo(() => rows || [], [rows]);

  const openEditRoles = (u: UserRow) => {
    setEditUser(u);
    setSelectedRoles(uniq(u.roles || []));
    setMode("replace");
    setEditOpen(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const s = new Set(prev);
      if (s.has(role)) s.delete(role);
      else s.add(role);
      return Array.from(s);
    });
  };

  const saveRoles = async () => {
    if (!editUser) return;

    const roles = uniq(selectedRoles);
    if (roles.length === 0) {
      toast.error("User must have at least one role");
      return;
    }

    try {
      toast.loading("Saving roles...", { id: "save-roles" });
      const res = await invokeSuperadmin<{ ok: boolean; user_id: string; roles: string[] }>({
        action: "set_user_roles",
        user_id: editUser.user_id,
        mode,
        roles,
      });

      toast.success("Roles updated", { id: "save-roles" });

      // Patch locally
      setRows((prev) =>
        prev.map((r) => (r.user_id === res.user_id ? { ...r, roles: uniq(res.roles || roles) } : r))
      );

      setEditOpen(false);
      setEditUser(null);
      setSelectedRoles([]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update roles", { id: "save-roles" });
    }
  };

  const openDisableDialog = (u: UserRow, action: "disable_user" | "enable_user") => {
    setDisableUser(u);
    setDisableAction(action);
    setDisableReason("");
    setDisableOpen(true);
  };

  const submitDisable = async () => {
    if (!disableUser) return;

    const reason = disableReason.trim();
    try {
      toast.loading(disableAction === "disable_user" ? "Disabling user..." : "Enabling user...", {
        id: "toggle-user",
      });

      await invokeSuperadmin({
        action: disableAction,
        user_id: disableUser.user_id,
        reason: reason || null,
      });

      toast.success(disableAction === "disable_user" ? "User disabled" : "User enabled", { id: "toggle-user" });
      setDisableOpen(false);
      setDisableUser(null);
      setDisableReason("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update user status", { id: "toggle-user" });
    }
  };

  const canNext = displayRows.length >= limit;

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" />
                Users
              </CardTitle>
              <CardDescription>Search users and manage roles / access.</CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative w-full sm:w-[360px]">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by email, name, phone, user id…"
                  className="pl-9"
                />
              </div>

              <Input
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                placeholder="Role filter (optional)"
                className="w-full sm:w-[220px]"
              />

              <Button
                variant="outline"
                className="gap-2"
                disabled={loading}
                onClick={() => fetchUsers(0)}
              >
                <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                Search
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Showing <span className="text-foreground font-medium">{displayRows.length}</span> users
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || offset === 0}
                onClick={() => fetchUsers(Math.max(0, offset - limit))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || !canNext}
                onClick={() => fetchUsers(offset + limit)}
              >
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
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="w-[220px]">Created</TableHead>
                  <TableHead className="w-[220px]">Updated</TableHead>
                  <TableHead className="w-[220px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-sm text-muted-foreground text-center">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-sm text-muted-foreground text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium">{u.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.email || "—"}
                            {u.phone ? ` • ${u.phone}` : ""}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{u.user_id}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(u.roles || []).length === 0 ? (
                            <Badge variant="secondary">none</Badge>
                          ) : (
                            (u.roles || []).map((r) => (
                              <Badge key={r} variant="outline" className="capitalize">
                                {r.replaceAll("_", " ")}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.updated_at)}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditRoles(u)}>
                            <Pencil className="w-4 h-4" />
                            Roles
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => openDisableDialog(u, "disable_user")}
                          >
                            <ShieldOff className="w-4 h-4" />
                            Disable
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => openDisableDialog(u, "enable_user")}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Enable
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Roles Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) {
            setEditUser(null);
            setSelectedRoles([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage roles</DialogTitle>
            <DialogDescription>Update roles for the selected user.</DialogDescription>
          </DialogHeader>

          <Separator />

          {!editUser ? (
            <div className="py-10 text-sm text-muted-foreground text-center">No selection.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 p-3">
                <div className="font-medium">{editUser.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{editUser.email || "—"}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{editUser.user_id}</div>
              </div>

              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={mode === "replace" ? "default" : "outline"}
                    onClick={() => setMode("replace")}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "add" ? "default" : "outline"}
                    onClick={() => setMode("add")}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "remove" ? "default" : "outline"}
                    onClick={() => setMode("remove")}
                  >
                    Remove
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Replace sets roles exactly. Add merges. Remove deletes selected roles.
                </div>
              </div>

              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((r) => (
                    <label
                      key={r.key}
                      className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-muted/30 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRoles.includes(r.key)}
                        onCheckedChange={() => toggleRole(r.key)}
                      />
                      <span className="text-sm">{r.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{r.key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/50 p-3">
                <div className="text-xs text-muted-foreground mb-2">Selected</div>
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.length === 0 ? (
                    <Badge variant="secondary">none</Badge>
                  ) : (
                    selectedRoles.map((r) => (
                      <Badge key={r} variant="outline" className="capitalize">
                        {r.replaceAll("_", " ")}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveRoles}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable/Enable Dialog */}
      <Dialog
        open={disableOpen}
        onOpenChange={(v) => {
          setDisableOpen(v);
          if (!v) {
            setDisableUser(null);
            setDisableReason("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{disableAction === "disable_user" ? "Disable user" : "Enable user"}</DialogTitle>
            <DialogDescription>
              {disableAction === "disable_user"
                ? "This will ban the user from authenticating until re-enabled."
                : "This will remove the ban and allow the user to authenticate again."}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          {!disableUser ? (
            <div className="py-10 text-sm text-muted-foreground text-center">No selection.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 p-3">
                <div className="font-medium">{disableUser.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{disableUser.email || "—"}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{disableUser.user_id}</div>
              </div>

              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="Reason for this action…"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDisableOpen(false)}>
                  Cancel
                </Button>
                <Button variant={disableAction === "disable_user" ? "destructive" : "default"} onClick={submitDisable}>
                  {disableAction === "disable_user" ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
