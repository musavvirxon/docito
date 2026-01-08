import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useReferralActions, type ReferralEntityType } from "@/hooks/useReferrals";
import { canCreateReferrals } from "@/lib/referrals/permissions";

import { CreateReferralDialog } from "@/components/referrals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type RegisteredPatient = {
  id: string; // profiles.user_id
  full_name: string;
  email: string | null;
  phone: string | null;
};

/**
 * Facility referral creator:
 * - shows a "New Referral" button (UI guarded)
 * - picks a registered patient
 * - opens CreateReferralDialog
 * - creates + sends referral as the given entityType/entityId
 */
export function FacilityReferralCreator({
  entityType,
  entityId,
  buttonLabel = "New Referral",
  buttonVariant = "outline",
  size = "sm",
}: {
  entityType: Exclude<ReferralEntityType, "doctor">;
  entityId: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const { allRoles } = useAuth();
  const { createReferral, sendReferral } = useReferralActions();

  const uiCanCreate = canCreateReferrals(allRoles);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RegisteredPatient[]>([]);
  const [selected, setSelected] = useState<RegisteredPatient | null>(null);

  useEffect(() => {
    if (!pickerOpen) {
      setQ("");
      setResults([]);
      setSelected(null);
      setLoading(false);
    }
  }, [pickerOpen]);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  const runSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    try {
      const term = q.trim();

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .eq("role", "patient")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;

      setResults(
        (data ?? []).map((p: any) => ({
          id: p.user_id,
          full_name: p.full_name || "Unknown",
          email: p.email ?? null,
          phone: p.phone ?? null,
        }))
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  if (!entityId) return null;

  if (!uiCanCreate) {
    // Keep UI clean: no button at all for non-creators
    return null;
  }

  return (
    <>
      <Button variant={buttonVariant} size={size} onClick={() => setPickerOpen(true)}>
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        {buttonLabel}
      </Button>

      {/* Patient picker */}
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!uiCanCreate && open) {
            toast.error("Your account cannot create referrals");
            return;
          }
          setPickerOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select registered patient</DialogTitle>
            <DialogDescription>
              Referrals can only be created for patients with registered accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 opacity-60" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name / email / phone…"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
            </div>
            <Button type="button" onClick={runSearch} disabled={!canSearch || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {canSearch
                  ? "No results yet. Try searching."
                  : "Type at least 2 characters to search."}
              </p>
            ) : (
              results.map((p) => (
                <Card
                  key={p.id}
                  className={`p-3 cursor-pointer hover:bg-muted ${
                    selected?.id === p.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelected(p)}
                >
                  <div className="font-medium">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[p.email, p.phone].filter(Boolean).join(" • ") || "—"}
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                setPickerOpen(false);
                setCreateOpen(true);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Referral form */}
      {selected && (
        <CreateReferralDialog
          open={createOpen}
          onOpenChange={(open) => {
            if (!open) {
              setCreateOpen(false);
              setPickerOpen(true);
            } else {
              setCreateOpen(true);
            }
          }}
          patientId={selected.id}
          patientName={selected.full_name}
          onSubmit={async (data) => {
            const result = await createReferral(data, entityType, entityId);
            if (result.success && (result as any).data) {
              const created = (result as any).data;
              await sendReferral(created.id);
              toast.success("Referral created and sent");
              setCreateOpen(false);
              setPickerOpen(false);
            } else {
              toast.error((result as any).error || "Failed to create referral");
            }
          }}
        />
      )}
    </>
  );
}
