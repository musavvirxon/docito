import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Calendar, FileText, Plus, ArrowUpDown, Phone, ChevronRight, UserPlus } from "lucide-react";
import { useDoctorPatients } from "@/hooks/useDoctorPatients";
import { useDoctorPatientsV2, DoctorPatient } from "@/hooks/useDoctorPatientsV2";
import { useTranslation } from "react-i18next";

interface PatientListSectionProps {
  onSelectPatient: (patientId: string) => void;
  onSelectDirectPatient?: (patientId: string) => void;
  onAddPatient: () => void;
}

type SortOption = "name-asc" | "name-desc" | "newest" | "oldest";

const PatientListSection = ({ onSelectPatient, onSelectDirectPatient, onAddPatient }: PatientListSectionProps) => {
  const { t } = useTranslation("patients");
  const { patients: appointmentPatients, loading: loadingAppointment } = useDoctorPatients();
  const { patients: directPatients, loading: loadingDirect } = useDoctorPatientsV2();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [activeTab, setActiveTab] = useState<string>("all");

  const loading = loadingAppointment || loadingDirect;

  // Combine both patient sources for "all" tab
  const allPatients = useMemo(() => {
    const appointmentMapped = appointmentPatients.map(p => ({
      id: p.id,
      name: p.full_name || "Unknown",
      email: p.email,
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      avatar: p.avatar_url,
      status: p.status,
      lastVisit: p.lastVisit,
      totalVisits: p.totalVisits,
      created_at: p.created_at,
      type: 'appointment' as const,
      userId: p.user_id,
    }));

    const directMapped = directPatients.map(p => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      avatar: p.profile_photo_url,
      status: p.status,
      lastVisit: null,
      totalVisits: 0,
      created_at: p.created_at,
      type: 'direct' as const,
      userId: p.id,
    }));

    return [...appointmentMapped, ...directMapped];
  }, [appointmentPatients, directPatients]);

  const filteredPatients = useMemo(() => {
    let result = activeTab === "direct" 
      ? allPatients.filter(p => p.type === 'direct')
      : activeTab === "appointment" 
        ? allPatients.filter(p => p.type === 'appointment')
        : allPatients;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.phone?.toLowerCase().includes(query) ||
          p.id?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Gender filter
    if (genderFilter !== "all") {
      result = result.filter((p) => p.gender?.toLowerCase() === genderFilter.toLowerCase());
    }

    // Sort
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
    }

    return result;
  }, [allPatients, activeTab, searchQuery, statusFilter, genderFilter, sortOption]);

  const stats = useMemo(() => ({
    total: allPatients.length,
    active: allPatients.filter((p) => p.status === "active").length,
    inactive: allPatients.filter((p) => p.status === "inactive").length,
    fromAppointments: appointmentPatients.length,
    directlyAdded: directPatients.length,
  }), [allPatients, appointmentPatients, directPatients]);

  const handlePatientClick = (patient: typeof filteredPatients[0]) => {
    if (patient.type === 'direct' && onSelectDirectPatient) {
      onSelectDirectPatient(patient.id);
    } else {
      onSelectPatient(patient.userId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("dashboard.title", "Patients")}
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your patients and their medical records
              </p>
            </div>
            <Button onClick={onAddPatient}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Patient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-40">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fromAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Directly Added</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.directlyAdded}</div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== "all" || genderFilter !== "all"
                        ? "No patients found matching your criteria"
                        : t("appointments.noAppointments", "No patients found")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => (
                  <TableRow
                    key={`${patient.type}-${patient.id}`}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handlePatientClick(patient)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={patient.avatar || undefined} />
                          <AvatarFallback>
                            {patient.name?.split(" ").map((n) => n[0]).join("") || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{patient.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{patient.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{patient.age || "—"}</TableCell>
                    <TableCell className="capitalize">{patient.gender || "—"}</TableCell>
                    <TableCell>
                      {patient.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {patient.phone}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {patient.type === 'direct' ? 'Added' : 'Appointment'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={patient.status === "active" ? "default" : "secondary"}
                        className={
                          patient.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : ""
                        }
                      >
                        {patient.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Patients Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No patients found</p>
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Card
              key={`${patient.type}-${patient.id}`}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePatientClick(patient)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={patient.avatar || undefined} />
                      <AvatarFallback>
                        {patient.name?.split(" ").map((n) => n[0]).join("") || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{patient.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {patient.age ? `${patient.age} yrs` : ""} {patient.gender ? `• ${patient.gender}` : ""}
                      </p>
                      {patient.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {patient.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={patient.status === "active" ? "default" : "secondary"}
                      className={
                        patient.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : ""
                      }
                    >
                      {patient.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {patient.type === 'direct' ? 'Added' : 'Appt'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-sm text-muted-foreground">
                  <span className="capitalize">{patient.type}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientListSection;
