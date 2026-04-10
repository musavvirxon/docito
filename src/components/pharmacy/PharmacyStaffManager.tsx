// File: src/components/pharmacy/PharmacyStaffManager.tsx
// Direct-query staff management (same pattern as LabStaffManager)

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Shield,
  Clock3,
  RefreshCw,
  Trash2,
  Power,
  Save,
  Search,
  Mail,
  History,
  CheckCircle2,
  XCircle,
  UserCog,
} from "lucide-react";

type PharmacyStaffManagerProps = {
  pharmacyId: string;
};

type StaffRow = Record<string, any>;
type ProfileRow = Record<string, any>;
type AuditItem = {
  id: string;
  title: string;
  subtitle: string;
  at?: string | null;
  severity?: "info" | "success" | "warning" | "danger";
};

type PermissionKey =
  | "prescriptions.view"
  | "prescriptions.manage"
  | "dispense.manage"
  | "inventory.view"
  | "inventory.manage"
  | "billing.view"
  | "billing.manage"
  | "referrals.manage"
  | "staff.manage";

const PERMISSION_KEYS: PermissionKey[] = [
  "prescriptions.view",
  "prescriptions.manage",
  "dispense.manage",
  "inventory.view",
  "inventory.manage",
  "billing.view",
  "billing.manage",
  "referrals.manage",
  "staff.manage",
];

