import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, User, Mail, Phone, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import CreatePatientModal from "./CreatePatientModal";

type PatientSource = "registered" | "doctor_added";

export interface Patient {
  id: string; // profiles.user_id OR doctor_patients.id
  name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  created_at?: string;
  source: PatientSource;
}

interface PatientSelectorProps {
  value?: string;
  onSelect: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  /** When false, hides "Add new patient" affordances. Defaults to true. */
  allowCreate?: boolean;
}

const PatientSelector = ({
  value,
  onSelect,
  placeholder = "Search by name, email, or phone",
  className = "",
  required = false,
  allowCreate = true,
}: PatientSelectorProps) => {
  const { user } = useAuth();
  const { t } = useTranslation("dashboard");

  const [registeredPatients, setRegisteredPatients] = useState<Patient[]>([]);
  const [doctorPatients, setDoctorPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [mode, setMode] = useState<"all" | "registered" | "doctor_added">("all");

  useEffect(() => {
    const loadDoctorId = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }
      setDoctorId(data.id);
    };

    loadDoctorId();
  }, [user?.id]);

  useEffect(() => {
    if (!doctorId) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const fetchPatients = async () => {
    if (!doctorId) return;

    try {
      setLoading(true);

      // 1) Doctor-added patients
      const { data: dp, error: dpErr } = await supabase
        .from("doctor_patients")
        .select("id, full_name, phone, email, date_of_birth, created_at")
        .eq("doctor_id", doctorId)
        .eq("status", "active")
        .order("full_name");

      if (dpErr) throw dpErr;

      const doctorAdded: Patient[] = (dp ?? []).map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.email ?? undefined,
        phone: p.phone ?? undefined,
        date_of_birth: p.date_of_birth ?? undefined,
        created_at: p.created_at ?? undefined,
        source: "doctor_added",
      }));

      setDoctorPatients(doctorAdded);

      // 2) Registered patients the doctor has seen (appointments -> profiles)
      const { data: ap, error: apErr } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("doctor_id", doctorId);

      if (apErr) throw apErr;

      const ids = [...new Set((ap ?? []).map((x) => x.patient_id).filter(Boolean))] as string[];

      if (ids.length === 0) {
        setRegisteredPatients([]);
        return;
      }

      const { data: pr, error: prErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, date_of_birth, created_at")
        .in("user_id", ids);

      if (prErr) throw prErr;

      const reg: Patient[] = (pr ?? []).map((p) => ({
        id: p.user_id,
        name: p.full_name || "Unknown",
        email: p.email || undefined,
        phone: p.phone || undefined,
        date_of_birth: p.date_of_birth || undefined,
        created_at: p.created_at,
        source: "registered",
      }));

      setRegisteredPatients(reg);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const allPatients = useMemo(() => {
    const combined = [...doctorPatients, ...registeredPatients];
    if (mode === "registered") return combined.filter((p) => p.source === "registered");
    if (mode === "doctor_added") return combined.filter((p) => p.source === "doctor_added");
    return combined;
  }, [doctorPatients, registeredPatients, mode]);

  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allPatients;
    return allPatients.filter((p) => {
      const hay = `${p.name} ${p.email ?? ""} ${p.phone ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [allPatients, searchTerm]);

  const selectedPatient = allPatients.find((p) => p.id === value);

  const handleSelect = (p: Patient) => {
    onSelect(p);
    setShowDropdown(false);
    setSearchTerm("");
  };

  // ✅ Show selected patient as INPUT VALUE (not placeholder)
  const inputValue = showDropdown ? searchTerm : selectedPatient?.name ?? "";

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setShowDropdown(true);
            // When focusing with a selected patient, start fresh search
            if (selectedPatient) setSearchTerm("");
          }}
          className={`pl-10 pr-12 ${required && !value ? "border-destructive" : ""}`}
        />

        {allowCreate && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-7 w-7 p-0"
              title="Add new patient"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {required && !value && (
        <p className="text-xs text-destructive mt-1">Patient is required</p>
      )}

      {showDropdown && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b p-2">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList className="grid grid-cols-3 h-8">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="registered" className="text-xs">Registered</TabsTrigger>
                  <TabsTrigger value="doctor_added" className="text-xs">Doctor-added</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading patients...</div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground mb-3">No patients found</p>
                  {allowCreate && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowCreateModal(true);
                        setShowDropdown(false);
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t("doctor.booking.addNewPatient", "Add New Patient")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {filteredPatients.map((p) => (
                    <div
                      key={`${p.source}:${p.id}`}
                      onClick={() => handleSelect(p)}
                      className={`flex items-center gap-3 p-3 hover:bg-muted cursor-pointer ${
                        p.id === value ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>

                      <div className="flex-1">
                        <p className="font-medium">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {p.email ? (
                            <>
                              <Mail className="w-3 h-3" /> {p.email}
                            </>
                          ) : null}
                          {p.phone ? (
                            <>
                              <Phone className="w-3 h-3 ml-2" /> {p.phone}
                            </>
                          ) : null}
                        </div>
                      </div>

                      <Badge variant="outline" className="text-xs">
                        {p.source === "registered" ? "Registered" : "Doctor-added"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {allowCreate && (
        <CreatePatientModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={(newDoctorPatient) => {
            const p: Patient = {
              id: newDoctorPatient.id,
              name: newDoctorPatient.full_name,
              phone: newDoctorPatient.phone,
              email: newDoctorPatient.email ?? undefined,
              date_of_birth: newDoctorPatient.date_of_birth,
              created_at: newDoctorPatient.created_at,
              source: "doctor_added",
            };
            setDoctorPatients((prev) => [p, ...prev]);
            handleSelect(p);
          }}
        />
      )}

      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
      )}
    </div>
  );
};

export default PatientSelector;
