import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  User, 
  Search, 
  Pill,
  AlertTriangle,
  Calendar,
  FileText,
  Shield,
  Phone,
  Mail,
  Clock,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  allergies: string[];
  insurance_provider: string | null;
  insurance_policy_number: string | null;
}

interface MedicationHistory {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  dispensed_at: string;
  quantity: number;
  refills_remaining: number;
}

interface Props {
  pharmacyId: string;
}

export default function PharmacyPatientView({ pharmacyId }: Props) {
  const { t } = useTranslation("pharmacyAdminDashboard");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<MedicationHistory[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (pharmacyId) {
      fetchPatients();
    }
  }, [pharmacyId]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      // Fetch patients who have had prescriptions filled at this pharmacy
      const { data: orders, error } = await supabase
        .from('fulfillment_orders')
        .select('patient_id')
        .eq('pharmacy_id', pharmacyId);

      if (error) throw error;

      // Get unique patient IDs
      const uniquePatientIds = [...new Set(orders?.map(o => o.patient_id) || [])];

      if (uniquePatientIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, avatar_url')
          .in('user_id', uniquePatientIds);

        if (profilesError) throw profilesError;

        const patientsList: Patient[] = (profiles || []).map(p => ({
          id: p.user_id,
          full_name: p.full_name || 'Unknown',
          email: p.email || '',
          phone: p.phone || null,
          date_of_birth: null,
          avatar_url: p.avatar_url || null,
          allergies: [],
          insurance_provider: null,
          insurance_policy_number: null,
        }));

        setPatients(patientsList);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    try {
      const { data: orders, error } = await supabase
        .from('fulfillment_orders')
        .select(`
          id,
          created_at,
          prescription_id,
          prescriptions (
            prescription_items (
              medication_name,
              dosage,
              frequency,
              quantity
            ),
            refills_remaining
          )
        `)
        .eq('pharmacy_id', pharmacyId)
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const history: MedicationHistory[] = [];
      orders?.forEach(order => {
        const prescription = order.prescriptions as any;
        if (prescription?.prescription_items) {
          prescription.prescription_items.forEach((item: any) => {
            history.push({
              id: `${order.id}-${item.medication_name}`,
              medication_name: item.medication_name,
              dosage: item.dosage,
              frequency: item.frequency,
              dispensed_at: order.created_at,
              quantity: item.quantity,
              refills_remaining: prescription.refills_remaining || 0,
            });
          });
        }
      });

      setPatientHistory(history);
    } catch (error) {
      console.error('Error fetching patient history:', error);
    }
  };

  const viewPatientDetails = async (patient: Patient) => {
    setSelectedPatient(patient);
    await fetchPatientHistory(patient.id);
    setIsDetailsOpen(true);
  };

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Records
          </CardTitle>
          <CardDescription>
            View patient information and medication history (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search patients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No patients found</p>
              <p className="text-sm">Patients will appear here after filling prescriptions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map(patient => (
                <Card 
                  key={patient.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => viewPatientDetails(patient)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={patient.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {patient.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{patient.full_name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {patient.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {patient.email}
                              </span>
                            )}
                            {patient.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedPatient?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedPatient?.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedPatient?.full_name}</span>
                <p className="text-sm font-normal text-muted-foreground">Patient Profile</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="medications">Medication History</TabsTrigger>
                <TabsTrigger value="allergies">Allergies & Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </p>
                        <p className="font-medium">{selectedPatient.email || 'Not provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </p>
                        <p className="font-medium">{selectedPatient.phone || 'Not provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date of Birth
                        </p>
                        <p className="font-medium">
                          {selectedPatient.date_of_birth 
                            ? format(new Date(selectedPatient.date_of_birth), 'MMM d, yyyy')
                            : 'Not provided'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Insurance
                        </p>
                        <p className="font-medium">
                          {selectedPatient.insurance_provider || 'Not on file'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {patientHistory.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No recent prescriptions</p>
                    ) : (
                      <div className="space-y-2">
                        {patientHistory.slice(0, 3).map(med => (
                          <div key={med.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <div>
                              <p className="font-medium text-sm">{med.medication_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(med.dispensed_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Badge variant="outline">Qty: {med.quantity}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medications" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Medication History
                    </CardTitle>
                    <CardDescription>All medications dispensed at this pharmacy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {patientHistory.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No medication history found
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {patientHistory.map(med => (
                          <div key={med.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{med.medication_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {med.dosage} • {med.frequency}
                                </p>
                              </div>
                              <Badge variant="secondary">
                                {med.refills_remaining} refills left
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Quantity: {med.quantity}</span>
                              <span>Dispensed: {format(new Date(med.dispensed_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="allergies" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Allergies & Alerts
                    </CardTitle>
                    <CardDescription>Important safety information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedPatient.allergies.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No allergies on record</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Always verify allergies with the patient
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedPatient.allergies.map((allergy, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <span className="font-medium">{allergy}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
