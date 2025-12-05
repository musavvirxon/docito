import { useState } from "react";
import PatientListSection from "./PatientListSection";
import PatientDetailSection from "./PatientDetailSection";
import CreatePatientModal from "./CreatePatientModal";
import { useDoctorPatients } from "@/hooks/useDoctorPatients";

const DoctorPatientsSection = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { refreshPatients } = useDoctorPatients();

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  const handleBack = () => {
    setSelectedPatientId(null);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    refreshPatients();
  };

  return (
    <>
      {selectedPatientId ? (
        <PatientDetailSection patientId={selectedPatientId} onBack={handleBack} />
      ) : (
        <PatientListSection
          onSelectPatient={handleSelectPatient}
          onAddPatient={() => setShowCreateModal(true)}
        />
      )}

      <CreatePatientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
};

export default DoctorPatientsSection;
