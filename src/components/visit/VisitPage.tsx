import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { VisitHeader } from "./VisitHeader";
import { VisitSidebar } from "./VisitSidebar";
import { EnhancedDentalChart, ToothProcedure } from "@/components/dental";
import { DiagnosisTab } from "./tabs/DiagnosisTab";
import OrthopedicSkeletonChart, { type BodyRegion } from "@/components/anatomy/OrthopedicSkeletonChart";
import { TreatmentTab } from "./tabs/TreatmentTab";
import { PrescriptionTab } from "./tabs/PrescriptionTab";
import { FilesTab } from "./tabs/FilesTab";
import { NotesTab } from "./tabs/NotesTab";
import { isDentalSpecialty } from "@/lib/clinicalSpecialties";
import {
  VisitMode,
  PatientData,
  VisitData,
  AppointmentData,
  DoctorData,
  Diagnosis,
  Treatment,
  VisitPrescription,
  VisitFile,
  SOAPNotes,
} from "./types";

interface VisitPageProps {
  mode: VisitMode;
  patient: PatientData;
  visit: VisitData;
  appointment: AppointmentData;
  doctor: DoctorData;
  onVisitUpdate?: (visit: Partial<VisitData>) => void;
  onEndVisit?: () => void;
}

const isOrthopedic = (specialty: string) => {
  const s = (specialty || "").toLowerCase();
  return (
    s.includes("orthopedic") ||
    s.includes("orthopaedic") ||
    s.includes("ortho") ||
    s.includes("sports medicine")
  );
};

