import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Search, Loader2 } from "lucide-react";
import { ReferralsSection, CreateReferralDialog } from "@/components/referrals";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useReferralActions } from "@/hooks/useReferrals";

type RegisteredPatient = {
  id: string; // profiles.user_id
  full_name: string;
  email: string | null;
  phone: string | null;
};

export function DoctorReferralsSection() {
  const { doctorProfile } = useDoctorData();
  const { createReferral, sendReferral } = useReferralActions();

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

  if (!doctorProfile) return null;

  return (
    <>
      {/* Lightweight header row with "New Referral" */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Referrals</h2>
        </div>

        <Button
          onClick={() => setPickerOpen(true)}
          variant="outline"
          size="sm"
        >
          New Referral
        </Button>
      </div>

      {/* Existing referrals UI */}
      <ReferralsSection
        role="referrer"
        entityType="doctor"
        entityId={doctorProfile.id}
        showCreateButton={false}
        title=""
      />

      {/* Patient picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
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
                {canSearch ? "No results yet. Try searching." : "Type at least 2 characters to search."}
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
                    {[p.email, p.phone].filter(Boolean).join(" • ")}
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

      {/* Create referral dialog (uses your existing flow) */}
      {selected && (
        <CreateReferralDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          patientId={selected.id}
          patientName={selected.full_name}
          onSubmit={async (data) => {
            const result = await createReferral(data, "doctor", doctorProfile.id);
            if (result.success && result.data) {
              await sendReferral(result.data.id);
              toast.success("Referral created and sent");
            } else {
              toast.error(result.error || "Failed to create referral");
            }
          }}
        />
      )}
    </>
  );
}
