import { useState, useEffect } from "react";
import { Search, Plus, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreatePatientModal from "./CreatePatientModal";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  created_at: string;
}

interface PatientSelectorProps {
  value?: string;
  onSelect: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
}

const PatientSelector = ({ 
  value, 
  onSelect, 
  placeholder = "Select a patient",
  className = ""
}: PatientSelectorProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  }, [patients, searchTerm]);

  const fetchPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For now, we'll create mock patients. In a real app, you'd have a patients table
      // linked to the dentist or practice
      const mockPatients: Patient[] = [
        {
          id: "patient1@example.com",
          name: "John Smith",
          email: "patient1@example.com",
          phone: "(555) 123-4567",
          created_at: new Date().toISOString()
        },
        {
          id: "patient2@example.com", 
          name: "Sarah Johnson",
          email: "patient2@example.com",
          phone: "(555) 987-6543",
          created_at: new Date().toISOString()
        },
        {
          id: "patient3@example.com",
          name: "Michael Brown",
          email: "patient3@example.com",
          phone: "(555) 555-0123",
          created_at: new Date().toISOString()
        },
        {
          id: "patient4@example.com",
          name: "Emily Davis",
          email: "patient4@example.com",
          phone: "(555) 234-5678",
          created_at: new Date().toISOString()
        }
      ];

      setPatients(mockPatients);
    } catch (error: any) {
      toast.error("Failed to load patients: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    onSelect(patient);
    setShowDropdown(false);
    setSearchTerm("");
  };

  const selectedPatient = patients.find(p => p.id === value);

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
          className="pl-10 pr-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {showDropdown && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading patients...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground mb-2">
                  {searchTerm ? "No patients found" : "No patients available"}
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
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handlePatientSelect(patient)}
                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{patient.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {patient.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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