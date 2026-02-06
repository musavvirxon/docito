// src/components/referrals/FacilityReferralCreator.tsx
import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useReferralActions, type ReferralEntityType } from "@/hooks/useReferrals";
import { canCreateReferrals } from "@/lib/referrals/permissions";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

import { CreateReferralDialog } from "./CreateReferralDialog";

interface FacilityReferralCreatorProps {
  entityType: Exclude<ReferralEntityType, "doctor">;
  entityId: string;
}

type RegisteredPatient = {
  id: string; // profiles.user_id
  full_name: string;
  email: string | null;
  phone: string | null;
};

type ManualPatientDraft = {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  external_patient_ref: string;
};

export function FacilityReferralCreator({ entityType, entityId }: FacilityReferralCreatorProps) {
  const { allRoles } = useAuth();
  const { createReferral, sendReferral } = useReferralActions();

  const uiCanCreate = useMemo(() => canCreateReferrals(allRoles), [allRoles]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"registered" | "manual">("registered");

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RegisteredPatient[]>([]);
  const [selected, setSelected] = useState<RegisteredPatient | null>(null);

  const [selectedMode, setSelectedMode] = useState<"registered" | "manual">("registered");
  const [manualDraft, setManualDraft] = useState<ManualPatientDraft>({
    patient_name: "",
    patient_email: "",
    patient_phone: "",
    external_patient_ref: "",
  });

  useEffect(() => {
    if (!pickerOpen && !createOpen) {
      setQ("");
      setLoading(false);
      setResults([]);
      setSelected(null);
      setActiveTab("registered");
      setSelectedMode("registered");
      setManualDraft({ patient_name: "", patient_email: "", patient_phone: "", external_patient_ref: "" });
    }
  }, [pickerOpen, createOpen]);

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

  const manualCanContinue = useMemo(() => {
    const nameOk = manualDraft.patient_name.trim().length >= 2;
    const emailOk = manualDraft.patient_email.trim().length > 0;
    const phoneOk = manualDraft.patient_phone.trim().length > 0;
    return nameOk && (emailOk || phoneOk);
  }, [manualDraft]);

  const openCreateForRegistered = () => {
    if (!selected) return;
    setSelectedMode("registered");
    setPickerOpen(false);
    setCreateOpen(true);
  };

  const openCreateForManual = () => {
    if (!manualCanContinue) return;

    const synthetic: RegisteredPatient = {
      id: "manual",
      full_name: manualDraft.patient_name.trim(),
      email: manualDraft.patient_email.trim() || null,
      phone: manualDraft.patient_phone.trim() || null,
    };

    setSelected(synthetic);
    setSelectedMode("manual");
    setPickerOpen(false);
    setCreateOpen(true);
  };

  if (!entityId || !uiCanCreate) return null;

  return (
    <>
      <Button onClick={() => setPickerOpen(true)} variant="outline" size="sm" className="gap-2">
        <ArrowRightLeft className="h-4 w-4" />
        New Referral
      </Button>

      <Dialog open={pickerOpen} onOpenChange={(open) => (open ? setPickerOpen(true) : setPickerOpen(false))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              New Referral
            </DialogTitle>
            <DialogDescription>
              Choose a patient, then create and send a referral. Manual patients are for printable referral cards.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="registered">Registered</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="registered" className="mt-4 space-y-4">
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

              <div className="space-y-2">
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {canSearch ? "No results yet. Try searching." : "Type at least 2 characters to search."}
                  </p>
                ) : (
                  results.map((p) => (
                    <Card
                      key={p.id}
                      className={`p-3 cursor-pointer hover:bg-muted ${selected?.id === p.id ? "border-primary" : ""}`}
                      onClick={() => setSelected(p)}
                    >
                      <div className="font-medium">{p.full_name}</div>
                      <div className="text-xs text-muted-foreground">{[p.email, p.phone].filter(Boolean).join(" • ") || "—"}</div>
                    </Card>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button>
                <Button disabled={!selected} onClick={openCreateForRegistered}>Continue</Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Patient Name</Label>
                    <Input
                      placeholder="Full name"
                      value={manualDraft.patient_name}
                      onChange={(e) => setManualDraft((p) => ({ ...p, patient_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>External Patient Ref (Optional)</Label>
                    <Input
                      placeholder="MRN / chart # / external ID"
                      value={manualDraft.external_patient_ref}
                      onChange={(e) => setManualDraft((p) => ({ ...p, external_patient_ref: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={manualDraft.patient_email}
                      onChange={(e) => setManualDraft((p) => ({ ...p, patient_email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (Optional)</Label>
                    <Input
                      placeholder="+1 555 000 0000"
                      value={manualDraft.patient_phone}
                      onChange={(e) => setManualDraft((p) => ({ ...p, patient_phone: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Manual patients do not get in-app notifications. Use this for printable cards.</p>
              </Card>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button>
                <Button disabled={!manualCanContinue} onClick={openCreateForManual}>Continue</Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {selected && (
        <CreateReferralDialog
          open={createOpen}
          onOpenChange={(open) => {
            if (!open) {
              setCreateOpen(false);
              setPickerOpen(true);
            } else setCreateOpen(true);
          }}
          patientId={selected.id}
          patientName={selected.full_name}
          onSubmit={async (data) => {
            const result = await createReferral(data as any, entityType, entityId);
            if (result.success && result.data) {
              await sendReferral(result.data.id);
              toast.success("Referral created and sent");
              setCreateOpen(false);
            } else {
              toast.error(result.error || "Failed to create referral");
            }
          }}
        />
      )}
    </>
  );
}
