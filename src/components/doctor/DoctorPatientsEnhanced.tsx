import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Plus, 
  User,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PatientDetailView } from './PatientDetailView';

interface Patient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string;
  gender: string | null;
  status: string;
  created_at: string;
  allergies?: string | null;
  medical_history?: string | null;
  current_medications?: string | null;
  address?: string | null;
}

export const DoctorPatientsEnhanced = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDoctorInfo();
    }
  }, [user]);

  const fetchDoctorInfo = async () => {
    try {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id, practice_id')
        .eq('user_id', user?.id)
        .single();

      if (doctor) {
        setDoctorId(doctor.id);
        setClinicId(doctor.practice_id);
        fetchPatients(doctor.id);
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
      setLoading(false);
    }
  };

  const fetchPatients = async (docId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('doctor_patients')
        .select('*')
        .eq('doctor_id', docId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery)
  );

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Show patient detail view if one is selected
  if (selectedPatient && doctorId) {
    return (
      <PatientDetailView
        patient={{
          id: selectedPatient.id,
          full_name: selectedPatient.full_name,
          email: selectedPatient.email || undefined,
          phone: selectedPatient.phone || undefined,
          date_of_birth: selectedPatient.date_of_birth,
          gender: selectedPatient.gender || undefined,
          allergies: selectedPatient.allergies || undefined,
          medical_history: selectedPatient.medical_history || undefined,
          current_medications: selectedPatient.current_medications || undefined,
          address: selectedPatient.address || undefined,
        }}
        doctorId={doctorId}
        clinicId={clinicId || undefined}
        onBack={() => setSelectedPatient(null)}
        onOrderCreated={() => {
          // Refresh data if needed
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Patients</h2>
          <p className="text-muted-foreground">Manage your patient records</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold">{patients.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => p.status === 'active').length}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Month</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => {
                    const created = new Date(p.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && 
                           created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Allergies</p>
                <p className="text-2xl font-bold">
                  {patients.filter(p => p.allergies).length}
                </p>
              </div>
              <Badge variant="destructive">Alert</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">No Patients Found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Add your first patient to get started'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPatient(patient)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {patient.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{patient.full_name}</h3>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            patient.status === 'active' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-gray-50 text-gray-700'
                          )}
                        >
                          {patient.status}
                        </Badge>
                        {patient.allergies && (
                          <Badge variant="destructive" className="text-xs">
                            Allergies
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{calculateAge(patient.date_of_birth)} years old</span>
                        {patient.gender && <span className="capitalize">{patient.gender}</span>}
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </span>
                        )}
                        {patient.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {patient.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatient(patient);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedPatient(patient)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>Book Appointment</DropdownMenuItem>
                        <DropdownMenuItem>Order Test</DropdownMenuItem>
                        <DropdownMenuItem>Create Treatment Plan</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
