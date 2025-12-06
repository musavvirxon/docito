import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface PatientData {
  id: string;
  full_name: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_group?: string;
  allergies?: string;
  medical_history?: string;
  dental_history?: string;
  current_medications?: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time?: string;
  status: string;
  notes?: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  status: string;
  instructions?: string;
}

interface GeneratePDFOptions {
  patient: PatientData;
  appointments?: Appointment[];
  prescriptions?: Prescription[];
  clinicName?: string;
  doctorName?: string;
}

export const generatePatientSummaryPDF = async ({
  patient,
  appointments = [],
  prescriptions = [],
  clinicName = "Docito Medical Center",
  doctorName,
}: GeneratePDFOptions): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(clinicName, 14, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Patient Summary Report", 14, 30);

  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "PPP 'at' p")}`, pageWidth - 14, 30, { align: "right" });

  yPos = 55;

  // Patient Information Section
  doc.setTextColor(...textColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", 14, yPos);
  yPos += 8;

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  // Patient details grid
  const patientInfo = [
    ["Full Name", patient.full_name || "—"],
    ["Date of Birth", patient.date_of_birth ? `${format(new Date(patient.date_of_birth), "PPP")} (${patient.age} years)` : "—"],
    ["Gender", patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "—"],
    ["Blood Group", patient.blood_group || "—"],
    ["Phone", patient.phone || "—"],
    ["Email", patient.email || "—"],
    ["Address", patient.address || "—"],
  ];

  doc.setFontSize(10);
  patientInfo.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mutedColor);
    doc.text(label + ":", 14, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    doc.text(String(value), 60, yPos);
    yPos += 7;
  });

  // Emergency Contact
  yPos += 5;
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(14, yPos - 5, pageWidth - 28, 20, 3, 3, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(185, 28, 28);
  doc.text("Emergency Contact", 18, yPos + 2);
  
  doc.setFont("helvetica", "normal");
  doc.text(
    `${patient.emergency_contact_name || "Not provided"} - ${patient.emergency_contact_phone || "—"}`,
    18,
    yPos + 10
  );
  yPos += 25;

  // Medical Information Section
  yPos += 5;
  doc.setTextColor(...textColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Medical Information", 14, yPos);
  yPos += 8;

  doc.setDrawColor(...primaryColor);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  // Allergies
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(217, 119, 6);
  doc.text("Allergies:", 14, yPos);
  yPos += 6;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  const allergiesText = patient.allergies || "No known allergies";
  const allergiesLines = doc.splitTextToSize(allergiesText, pageWidth - 28);
  doc.text(allergiesLines, 14, yPos);
  yPos += allergiesLines.length * 5 + 8;

  // Current Medications
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Current Medications:", 14, yPos);
  yPos += 6;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  const medsText = patient.current_medications || "None recorded";
  const medsLines = doc.splitTextToSize(medsText, pageWidth - 28);
  doc.text(medsLines, 14, yPos);
  yPos += medsLines.length * 5 + 8;

  // Medical History
  if (patient.medical_history) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text("Medical History:", 14, yPos);
    yPos += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const historyLines = doc.splitTextToSize(patient.medical_history, pageWidth - 28);
    doc.text(historyLines, 14, yPos);
    yPos += historyLines.length * 5 + 8;
  }

  // Check if we need a new page
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  // Appointments Section
  if (appointments.length > 0) {
    yPos += 5;
    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Recent Appointments", 14, yPos);
    yPos += 8;

    doc.setDrawColor(...primaryColor);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 5;

    const appointmentData = appointments.slice(0, 10).map((apt) => [
      format(new Date(apt.appointment_date), "PP"),
      apt.start_time || "—",
      apt.status.charAt(0).toUpperCase() + apt.status.slice(1),
      apt.notes?.substring(0, 40) || "—",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Time", "Status", "Notes"]],
      body: appointmentData,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  // Prescriptions Section
  if (prescriptions.length > 0) {
    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Prescriptions", 14, yPos);
    yPos += 8;

    doc.setDrawColor(...primaryColor);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 5;

    const prescriptionData = prescriptions.map((rx) => [
      rx.medication,
      rx.dosage,
      rx.frequency,
      format(new Date(rx.start_date), "PP"),
      rx.status.charAt(0).toUpperCase() + rx.status.slice(1),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Medication", "Dosage", "Frequency", "Start Date", "Status"]],
      body: prescriptionData,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(...mutedColor);
    doc.setLineWidth(0.3);
    doc.line(14, doc.internal.pageSize.getHeight() - 20, pageWidth - 14, doc.internal.pageSize.getHeight() - 20);
    
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(
      `Confidential Patient Record - ${clinicName}`,
      14,
      doc.internal.pageSize.getHeight() - 12
    );
    
    if (doctorName) {
      doc.text(
        `Prepared by: Dr. ${doctorName}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 12,
        { align: "center" }
      );
    }
    
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 12,
      { align: "right" }
    );
  }

  return doc.output("blob");
};

export const downloadPatientSummaryPDF = async (options: GeneratePDFOptions): Promise<void> => {
  const blob = await generatePatientSummaryPDF(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `patient-summary-${options.patient.full_name?.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
