import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  TestTube2,
  ClipboardList,
  Pill,
  History,
  AlertCircle,
  Plus,
  ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DiagnosticOrderCreator } from '@/components/clinic/DiagnosticOrderCreator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PatientInfo {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  avatar_url?: string;
  gender?: string;
  address?: string;
  allergies?: string;
  medical_history?: string;
  current_medications?: string;
}

interface PatientDetailViewProps {
  patient: PatientInfo;
  doctorId: string;
  clinicId?: string;
  onBack?: () => void;
  onOrderCreated?: () => void;
}

export const PatientDetailView = ({ 
  patient, 
  doctorId, 
  clinicId,
  onBack,
  onOrderCreated
}: PatientDetailViewProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOrderDialog, setShowOrderDialog] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Patient Details</h2>
          <p className="text-muted-foreground">View and manage patient information</p>
        </div>
      </div>

      {/* Patient Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={patient.avatar_url} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {patient.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{patient.full_name}</h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {patient.date_of_birth && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {calculateAge(patient.date_of_birth)} years old
                    </span>
                  )}
                  {patient.gender && (
                    <span className="capitalize">{patient.gender}</span>
                  )}
                  {patient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {patient.phone}
                    </span>
                  )}
                  {patient.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {patient.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setShowOrderDialog(true)}>
                  <TestTube2 className="h-4 w-4 mr-2" />
                  Order Diagnostic Test
                </Button>
                <Button variant="outline" size="sm">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Create Treatment Plan
                </Button>
                <Button variant="outline" size="sm">
                  <Pill className="h-4 w-4 mr-2" />
                  Prescribe Medication
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Allergies Alert */}
          {patient.allergies && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{patient.allergies}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Medical History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Medical History</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medical_history ? (
                  <p className="text-sm text-muted-foreground">{patient.medical_history}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No medical history recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Current Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Medications</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.current_medications ? (
                  <p className="text-sm text-muted-foreground">{patient.current_medications}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No current medications</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{patient.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{patient.email || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{patient.address || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Appointment History</h3>
              <p className="text-muted-foreground text-sm">
                Patient's appointment history will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <TestTube2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Test Results</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Patient's lab and imaging results will appear here
              </p>
              <Button onClick={() => setShowOrderDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Order New Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatments" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Treatment Plans</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Patient's treatment plans will appear here
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Treatment Plan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Clinical Notes</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add and view clinical notes for this patient
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diagnostic Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Diagnostic Test for {patient.full_name}</DialogTitle>
          </DialogHeader>
          {clinicId && (
            <DiagnosticOrderCreator
              clinicId={clinicId}
              patientId={patient.id}
              hasLabService={true}
              hasImagingService={true}
              onSuccess={() => {
                setShowOrderDialog(false);
                onOrderCreated?.();
              }}
            />
          )}
          {!clinicId && (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>You must be part of a clinic to order diagnostic tests</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
