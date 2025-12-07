import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Calendar,
  Heart,
  FileText,
  Plus,
  Pill,
  Scissors,
  Upload,
  StickyNote,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { VisitMode, PatientData, VisitData, AppointmentData, DoctorData } from "./types";

interface VisitSidebarProps {
  patient: PatientData;
  visit: VisitData;
  appointment: AppointmentData;
  doctor: DoctorData;
  mode: VisitMode;
  onAddDiagnosis: () => void;
  onAddPrescription: () => void;
  onAddTreatment: () => void;
  onUploadFile: () => void;
  onAddNotes: () => void;
  onEndVisit: () => void;
}

export const VisitSidebar = ({
  patient,
  visit,
  appointment,
  doctor,
  mode,
  onAddDiagnosis,
  onAddPrescription,
  onAddTreatment,
  onUploadFile,
  onAddNotes,
  onEndVisit,
}: VisitSidebarProps) => {
  const isEditable = mode === "current";

  return (
    <aside className="w-80 border-r bg-muted/30 flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Patient Overview */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium">{patient.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age</span>
                <span>{patient.age || "—"} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gender</span>
                <span className="capitalize">{patient.gender || "—"}</span>
              </div>
              <Separator className="my-2" />
              <div className="space-y-1.5">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="text-xs">{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="text-xs truncate">{patient.email}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs truncate">{patient.address}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* General Visit Info */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Visit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visit Type</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {visit.visitType?.replace("_", " ") || "Initial"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={visit.status === "completed" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {visit.status === "completed" ? "Completed" : "In Progress"}
                </Badge>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doctor</span>
                <span className="font-medium text-xs">Dr. {doctor.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clinic</span>
                <span className="text-xs">{doctor.practiceName || "—"}</span>
              </div>
              {visit.chiefComplaint && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <span className="text-muted-foreground text-xs">Chief Complaint</span>
                    <p className="mt-1 text-xs">{visit.chiefComplaint}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Vitals */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-background rounded-lg p-2 text-center">
                  <div className="text-muted-foreground">BP</div>
                  <div className="font-semibold">
                    {visit.vitals?.bloodPressureSystolic && visit.vitals?.bloodPressureDiastolic
                      ? `${visit.vitals.bloodPressureSystolic}/${visit.vitals.bloodPressureDiastolic}`
                      : "—"}
                  </div>
                </div>
                <div className="bg-background rounded-lg p-2 text-center">
                  <div className="text-muted-foreground">HR</div>
                  <div className="font-semibold">
                    {visit.vitals?.heartRate ? `${visit.vitals.heartRate} bpm` : "—"}
                  </div>
                </div>
                <div className="bg-background rounded-lg p-2 text-center">
                  <div className="text-muted-foreground">Temp</div>
                  <div className="font-semibold">
                    {visit.vitals?.temperature ? `${visit.vitals.temperature}°C` : "—"}
                  </div>
                </div>
                <div className="bg-background rounded-lg p-2 text-center">
                  <div className="text-muted-foreground">BMI</div>
                  <div className="font-semibold">
                    {visit.vitals?.bmi ? visit.vitals.bmi.toFixed(1) : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical History Preview */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-3 text-xs">
              <div>
                <div className="flex items-center gap-1 text-amber-600 font-medium mb-1">
                  <AlertTriangle className="h-3 w-3" />
                  Allergies
                </div>
                <p className="text-muted-foreground">
                  {patient.allergies || "No known allergies"}
                </p>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-muted-foreground mb-1">Current Medications</div>
                <p className="text-muted-foreground">
                  {patient.current_medications || "None recorded"}
                </p>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-muted-foreground mb-1">Past Diagnoses</div>
                <p className="text-muted-foreground line-clamp-2">
                  {patient.medical_history || "No history recorded"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {isEditable && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onAddDiagnosis}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Diagnosis
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onAddPrescription}
                >
                  <Pill className="h-3.5 w-3.5" />
                  Add Prescription
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onAddTreatment}
                >
                  <Scissors className="h-3.5 w-3.5" />
                  Add Treatment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onUploadFile}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={onAddNotes}
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Add Notes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* End Visit Button */}
      {isEditable && (
        <div className="p-4 border-t">
          <Button
            onClick={onEndVisit}
            className="w-full gap-2"
            variant="default"
          >
            <CheckCircle className="h-4 w-4" />
            End Visit
          </Button>
        </div>
      )}
    </aside>
  );
};
