import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Users, Calendar, FileText, Phone, Mail, MapPin, Clock, Eye, Plus } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  address: string;
  emergencyContact: string;
  lastVisit: string;
  nextAppointment?: string;
  condition: string;
  status: "active" | "inactive";
  visits: number;
  avatar?: string;
}

interface MedicalRecord {
  id: string;
  date: string;
  type: string;
  diagnosis: string;
  prescription: string;
  notes: string;
}

const AssignedPatientsSection = () => {
  const { t } = useTranslation("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [patients] = useState<Patient[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "(555) 123-4567",
      age: 45,
      gender: "Male",
      address: "123 Main St, New York, NY 10001",
      emergencyContact: "Jane Smith - (555) 123-4568",
      lastVisit: "2024-01-15",
      nextAppointment: "2024-02-01",
      condition: "Hypertension",
      status: "active",
      visits: 8
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(555) 234-5678",
      age: 32,
      gender: "Female",
      address: "456 Oak Ave, New York, NY 10002",
      emergencyContact: "Mike Johnson - (555) 234-5679",
      lastVisit: "2024-01-20",
      condition: "Diabetes Type 2",
      status: "active",
      visits: 12
    },
    {
      id: "3",
      name: "Michael Brown",
      email: "m.brown@email.com",
      phone: "(555) 345-6789",
      age: 28,
      gender: "Male",
      address: "789 Pine St, New York, NY 10003",
      emergencyContact: "Lisa Brown - (555) 345-6790",
      lastVisit: "2024-01-10",
      nextAppointment: "2024-01-30",
      condition: "Anxiety",
      status: "active",
      visits: 5
    },
    {
      id: "4",
      name: "Emily Davis",
      email: "emily.davis@email.com",
      phone: "(555) 456-7890",
      age: 58,
      gender: "Female",
      address: "321 Elm St, New York, NY 10004",
      emergencyContact: "Robert Davis - (555) 456-7891",
      lastVisit: "2023-12-15",
      condition: "Arthritis",
      status: "inactive",
      visits: 15
    }
  ]);

  const [medicalRecords] = useState<Record<string, MedicalRecord[]>>({
    "1": [
      {
        id: "r1",
        date: "2024-01-15",
        type: "Regular Checkup",
        diagnosis: "Hypertension - Well Controlled",
        prescription: "Lisinopril 10mg daily",
        notes: "Blood pressure stable. Continue current medication. Follow up in 6 weeks."
      },
      {
        id: "r2",
        date: "2023-12-01",
        type: "Follow-up",
        diagnosis: "Hypertension",
        prescription: "Lisinopril 10mg daily",
        notes: "Patient responding well to treatment. Minor side effects reported."
      }
    ],
    "2": [
      {
        id: "r3",
        date: "2024-01-20",
        type: "Diabetes Management",
        diagnosis: "Type 2 Diabetes - Good Control",
        prescription: "Metformin 500mg twice daily",
        notes: "HbA1c levels improved. Continue current diet and exercise regimen."
      }
    ],
    "3": [
      {
        id: "r4",
        date: "2024-01-10",
        type: "Mental Health Consultation",
        diagnosis: "Generalized Anxiety Disorder",
        prescription: "Sertraline 50mg daily",
        notes: "Patient shows improvement. Continue therapy sessions weekly."
      }
    ]
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = !searchQuery || 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const PatientDetailsModal = ({ patient }: { patient: Patient }) => {
    const patientRecords = medicalRecords[patient.id] || [];
    
    return (
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={patient.avatar} />
              <AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            {patient.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Medical Records</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span>{patient.age} years old</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span>{patient.gender}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right text-sm">{patient.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{patient.email}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medical Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Condition:</span>
                    <Badge variant="outline">{patient.condition}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Visits:</span>
                    <span>{patient.visits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Visit:</span>
                    <span>{new Date(patient.lastVisit).toLocaleDateString()}</span>
                  </div>
                  {patient.nextAppointment && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Appointment:</span>
                      <span>{new Date(patient.nextAppointment).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                      {patient.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{patient.emergencyContact}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Medical Records</h3>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </div>
            
            <div className="space-y-4">
              {patientRecords.map((record) => (
                <Card key={record.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{record.type}</CardTitle>
                        <p className="text-sm text-muted-foreground">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline">{record.diagnosis}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Prescription:</h4>
                      <p className="text-sm text-muted-foreground">{record.prescription}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Notes:</h4>
                      <p className="text-sm text-muted-foreground">{record.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {patientRecords.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p>No medical records found</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Appointment History</h3>
              <Button size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule New
              </Button>
            </div>
            
            <div className="space-y-3">
              {patient.nextAppointment && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Upcoming Appointment</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(patient.nextAppointment).toLocaleDateString()} at 10:00 AM
                        </p>
                      </div>
                      <Badge>Scheduled</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Regular Checkup</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(patient.lastVisit).toLocaleDateString()} at 2:00 PM
                      </p>
                    </div>
                    <Badge variant="outline">Completed</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                My Patients
              </CardTitle>
              <p className="text-muted-foreground">Manage your assigned patients and their medical records</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients by name or condition..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patient Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.filter(p => p.status === "active").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.filter(p => p.nextAppointment).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.reduce((sum, p) => sum + p.visits, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={patient.avatar} />
                    <AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{patient.name}</h3>
                      <Badge variant={patient.status === "active" ? "default" : "secondary"} className="text-xs">
                        {patient.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>{patient.age} years • {patient.gender}</span>
                        <span>{patient.condition}</span>
                        <span>{patient.visits} visits</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
                      {patient.nextAppointment && (
                        <span className="ml-4">
                          Next: {new Date(patient.nextAppointment).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    {selectedPatient && <PatientDetailsModal patient={selectedPatient} />}
                  </Dialog>
                </div>
              </div>
            ))}

            {filteredPatients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p>No patients found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignedPatientsSection;