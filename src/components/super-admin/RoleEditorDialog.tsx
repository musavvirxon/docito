// src/components/super-admin/RoleEditorDialog.tsx
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type RolesMode = "replace" | "add" | "remove";

export type RoleEditorUser = {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
};

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

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export default function RoleEditorDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  user: RoleEditorUser | null;
  initialRoles: string[];

  saving?: boolean;

  onSave: (payload: { mode: RolesMode; roles: string[] }) => void;
}) {
  const { open, onOpenChange, user, initialRoles, saving, onSave } = props;

  const [mode, setMode] = useState<RolesMode>("replace");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setMode("replace");
    setSelectedRoles(uniq(initialRoles || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.user_id]);

  const selected = useMemo(() => uniq(selectedRoles), [selectedRoles]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const s = new Set(prev);
      if (s.has(role)) s.delete(role);
      else s.add(role);
      return Array.from(s);
    });
  };

  const handleSave = () => {
    const roles = uniq(selectedRoles);
    onSave({ mode, roles });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage roles</DialogTitle>
          <DialogDescription>Update roles for the selected user.</DialogDescription>
        </DialogHeader>

        <Separator />

        {!user ? (
          <div className="py-10 text-sm text-muted-foreground text-center">No selection.</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 p-3">
              <div className="font-medium">{user.full_name || "—"}</div>
              <div className="text-xs text-muted-foreground">{user.email || "—"}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{user.user_id}</div>
            </div>

            <div className="space-y-2">
              <Label>Mode</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={mode === "replace" ? "default" : "outline"}
                  onClick={() => setMode("replace")}
                  disabled={!!saving}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant={mode === "add" ? "default" : "outline"}
                  onClick={() => setMode("add")}
                  disabled={!!saving}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant={mode === "remove" ? "default" : "outline"}
                  onClick={() => setMode("remove")}
                  disabled={!!saving}
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
                      disabled={!!saving}
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
                {selected.length === 0 ? (
                  <Badge variant="secondary">none</Badge>
                ) : (
                  selected.map((r) => (
                    <Badge key={r} variant="outline" className="capitalize">
                      {r.replaceAll("_", " ")}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!!saving}>
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
