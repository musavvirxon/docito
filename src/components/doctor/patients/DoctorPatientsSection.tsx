import { useState } from "react";
import PatientListSection from "./PatientListSection";
import PatientDetailSection from "./PatientDetailSection";
import AddPatientModal from "./AddPatientModal";
import DoctorPatientDetailSection from "./DoctorPatientDetailSection";
import { useDoctorPatientsV2 } from "@/hooks/useDoctorPatientsV2";

const DoctorPatientsSection = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientType, setSelectedPatientType] = useState<'appointment' | 'direct'>('appointment');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { refreshPatients } = useDoctorPatientsV2();

  const handleSelectAppointmentPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientType('appointment');
  };

  const handleSelectDirectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientType('direct');
  };

  const handleBack = () => {
    setSelectedPatientId(null);
  };

  const handleCreateSuccess = (patientId: string) => {
    setShowCreateModal(false);
    refreshPatients();
    // Navigate to the newly created patient
    setSelectedPatientId(patientId);
    setSelectedPatientType('direct');
  };

  return (
    <>
      {selectedPatientId ? (
        selectedPatientType === 'direct' ? (
          <DoctorPatientDetailSection patientId={selectedPatientId} onBack={handleBack} />
        ) : (
          <PatientDetailSection patientId={selectedPatientId} onBack={handleBack} />
        )
      ) : (
        <PatientListSection
          onSelectPatient={handleSelectAppointmentPatient}
          onSelectDirectPatient={handleSelectDirectPatient}
          onAddPatient={() => setShowCreateModal(true)}
        />
      )}

      <AddPatientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
};

export default DoctorPatientsSection;