const ROLE_OPTIONS = ["admin", "pharmacist", "technician", "cashier", "frontdesk", "viewer"] as const;
type StaffRole = (typeof ROLE_OPTIONS)[number];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function normalizeStatus(v: unknown) {
  return String(v || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function humanize(v: unknown) {
  const s = normalizeStatus(v);
  if (!s) return "Unknown";
  return s.split("_").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" ");
}

function toIsoNow() {
  return new Date().toISOString();
}

function defaultPermissionsForRole(role: StaffRole): PermissionKey[] {
  switch (role) {
    case "admin":
      return [...PERMISSION_KEYS];
    case "pharmacist":
      return ["prescriptions.view", "prescriptions.manage", "dispense.manage", "inventory.view", "inventory.manage", "referrals.manage"];
    case "technician":
      return ["prescriptions.view", "prescriptions.manage", "inventory.view"];
    case "cashier":
      return ["prescriptions.view", "billing.view", "billing.manage"];
    case "frontdesk":
      return ["prescriptions.view", "referrals.manage"];
    case "viewer":
    default:
      return ["prescriptions.view"];
  }
}

function normalizePermissions(raw: any): PermissionKey[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter((k): k is PermissionKey => (PERMISSION_KEYS as string[]).includes(k));
  if (typeof raw === "object") return Object.entries(raw).filter(([, v]) => Boolean(v)).map(([k]) => k).filter((k): k is PermissionKey => (PERMISSION_KEYS as string[]).includes(k));
  return [];
}

function permissionsToStorage(perms: PermissionKey[]) {
  return perms.reduce<Record<string, boolean>>((acc, key) => { acc[key] = true; return acc; }, {});
}

function relativeTimeLabel(value?: string | null) {
  if (!value) return "Unknown time";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  const diff = Date.now() - d.getTime();
  const min = Math.round(Math.abs(diff) / 60000);
  const hr = Math.round(Math.abs(diff) / 3600000);
  const day = Math.round(Math.abs(diff) / 86400000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${day}d ago`;
}

function getProfileName(profile?: ProfileRow | null, fallbackEmail?: string) {
  if (!profile) return fallbackEmail || "Unknown user";
  return profile.full_name || profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || fallbackEmail || "Unknown user";
}

function getStaffRole(row: StaffRow): string {
  return String(row.staff_role || row.role || row.position || "viewer");
}

function getStaffEmail(row: StaffRow): string {
  return row.email || row.invited_email || row.contact_email || row.staff_email || row.user_email || "";
}

function getStaffUserId(row: StaffRow): string {
  return String(row.user_id || row.staff_user_id || "");
}

function buildSyntheticAudit(rows: StaffRow[], profilesById: Record<string, ProfileRow>): AuditItem[] {
  const items: AuditItem[] = [];
  for (const row of rows) {
    const userId = getStaffUserId(row);
    const email = getStaffEmail(row);
    const who = getProfileName(userId ? profilesById[userId] : null, email || undefined);
    const role = getStaffRole(row);
    const status = normalizeStatus(row.status);
    if (row.created_at) items.push({ id: `${row.id}-created`, title: "Staff record created", subtitle: `${who} • ${role}`, at: row.created_at, severity: "success" });
    if (row.updated_at && row.updated_at !== row.created_at) items.push({ id: `${row.id}-updated`, title: "Staff record updated", subtitle: `${who} • ${humanize(status || "updated")}`, at: row.updated_at, severity: status === "inactive" ? "warning" : "info" });
    if (status === "invited" || status === "pending") items.push({ id: `${row.id}-invited`, title: "Invitation pending", subtitle: `${email || who} • ${role}`, at: row.invitation_sent_at || row.updated_at || row.created_at, severity: "warning" });
  }
  return items.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()).slice(0, 20);
}

export default function PharmacyStaffManager({ pharmacyId }: PharmacyStaffManagerProps) {
  const { t } = useTranslation("pharmacyAdminDashboard");
  const sb: any = supabase as any;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [auditTrail, setAuditTrail] = useState<AuditItem[]>([]);
  const [search, setSearch] = useState("");
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [actingRowId, setActingRowId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("technician");
  const [invitePermissions, setInvitePermissions] = useState<PermissionKey[]>(defaultPermissionsForRole("technician"));
  const [inviteLoading, setInviteLoading] = useState(false);
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [draftPermissions, setDraftPermissions] = useState<Record<string, PermissionKey[]>>({});

  const activeRows = useMemo(() => rows.filter((r) => !["invited", "pending", "cancelled", "revoked", "inactive", "disabled", "removed"].includes(normalizeStatus(r.status))), [rows]);
  const pendingRows = useMemo(() => rows.filter((r) => ["invited", "pending"].includes(normalizeStatus(r.status))), [rows]);
  const inactiveRows = useMemo(() => rows.filter((r) => ["inactive", "disabled", "removed"].includes(normalizeStatus(r.status))), [rows]);

  const filteredActiveRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeRows;
    return activeRows.filter((r) => {
      const userId = getStaffUserId(r);
      const profile = userId ? profilesById[userId] : null;
      const who = getProfileName(profile, getStaffEmail(r));
      const haystack = [who, getStaffEmail(r), getStaffRole(r), r.id, r.status].filter(Boolean).map(String).join(" | ").toLowerCase();
      return haystack.includes(q);
    });
  }, [activeRows, profilesById, search]);

  async function loadData(showSpinner = true) {
    if (!pharmacyId) return;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: staffData, error: staffErr } = await sb
        .from("pharmacy_staff")
        .select("*")
        .eq("pharmacy_id", pharmacyId)
        .order("created_at", { ascending: false });

      if (staffErr) throw staffErr;
      let mergedRows: StaffRow[] = Array.isArray(staffData) ? staffData : [];

      // Try to also load from staff_invitations (unified)
      try {
        const { data: inviteRows, error: inviteErr } = await sb
          .from("staff_invitations")
          .select("*")
          .eq("entity_id", pharmacyId)
          .eq("entity_type", "pharmacy")
          .in("status", ["pending", "invited"])
          .order("created_at", { ascending: false });

        if (!inviteErr && Array.isArray(inviteRows)) {
          const mapped = inviteRows.map((inv: any) => ({
            ...inv,
            _source: "staff_invitations",
            id: inv.id,
            status: inv.status || "pending",
            invited_email: inv.email,
            staff_role: inv.role || "viewer",
          }));
          const existingEmails = new Set(mergedRows.map((r) => getStaffEmail(r)).filter(Boolean));
          const deduped = mapped.filter((r) => {
            const email = getStaffEmail(r);
            return !email || !existingEmails.has(email);
          });
          mergedRows = [...mergedRows, ...deduped];
        }
      } catch { /* optional table */ }

      setRows(mergedRows);

      const userIds = [...new Set(mergedRows.map((r) => getStaffUserId(r)).filter(Boolean))];
      let nextProfilesById: Record<string, ProfileRow> = {};
      if (userIds.length > 0) {
        try {
          const { data: profileRows } = await sb.from("profiles").select("*").in("user_id", userIds);
          if (Array.isArray(profileRows)) {
            for (const p of profileRows) nextProfilesById[String(p.user_id)] = p;
          }
        } catch { /* ignore */ }
      }
      setProfilesById(nextProfilesById);

      let auditItems: AuditItem[] = [];
      try {
        const { data: logs } = await sb
          .from("audit_logs")
          .select("*")
          .or(`entity_id.eq.${pharmacyId},resource_id.eq.${pharmacyId}`)
          .order("created_at", { ascending: false })
          .limit(30);
        if (Array.isArray(logs) && logs.length) {
          auditItems = logs.map((log: any) => ({
            id: String(log.id),
            title: log.action || "Audit Event",
            subtitle: [log.actor_name || log.actor_id, log.entity_type].filter(Boolean).join(" • ") || "Staff-related activity",
            at: log.created_at || null,
            severity: normalizeStatus(log.level) === "error" ? "danger" as const : "info" as const,
          }));
        }
      } catch { /* ignore */ }

      if (!auditItems.length) auditItems = buildSyntheticAudit(mergedRows, nextProfilesById);
      setAuditTrail(auditItems);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load staff data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(true); }, [pharmacyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setInvitePermissions(defaultPermissionsForRole(inviteRole)); }, [inviteRole]);
  useEffect(() => {
    const nextRoles: Record<string, string> = {};
    const nextPerms: Record<string, PermissionKey[]> = {};
    for (const row of rows) {
      nextRoles[String(row.id)] = getStaffRole(row);
      nextPerms[String(row.id)] = normalizePermissions(row.permissions || row.permission_map);
    }
    setDraftRoles(nextRoles);
    setDraftPermissions(nextPerms);
  }, [rows]);

  function toggleInvitePermission(key: PermissionKey) {
    setInvitePermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  function toggleDraftPermission(rowId: string, key: PermissionKey) {
    setDraftPermissions((prev) => {
      const current = prev[rowId] || [];
      const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
      return { ...prev, [rowId]: next };
    });
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) { toast.error("Enter a valid email"); return; }

    setInviteLoading(true);
    try {
      // Try unified staff_invitations first
      const { error } = await sb.from("staff_invitations").insert({
        entity_id: pharmacyId,
        entity_type: "pharmacy",
        email,
        role: inviteRole,
        status: "pending",
        invite_type: "email",
      });
      if (error) {
        // Fallback: insert directly to pharmacy_staff
        const { error: fallbackErr } = await sb.from("pharmacy_staff").insert({
          pharmacy_id: pharmacyId,
          user_id: "00000000-0000-0000-0000-000000000000", // placeholder
          staff_role: inviteRole,
          status: "invited",
        });
        if (fallbackErr) throw fallbackErr;
      }
      toast.success("Invitation created");
      setInviteEmail("");
      setInviteRole("technician");
      setInvitePermissions(defaultPermissionsForRole("technician"));
      await loadData(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create invitation");
    } finally {
      setInviteLoading(false);
    }
  }

  async function saveRow(row: StaffRow) {
    const rowId = String(row.id);
    setSavingRowId(rowId);
    try {
      const nextRole = draftRoles[rowId] || getStaffRole(row);
      const nextPerms = draftPermissions[rowId] || normalizePermissions(row.permissions);
      const { error } = await sb.from("pharmacy_staff").update({
        staff_role: nextRole,
        can_process_prescriptions: nextPerms.includes("prescriptions.manage"),
        can_dispense: nextPerms.includes("dispense.manage"),
        can_manage_inventory: nextPerms.includes("inventory.manage"),
        updated_at: toIsoNow(),
      }).eq("id", rowId);
      if (error) throw error;
      toast.success("Staff permissions updated");
      await loadData(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update staff");
    } finally {
      setSavingRowId(null);
    }
  }

  async function setRowStatus(row: StaffRow, status: string) {
    const rowId = String(row.id);
    setActingRowId(rowId);
    try {
      const { error } = await sb.from("pharmacy_staff").update({ status, updated_at: toIsoNow() }).eq("id", rowId);
      if (error) throw error;
      toast.success(`Staff status updated to ${humanize(status)}`);
      await loadData(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update staff status");
    } finally {
      setActingRowId(null);
    }
  }

  async function removeRow(row: StaffRow) {
    const rowId = String(row.id);
    setActingRowId(rowId);
    try {
      const soft = await sb.from("pharmacy_staff").update({ status: "removed", updated_at: toIsoNow() }).eq("id", rowId);
      if (!soft.error) { toast.success("Staff removed"); await loadData(false); setActingRowId(null); return; }
      const hard = await sb.from("pharmacy_staff").delete().eq("id", rowId);
      if (hard.error) throw hard.error;
      toast.success("Staff removed");
      await loadData(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to remove staff");
    } finally {
      setActingRowId(null);
    }
  }

  async function cancelInvite(row: StaffRow) {
    const rowId = String(row.id);
    setActingRowId(rowId);
    try {
      if (row._source === "staff_invitations") {
        const { error } = await sb.from("staff_invitations").update({ status: "cancelled", updated_at: toIsoNow() }).eq("id", rowId);
        if (error) throw error;
      } else {
        const { error } = await sb.from("pharmacy_staff").update({ status: "cancelled", updated_at: toIsoNow() }).eq("id", rowId);
        if (error) throw error;
      }
      toast.success("Invitation cancelled");
      await loadData(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to cancel invitation");
    } finally {
      setActingRowId(null);
    }
  }

  async function resendInvite(row: StaffRow) {
    const rowId = String(row.id);
    setActingRowId(rowId);
    try {
      const table = row._source === "staff_invitations" ? "staff_invitations" : "pharmacy_staff";
      const { error } = await sb.from(table).update({ status: "pending", updated_at: toIsoNow() }).eq("id", rowId);
      if (error) throw error;
      toast.success("Invitation resent");
      await loadData(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to resend invite");
    } finally {
      setActingRowId(null);
    }
  }

  if (!pharmacyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>Select a pharmacy first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Active Staff</div><div className="text-2xl font-semibold">{activeRows.length}</div></div><Users className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Pending Invitations</div><div className="text-2xl font-semibold">{pendingRows.length}</div></div><Clock3 className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Inactive / Disabled</div><div className="text-2xl font-semibold">{inactiveRows.length}</div></div><Power className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Admin / Pharmacists</div><div className="text-2xl font-semibold">{activeRows.filter((r) => ["admin", "pharmacist"].includes(String(getStaffRole(r)).toLowerCase())).length}</div></div><Shield className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
      </div>

      {/* Invite Staff */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite Staff</CardTitle>
          <CardDescription>Create staff invitations, assign role, and pre-configure permissions before they join.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="staff@pharmacy.com" className="w-full h-10 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole((e.target.value as StaffRole) || "technician")} className="w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  {ROLE_OPTIONS.map((role) => (<option key={role} value={role}>{humanize(role)}</option>))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={inviteLoading} className="w-full h-10 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2 text-sm font-medium">
                  {inviteLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Send Invite
                </button>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-3">Permission Preset</div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PERMISSION_KEYS.map((key) => {
                  const checked = invitePermissions.includes(key);
                  return (
                    <label key={key} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer select-none", checked ? "border-primary bg-primary/5" : "hover:bg-accent")}>
                      <input type="checkbox" checked={checked} onChange={() => toggleInvitePermission(key)} className="h-4 w-4 rounded border" />
                      <span>{key}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" /> Pending Invitations</CardTitle>
          <CardDescription>Manage pending invites, resend, or revoke before activation.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No pending invitations.</div>
          ) : (
            <div className="space-y-3">
              {pendingRows.map((row) => {
                const rowId = String(row.id);
                const email = getStaffEmail(row);
                const isBusy = actingRowId === rowId;
                return (
                  <div key={rowId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{email || "Pending invite"}</div>
                        <div className="text-sm text-muted-foreground">{humanize(normalizeStatus(row.status))} • {humanize(getStaffRole(row))} • {relativeTimeLabel(row.created_at)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => resendInvite(row)} disabled={isBusy} className="h-9 px-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
                          {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Resend
                        </button>
                        <button type="button" onClick={() => cancelInvite(row)} disabled={isBusy} className="h-9 px-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
                          <XCircle className="h-4 w-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Staff Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Active Staff Management</CardTitle>
              <CardDescription>Edit roles, permissions, deactivate, or remove staff.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff..." className="w-full h-9 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="button" onClick={() => loadData(false)} disabled={refreshing} className="h-9 px-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
                {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading staff…</div>
          ) : filteredActiveRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active staff found.</div>
          ) : (
            <div className="space-y-4">
              {filteredActiveRows.map((row) => {
                const rowId = String(row.id);
                const userId = getStaffUserId(row);
                const profile = userId ? profilesById[userId] : null;
                const email = getStaffEmail(row);
                const displayName = getProfileName(profile, email || undefined);
                const currentRole = draftRoles[rowId] || getStaffRole(row);
                const currentPerms = draftPermissions[rowId] || [];
                const isSaving = savingRowId === rowId;
                const isActing = actingRowId === rowId;
                const status = normalizeStatus(row.status || "active");

                return (
                  <div key={rowId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{displayName}</div>
                          <div className="text-sm text-muted-foreground truncate">{email || "No email"} • {humanize(status)} • Added {relativeTimeLabel(row.created_at)}</div>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border", status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {humanize(status)}
                        </span>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[240px,1fr]">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Role</label>
                          <select value={currentRole} onChange={(e) => setDraftRoles((prev) => ({ ...prev, [rowId]: e.target.value }))} className="w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                            {ROLE_OPTIONS.map((role) => (<option key={role} value={role}>{humanize(role)}</option>))}
                          </select>
                          <button type="button" onClick={() => { const role = (draftRoles[rowId] || "viewer") as StaffRole; setDraftPermissions((prev) => ({ ...prev, [rowId]: defaultPermissionsForRole(role) })); }} className="text-xs text-primary hover:underline">Reset permissions from role preset</button>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Permissions</label>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {PERMISSION_KEYS.map((key) => {
                              const checked = currentPerms.includes(key);
                              return (
                                <label key={key} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer select-none", checked ? "border-primary bg-primary/5" : "hover:bg-accent")}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleDraftPermission(rowId, key)} className="h-4 w-4 rounded border" />
                                  <span>{key}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveRow(row)} disabled={isSaving} className="h-9 px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 text-sm inline-flex items-center gap-1.5">
                          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                        </button>
                        <button type="button" onClick={() => setRowStatus(row, "inactive")} disabled={isActing} className="h-9 px-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
                          <Power className="h-4 w-4" /> Deactivate
                        </button>
                        <button type="button" onClick={() => removeRow(row)} disabled={isActing} className="h-9 px-3 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Staff Audit Trail</CardTitle>
          <CardDescription>Recent staff and invitation activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditTrail.length === 0 ? (
            <div className="text-sm text-muted-foreground">No staff audit activity found.</div>
          ) : (
            <div className="space-y-3">
              {auditTrail.map((item) => (
                <div key={item.id} className={cn("rounded-lg border p-3", item.severity === "success" && "bg-emerald-50 border-emerald-200", item.severity === "warning" && "bg-amber-50 border-amber-200", item.severity === "danger" && "bg-rose-50 border-rose-200")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-sm text-muted-foreground truncate">{item.subtitle}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{relativeTimeLabel(item.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
