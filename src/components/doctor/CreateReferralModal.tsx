import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, User, Building2, Pill, FlaskConical, Scan, Search, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CreateReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  onSuccess?: () => void;
}

type ReferralType = 'doctor' | 'pharmacy' | 'lab' | 'imaging';

interface ReferralTarget {
  id: string;
  name: string;
  type: string;
  specialty?: string;
  address?: string;
}

const CreateReferralModal = ({ isOpen, onClose, doctorId, onSuccess }: CreateReferralModalProps) => {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [referralType, setReferralType] = useState<ReferralType>('doctor');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ReferralTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ReferralTarget | null>(null);
  const [reason, setReason] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'emergency'>('routine');

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen, doctorId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchTargets();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, referralType]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_patients')
        .select('id, full_name, phone')
        .eq('doctor_id', doctorId)
        .eq('status', 'active')
        .order('full_name');
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const searchTargets = async () => {
    setSearchLoading(true);
    try {
      let results: ReferralTarget[] = [];
      
      switch (referralType) {
        case 'doctor':
          const { data: doctors } = await supabase
            .from('doctor_profiles_view')
            .select('id, full_name, specialty, practice_address')
            .ilike('full_name', `%${searchTerm}%`)
            .neq('id', doctorId)
            .limit(10);
          
          results = (doctors || []).map(d => ({
            id: d.id,
            name: d.full_name || 'Unknown Doctor',
            type: 'doctor',
            specialty: d.specialty,
            address: d.practice_address
          }));
          break;

        case 'pharmacy':
          const { data: pharmacies } = await supabase
            .from('pharmacies')
            .select('id, name, address, city')
            .ilike('name', `%${searchTerm}%`)
            .limit(10);
          
          results = (pharmacies || []).map(p => ({
            id: p.id,
            name: p.name,
            type: 'pharmacy',
            address: p.address ? `${p.address}, ${p.city}` : p.city || ''
          }));
          break;

        case 'lab':
          const { data: labs } = await supabase
            .from('lab_centers')
            .select('id, name, address, city')
            .ilike('name', `%${searchTerm}%`)
            .eq('status', 'active')
            .limit(10);
          
          results = (labs || []).map(l => ({
            id: l.id,
            name: l.name,
            type: 'lab',
            address: `${l.address}, ${l.city}`
          }));
          break;

        case 'imaging':
          const { data: imaging } = await supabase
            .from('imaging_centers')
            .select('id, name, address, city')
            .ilike('name', `%${searchTerm}%`)
            .eq('status', 'active')
            .limit(10);
          
          results = (imaging || []).map(i => ({
            id: i.id,
            name: i.name,
            type: 'imaging',
            address: `${i.address}, ${i.city}`
          }));
          break;
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatientId || !selectedTarget || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Get patient details
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      
      // Create referral using raw insert to avoid type issues
      const { error } = await supabase
        .from('referrals')
        .insert({
          referrer_type: 'doctor' as any,
          referrer_id: doctorId,
          receiver_type: referralType as any,
          receiver_id: selectedTarget.id,
          patient_id: selectedPatientId,
          patient_name: selectedPatient?.full_name,
          referral_type_enum: (referralType === 'doctor' ? 'specialist' : 
                              referralType === 'lab' ? 'lab_test' :
                              referralType === 'imaging' ? 'imaging' : 'pharmacy') as any,
          reason: reason,
          clinical_notes: clinicalNotes || null,
          priority: priority as any,
          status: 'pending' as any
        } as any);

      if (error) throw error;

      toast.success(`Referral sent to ${selectedTarget.name}`);
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error creating referral:', error);
      toast.error(error.message || "Failed to create referral");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatientId("");
    setSearchTerm("");
    setSearchResults([]);
    setSelectedTarget(null);
    setReason("");
    setClinicalNotes("");
    setPriority('routine');
    setReferralType('doctor');
  };

  const getIcon = (type: ReferralType) => {
    switch (type) {
      case 'doctor': return <User className="w-4 h-4" />;
      case 'pharmacy': return <Pill className="w-4 h-4" />;
      case 'lab': return <FlaskConical className="w-4 h-4" />;
      case 'imaging': return <Scan className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create New Referral
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Referral Type Selection */}
          <div className="space-y-3">
            <Label>Refer To</Label>
            <Tabs value={referralType} onValueChange={(v) => {
              setReferralType(v as ReferralType);
              setSearchTerm("");
              setSearchResults([]);
              setSelectedTarget(null);
            }}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="doctor" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Doctor
                </TabsTrigger>
                <TabsTrigger value="pharmacy" className="flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  Pharmacy
                </TabsTrigger>
                <TabsTrigger value="lab" className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  Lab
                </TabsTrigger>
                <TabsTrigger value="imaging" className="flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  Imaging
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Patient Selection */}
          <div className="space-y-2">
            <Label>Select Patient *</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name} {patient.phone && `(${patient.phone})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Target */}
          <div className="space-y-2">
            <Label>Search {referralType.charAt(0).toUpperCase() + referralType.slice(1)} *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={`Search for a ${referralType}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && !selectedTarget && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(result);
                      setSearchTerm(result.name);
                    }}
                    className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0 flex items-start gap-3"
                  >
                    <div className="mt-0.5">{getIcon(referralType)}</div>
                    <div>
                      <p className="font-medium">{result.name}</p>
                      {result.specialty && (
                        <p className="text-sm text-muted-foreground">{result.specialty}</p>
                      )}
                      {result.address && (
                        <p className="text-xs text-muted-foreground">{result.address}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Target Display */}
            {selectedTarget && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIcon(referralType)}
                  <div>
                    <p className="font-medium">{selectedTarget.name}</p>
                    {selectedTarget.specialty && (
                      <p className="text-sm text-muted-foreground">{selectedTarget.specialty}</p>
                    )}
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedTarget(null);
                    setSearchTerm("");
                  }}
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <Label>Priority</Label>
            <RadioGroup value={priority} onValueChange={(v) => setPriority(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="routine" id="routine" />
                <Label htmlFor="routine" className="font-normal cursor-pointer">Routine</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="font-normal cursor-pointer text-amber-600">Urgent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="emergency" id="emergency" />
                <Label htmlFor="emergency" className="font-normal cursor-pointer text-red-600">Emergency</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Referral *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this referral..."
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Clinical Notes */}
          <div className="space-y-2">
            <Label htmlFor="clinicalNotes">Clinical Notes (Optional)</Label>
            <Textarea
              id="clinicalNotes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Additional clinical information, history, test results..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading || !selectedPatientId || !selectedTarget || !reason}
            >
              {loading ? "Sending..." : "Send Referral"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReferralModal;