export const VisitPage = ({
  mode,
  patient,
  visit: initialVisit,
  appointment,
  doctor,
  onVisitUpdate,
  onEndVisit,
}: VisitPageProps) => {
  const [visit, setVisit] = useState<VisitData>(initialVisit);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [selectedBodyRegions, setSelectedBodyRegions] = useState<BodyRegion[]>([]);
  const [activeTab, setActiveTab] = useState("diagnosis");
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  const specialty = doctor?.specialty || "";
  const showDentalChart = isDentalSpecialty(specialty);
  const showOrthoChart = !showDentalChart && isOrthopedic(specialty);

  const updateVisit = useCallback(
    (updates: Partial<VisitData>) => {
      setVisit((prev) => ({ ...prev, ...updates }));
      setLastSaved(new Date());
      onVisitUpdate?.(updates);
    },
    [onVisitUpdate]
  );

  // ---------- Ortho chart handlers ----------
  const handleBodyRegionToggle = (region: BodyRegion) => {
    setSelectedBodyRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const clearBodyRegions = () => setSelectedBodyRegions([]);

  // ---------- Diagnosis handlers ----------
  const handleAddDiagnosis = (diagnosis: Omit<Diagnosis, "id" | "createdAt">) => {
    const newDiagnosis: Diagnosis = {
      ...diagnosis,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      toothNumbers: showDentalChart ? selectedTeeth : undefined,
      bodyRegions: showOrthoChart ? selectedBodyRegions : undefined,
    };

    updateVisit({ diagnoses: [...visit.diagnoses, newDiagnosis] });
    toast.success("Diagnosis added");

    // Optional: clear selections after adding diagnosis
    if (showDentalChart) setSelectedTeeth([]);
    if (showOrthoChart) setSelectedBodyRegions([]);
  };

  const handleRemoveDiagnosis = (id: string) => {
    updateVisit({ diagnoses: visit.diagnoses.filter((d) => d.id !== id) });
    toast.success("Diagnosis removed");
  };

  // ---------- Treatment handlers ----------
  const handleAddTreatment = (treatment: Omit<Treatment, "id" | "createdAt">) => {
    const newTreatment: Treatment = {
      ...treatment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    updateVisit({ treatments: [...visit.treatments, newTreatment] });
    toast.success("Treatment added");
  };

  const handleRemoveTreatment = (id: string) => {
    updateVisit({ treatments: visit.treatments.filter((t) => t.id !== id) });
  };

  const handleUpdateTreatmentStatus = (id: string, status: Treatment["status"]) => {
    updateVisit({
      treatments: visit.treatments.map((t) => (t.id === id ? { ...t, status } : t)),
    });
  };

  // ---------- Prescription handlers ----------
  const handleAddPrescription = (rx: Omit<VisitPrescription, "id" | "createdAt">) => {
    const newRx: VisitPrescription = {
      ...rx,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    updateVisit({ prescriptions: [...visit.prescriptions, newRx] });
    toast.success("Prescription added");
  };

  const handleRemovePrescription = (id: string) => {
    updateVisit({ prescriptions: visit.prescriptions.filter((p) => p.id !== id) });
  };

  // ---------- File handlers ----------
  const handleUploadFiles = (files: FileList) => {
    const newFiles: VisitFile[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type,
      size: f.size,
      url: URL.createObjectURL(f),
      uploadedAt: new Date().toISOString(),
    }));
    updateVisit({ files: [...visit.files, ...newFiles] });
    toast.success(`${newFiles.length} file(s) uploaded`);
  };

  const handleDeleteFile = (id: string) => {
    updateVisit({ files: visit.files.filter((f) => f.id !== id) });
  };

  const handleDownloadFile = (file: VisitFile) => {
    if (file.url) window.open(file.url, "_blank");
  };

  // ---------- Notes handler ----------
  const handleNotesChange = (notes: SOAPNotes) => {
    updateVisit({ notes });
  };

  // ---------- PDF handler ----------
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const { downloadPatientSummaryPDF } = await import("@/utils/generatePatientPDF");
      await downloadPatientSummaryPDF({
        patient,
        clinicName: doctor.practiceName,
        doctorName: doctor.name,
      });
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  // ---------- Dental chart handlers ----------
  const handleToothSelect = (toothNumber: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(toothNumber) ? prev.filter((t) => t !== toothNumber) : [...prev, toothNumber]
    );
  };

  const handleAssignProcedure = (teeth: number[], procedure: Omit<ToothProcedure, "id">) => {
    const newTreatment: Treatment = {
      id: crypto.randomUUID(),
      name: procedure.name,
      code: procedure.code,
      notes: procedure.notes,
      status: "planned",
      toothNumbers: teeth,
      createdAt: new Date().toISOString(),
    };
    updateVisit({ treatments: [...visit.treatments, newTreatment] });
    setSelectedTeeth([]);
    toast.success(
      `${procedure.name} assigned to ${teeth.length} tooth${teeth.length > 1 ? "es" : ""}`
    );
  };

  const handleEndVisit = () => {
    updateVisit({ status: "completed" });
    onEndVisit?.();
    toast.success("Visit completed");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <VisitHeader
        patient={patient}
        appointment={appointment}
        specialty={specialty}
        mode={mode}
        onDownloadPDF={handleDownloadPDF}
        isDownloading={isDownloading}
      />

      <div className="flex-1 flex overflow-hidden">
        <VisitSidebar
          patient={patient}
          visit={visit}
          appointment={appointment}
          doctor={doctor}
          mode={mode}
          onAddDiagnosis={() => setActiveTab("diagnosis")}
          onAddPrescription={() => setActiveTab("prescriptions")}
          onAddTreatment={() => setActiveTab("treatment")}
          onUploadFile={() => setActiveTab("files")}
          onAddNotes={() => setActiveTab("notes")}
          onEndVisit={handleEndVisit}
        />

        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {showDentalChart && (
                <EnhancedDentalChart
                  teethData={visit.dentalChart || []}
                  isEditable={mode === "current"}
                  selectedTeeth={selectedTeeth}
                  onToothSelect={handleToothSelect}
                  onAssignProcedure={handleAssignProcedure}
                />
              )}

              {showOrthoChart && (
                <OrthopedicSkeletonChart
                  selected={selectedBodyRegions}
                  onToggle={handleBodyRegionToggle}
                  onClear={clearBodyRegions}
                  isEditable={mode === "current"}
                />
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                  <TabsTrigger value="treatment">Treatment</TabsTrigger>
                  <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="diagnosis" className="mt-6">
                  <DiagnosisTab
                    diagnoses={visit.diagnoses}
                    mode={mode}
                    onAddDiagnosis={handleAddDiagnosis}
                    onRemoveDiagnosis={handleRemoveDiagnosis}
                  />
                </TabsContent>

                <TabsContent value="treatment" className="mt-6">
                  <TreatmentTab
                    treatments={visit.treatments}
                    mode={mode}
                    isDentist={showDentalChart}
                    selectedTeeth={selectedTeeth}
                    onAddTreatment={handleAddTreatment}
                    onRemoveTreatment={handleRemoveTreatment}
                    onUpdateStatus={handleUpdateTreatmentStatus}
                  />
                </TabsContent>

                <TabsContent value="prescriptions" className="mt-6">
                  <PrescriptionTab
                    mode={mode}
                    patientId={patient.id}
                    doctorId={doctor.id}
                    appointmentId={visit.appointmentId}
                    onPrint={() => toast.info("Print functionality coming soon")}
                  />
                </TabsContent>

                <TabsContent value="files" className="mt-6">
                  <FilesTab
                    files={visit.files}
                    mode={mode}
                    onUpload={handleUploadFiles}
                    onDelete={handleDeleteFile}
                    onDownload={handleDownloadFile}
                  />
                </TabsContent>

                <TabsContent value="notes" className="mt-6">
                  <NotesTab
                    notes={visit.notes}
                    mode={mode}
                    onNotesChange={handleNotesChange}
                    lastSaved={lastSaved}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
};

export default VisitPage;

