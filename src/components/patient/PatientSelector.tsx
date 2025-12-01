import { useState, useEffect } from "react";
import { Search, Plus, User, Mail, Phone, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import CreatePatientModal from "./CreatePatientModal";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  created_at: string;
  source?: "appointment" | "added";
}

interface PatientSelectorProps {
  value?: string;
  onSelect: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const PatientSelector = ({ 
  value, 
  onSelect, 
  placeholder = "Search by name, email, or phone",
  className = "",
  required = false
}: PatientSelectorProps) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchMode, setSearchMode] = useState<"all" | "phone" | "email">("all");
  const [externalSearchResult, setExternalSearchResult] = useState<Patient | null>(null);
  const [searchingExternal, setSearchingExternal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [user]);

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm, searchMode]);

  const fetchPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get doctor ID
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) {
        setPatients([]);
        setLoading(false);
        return;
      }

      // Get unique patient IDs from appointments (patients who have booked)
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorData.id);

      const uniquePatientIds = appointmentData 
        ? [...new Set(appointmentData.map(apt => apt.patient_id).filter(Boolean))]
        : [];

      // Get patient profiles from appointments
      let appointmentPatients: Patient[] = [];
      if (uniquePatientIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, date_of_birth, created_at')
          .in('user_id', uniquePatientIds);

        appointmentPatients = (profileData || []).map(profile => ({
          id: profile.user_id,
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
          phone: profile.phone || undefined,
          date_of_birth: profile.date_of_birth || undefined,
          created_at: profile.created_at,
          source: "appointment" as const
        }));
      }

      // Get patients added by the doctor (from treatment plans without appointments)
      const { data: treatmentPlanData } = await supabase
        .from('treatment_plans')
        .select('patient_id')
        .eq('doctor_id', doctorData.id)
        .not('patient_id', 'is', null);

      const treatmentPatientIds = treatmentPlanData 
        ? [...new Set(treatmentPlanData.map(tp => tp.patient_id).filter(Boolean))]
        : [];

      // Filter out patients already in appointments
      const additionalPatientIds = treatmentPatientIds.filter(
        id => !uniquePatientIds.includes(id)
      );

      let addedPatients: Patient[] = [];
      if (additionalPatientIds.length > 0) {
        const { data: addedProfileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, date_of_birth, created_at')
          .in('user_id', additionalPatientIds);

        addedPatients = (addedProfileData || []).map(profile => ({
          id: profile.user_id,
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
          phone: profile.phone || undefined,
          date_of_birth: profile.date_of_birth || undefined,
          created_at: profile.created_at,
          source: "added" as const
        }));
      }

      setPatients([...appointmentPatients, ...addedPatients]);
    } catch (error: any) {
      console.error("Failed to load patients:", error);
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    if (searchTerm.trim() === "") {
      setFilteredPatients(patients);
      setExternalSearchResult(null);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    let filtered: Patient[];

    if (searchMode === "phone") {
      filtered = patients.filter(patient =>
        patient.phone?.toLowerCase().includes(term)
      );
    } else if (searchMode === "email") {
      filtered = patients.filter(patient =>
        patient.email.toLowerCase().includes(term)
      );
    } else {
      filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(term) ||
        patient.email.toLowerCase().includes(term) ||
        patient.phone?.toLowerCase().includes(term)
      );
    }

    setFilteredPatients(filtered);
  };

  const searchExternalPatient = async () => {
    if (!searchTerm.trim()) return;

    setSearchingExternal(true);
    try {
      // Search in all profiles by email or phone
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, date_of_birth, created_at')
        .or(`email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        const patient: Patient = {
          id: profile.user_id,
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
          phone: profile.phone || undefined,
          date_of_birth: profile.date_of_birth || undefined,
          created_at: profile.created_at,
          source: "added"
        };
        setExternalSearchResult(patient);
        toast.success("Patient found!");
      } else {
        setExternalSearchResult(null);
        toast.info("No patient found with that email or phone");
      }
    } catch (error) {
      console.error("Error searching external patient:", error);
      toast.error("Error searching for patient");
    } finally {
      setSearchingExternal(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    onSelect(patient);
    setShowDropdown(false);
    setSearchTerm("");
    setExternalSearchResult(null);
  };

  const selectedPatient = patients.find(p => p.id === value) || 
    (externalSearchResult?.id === value ? externalSearchResult : null);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder={selectedPatient ? selectedPatient.name : placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className={`pl-10 pr-24 ${required && !value ? 'border-destructive' : ''}`}
        />
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={searchExternalPatient}
            disabled={searchingExternal || !searchTerm.trim()}
            className="h-7 px-2 text-xs"
            title="Search by email/phone"
          >
            {searchingExternal ? "..." : <Search className="w-3 h-3" />}
          </Button>
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
      </div>

      {required && !value && (
        <p className="text-xs text-destructive mt-1">Patient is required</p>
      )}

      {showDropdown && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-hidden">
          <CardContent className="p-0">
            {/* Search Mode Tabs */}
            <div className="border-b p-2">
              <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as any)}>
                <TabsList className="grid grid-cols-3 h-8">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="email" className="text-xs">
                    <Mail className="w-3 h-3 mr-1" /> Email
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="text-xs">
                    <Phone className="w-3 h-3 mr-1" /> Phone
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading patients...
                </div>
              ) : (
                <>
                  {/* External search result */}
                  {externalSearchResult && !patients.find(p => p.id === externalSearchResult.id) && (
                    <div className="border-b">
                      <div className="px-3 py-1 bg-muted/50 text-xs font-medium text-muted-foreground">
                        Found Patient
                      </div>
                      <div
                        onClick={() => handlePatientSelect(externalSearchResult)}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer bg-primary/5"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{externalSearchResult.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {externalSearchResult.email}
                            {externalSearchResult.phone && (
                              <>
                                <Phone className="w-3 h-3 ml-2" />
                                {externalSearchResult.phone}
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">New</Badge>
                      </div>
                    </div>
                  )}

                  {/* Existing patients */}
                  {filteredPatients.length === 0 && !externalSearchResult ? (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground mb-2">
                        {searchTerm ? "No patients found in your records" : "No patients available"}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Try searching by email or phone to find existing users
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowCreateModal(true);
                          setShowDropdown(false);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Patient
                      </Button>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredPatients.length > 0 && (
                        <div className="px-3 py-1 bg-muted/50 text-xs font-medium text-muted-foreground">
                          Your Patients ({filteredPatients.length})
                        </div>
                      )}
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => handlePatientSelect(patient)}
                          className={`flex items-center gap-3 p-3 hover:bg-muted cursor-pointer ${
                            patient.id === value ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{patient.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {patient.email}
                              {patient.phone && (
                                <>
                                  <Phone className="w-3 h-3 ml-2" />
                                  {patient.phone}
                                </>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              patient.source === 'appointment' 
                                ? 'border-green-500/50 text-green-600' 
                                : 'border-blue-500/50 text-blue-600'
                            }`}
                          >
                            {patient.source === 'appointment' ? 'Booked' : 'Added'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Patient Modal */}
      <CreatePatientModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(newPatient) => {
          setPatients(prev => [newPatient, ...prev]);
          handlePatientSelect(newPatient);
          setShowCreateModal(false);
        }}
      />

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default PatientSelector;
