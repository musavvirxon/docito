import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Search, Loader2, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useReferralActions } from "@/hooks/useReferrals";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateReferrals } from "@/lib/referrals/permissions";

type RegisteredPatient = {
  id: string; // profiles.user_id
  full_name: string;
  email: string | null;
  phone: string | null;
  type: "registered";
};

type DoctorMadePatient = {
  id: string; // doctor_patients.id
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string;
  type: "doctor_made";
};

type PatientResult = RegisteredPatient | DoctorMadePatient;

export function DoctorReferralsSection() {
  const { doctorProfile } = useDoctorData();
  const { createReferral, sendReferral } = useReferralActions();
  const { allRoles } = useAuth();

  const uiCanCreate = canCreateReferrals(allRoles);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"registered" | "doctor_made">("registered");
  const [referralRefreshKey, setReferralRefreshKey] = useState(0);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredResults, setRegisteredResults] = useState<RegisteredPatient[]>([]);
  const [doctorMadeResults, setDoctorMadeResults] = useState<DoctorMadePatient[]>([]);
  const [selected, setSelected] = useState<PatientResult | null>(null);

  useEffect(() => {
    if (!pickerOpen) {
      setQ("");
      setRegisteredResults([]);
      setDoctorMadeResults([]);
      setSelected(null);
      setLoading(false);
      setActiveTab("registered");
    }
  }, [pickerOpen]);

  // Load doctor's own patients when picker opens
  useEffect(() => {
    if (pickerOpen && doctorProfile?.id) {
      loadDoctorPatients();
    }
  }, [pickerOpen, doctorProfile?.id]);

  const loadDoctorPatients = async () => {
    if (!doctorProfile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("doctor_patients")
        .select("id, full_name, email, phone, date_of_birth")
        .eq("doctor_id", doctorProfile.id)
        .eq("status", "active")
        .order("full_name");

      if (error) throw error;

      setDoctorMadeResults(
        (data ?? []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name || "Unknown",
          email: p.email ?? null,
          phone: p.phone ?? null,
          date_of_birth: p.date_of_birth,
          type: "doctor_made" as const,
        }))
      );
    } catch (e: any) {
      console.error("Error loading doctor patients:", e);
    }
  };

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  const runSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    try {
      const term = q.trim();

      // Search registered patients
      const { data: registeredData, error: registeredError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .eq("role", "patient")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(10);

      if (registeredError) throw registeredError;

      setRegisteredResults(
        (registeredData ?? []).map((p: any) => ({
          id: p.user_id,
          full_name: p.full_name || "Unknown",
          email: p.email ?? null,
          phone: p.phone ?? null,
          type: "registered" as const,
        }))
      );

      // Also filter doctor-made patients
      if (doctorProfile?.id) {
        const { data: doctorPatientsData, error: doctorPatientsError } = await supabase
          .from("doctor_patients")
          .select("id, full_name, email, phone, date_of_birth")
          .eq("doctor_id", doctorProfile.id)
          .eq("status", "active")
          .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
          .limit(10);

        if (!doctorPatientsError && doctorPatientsData) {
          setDoctorMadeResults(
            doctorPatientsData.map((p: any) => ({
              id: p.id,
              full_name: p.full_name || "Unknown",
              email: p.email ?? null,
              phone: p.phone ?? null,
              date_of_birth: p.date_of_birth,
              type: "doctor_made" as const,
            }))
          );
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selected) return;
    setPickerOpen(false);
    setCreateOpen(true);
  };

  if (!doctorProfile) return null;

  const currentResults = activeTab === "registered" ? registeredResults : doctorMadeResults;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Referrals</h2>
        </div>

        {uiCanCreate && (
          <Button onClick={() => setPickerOpen(true)} variant="outline" size="sm">
            New Referral
          </Button>
        )}
      </div>

      <ReferralsSection
        role="referrer"
        entityType="doctor"
        entityId={doctorProfile.id}
        showCreateButton={false}
        title=""
        key={referralRefreshKey}
      />

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
            <DialogTitle>Select Patient for Referral</DialogTitle>
            <DialogDescription>
              Choose a registered patient or one of your own patients
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "registered" | "doctor_made")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registered" className="gap-2">
                <Users className="h-4 w-4" />
                Registered Patients
              </TabsTrigger>
              <TabsTrigger value="doctor_made" className="gap-2">
                <Users className="h-4 w-4" />
                Your Patients ({doctorMadeResults.length})
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
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

              <TabsContent value="registered" className="mt-3">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {registeredResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {canSearch ? "No registered patients found. Try searching." : "Type at least 2 characters to search."}
                    </p>
                  ) : (
                    registeredResults.map((p) => (
                      <Card
                        key={p.id}
                        className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                          selected?.id === p.id && selected?.type === "registered" ? "border-primary ring-1 ring-primary" : ""
                        }`}
                        onClick={() => setSelected(p)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{p.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {[p.email, p.phone].filter(Boolean).join(" • ")}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">Registered</Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="doctor_made" className="mt-3">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {doctorMadeResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No patients found. Add patients from your dashboard first.
                    </p>
                  ) : (
                    doctorMadeResults.map((p) => (
                      <Card
                        key={p.id}
                        className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                          selected?.id === p.id && selected?.type === "doctor_made" ? "border-primary ring-1 ring-primary" : ""
                        }`}
                        onClick={() => setSelected(p)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{p.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {[p.email, p.phone, p.date_of_birth ? `DOB: ${p.date_of_birth}` : null].filter(Boolean).join(" • ")}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">Your Patient</Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!selected} onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selected && (
        <CreateReferralDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          patientId={selected.id}
          patientName={selected.full_name}
          onSubmit={async (data) => {
            if (!uiCanCreate) {
              toast.error("Your account cannot create referrals");
              return;
            }
            
            // For doctor-made patients, we use doctor_patient_id instead of patient_id
            const referralData = {
              ...data,
              // If it's a doctor-made patient, set doctor_patient_id
              ...(selected.type === "doctor_made" ? { doctor_patient_id: selected.id, patient_id: null } : {}),
            };
            
            const result = await createReferral(referralData, "doctor", doctorProfile.id);
            if (result.success && result.data) {
              await sendReferral(result.data.id);
              toast.success("Referral created and sent");
              setReferralRefreshKey(prev => prev + 1);
            } else {
              toast.error(result.error || "Failed to create referral");
            }
          }}
        />
      )}
    </>
  );
}
