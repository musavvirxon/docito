import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface AppointmentSummaryData {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type?: string;
  notes?: string | null;
  patient_name?: string | null;
  patient_phone?: string | null;
  patient_email?: string | null;
  doctor_id?: string | null;
  patient_id?: string | null;
  doctor_patient_id?: string | null;
  procedure_name?: string | null;
  procedure_cost?: number | null;
}

export function useAppointmentSummaryPdf() {
  const [loading, setLoading] = useState(false);

  const downloadSummary = useCallback(async (appointment: AppointmentSummaryData) => {
    setLoading(true);
    try {
      // Fetch additional data in parallel
      const [diagnosesRes, clinicalRes, doctorRes] = await Promise.all([
        supabase
          .from("appointment_diagnoses")
          .select("diagnosis_title, icd10_code, notes")
          .eq("appointment_id", appointment.id),
        supabase
          .from("appointment_clinical_items")
          .select("title, item_type, name, description, dosage, frequency, duration, cost")
          .eq("appointment_id", appointment.id),
        appointment.doctor_id
          ? supabase
              .from("doctors")
              .select("full_name, specialty, license_number, logo_url, practice_id, practices(name, address, phone, logo_url)")
              .eq("id", appointment.doctor_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const diagnoses = diagnosesRes.data || [];
      const clinicalItems = clinicalRes.data || [];
      const doctor = doctorRes.data as any;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Resolve clinic logo + info from doctor's practice
      const practice = (doctor as any)?.practices || null;
      const clinicName: string = practice?.name || "";
      const clinicAddress: string = practice?.address || "";
      const clinicLogoUrl: string | null = practice?.logo_url || (doctor as any)?.logo_url || null;

      // Try fetching clinic logo as data URL — silent fallback
      let clinicLogoDataUrl: string | null = null;
      if (clinicLogoUrl) {
        try {
          const res = await fetch(clinicLogoUrl);
          if (res.ok) {
            const blob = await res.blob();
            clinicLogoDataUrl = await new Promise<string | null>((resolve) => {
              const r = new FileReader();
              r.onloadend = () => resolve(r.result as string);
              r.onerror = () => resolve(null);
              r.readAsDataURL(blob);
            });
          }
        } catch { /* silent */ }
      }

      // Top header bar with logo (left), clinic info (right), title centered below
      if (clinicLogoDataUrl) {
        try {
          const fmt = clinicLogoUrl!.toLowerCase().endsWith(".png") ? "PNG" : "JPEG";
          doc.addImage(clinicLogoDataUrl, fmt, 14, 10, 35, 12);
        } catch { /* fallback */ }
      } else if (clinicName) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(clinicName, 14, 16);
      }
      if (clinicName) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(clinicName, pageWidth - 14, 14, { align: "right" });
      }
      if (clinicAddress) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(clinicAddress.slice(0, 60), pageWidth - 14, 19, { align: "right" });
      }
      y = 28;

      // Title under the brand bar
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Appointment Summary", pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      // Doctor info
      if (doctor) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Doctor", 14, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        if (doctor.full_name) { doc.text(`Name: ${doctor.full_name}`, 14, y); y += 5; }
        if (doctor.specialty) { doc.text(`Specialty: ${doctor.specialty}`, 14, y); y += 5; }
        if (doctor.license_number) { doc.text(`License: ${doctor.license_number}`, 14, y); y += 5; }
        y += 4;
      }

      // Patient info
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Patient", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (appointment.patient_name) { doc.text(`Name: ${appointment.patient_name}`, 14, y); y += 5; }
      if (appointment.patient_phone) { doc.text(`Phone: ${appointment.patient_phone}`, 14, y); y += 5; }
      if (appointment.patient_email) { doc.text(`Email: ${appointment.patient_email}`, 14, y); y += 5; }
      y += 4;

      // Appointment details
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Appointment Details", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const dateStr = format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy");
      doc.text(`Date: ${dateStr}`, 14, y); y += 5;
      doc.text(`Time: ${appointment.start_time} - ${appointment.end_time}`, 14, y); y += 5;
      doc.text(`Status: ${appointment.status}`, 14, y); y += 5;
      if (appointment.appointment_type) {
        doc.text(`Type: ${appointment.appointment_type.replace(/_/g, " ")}`, 14, y); y += 5;
      }
      if (appointment.procedure_name) {
        doc.text(`Procedure: ${appointment.procedure_name}`, 14, y); y += 5;
        if (appointment.procedure_cost != null) {
          doc.text(`Estimated Cost: $${appointment.procedure_cost.toFixed(2)}`, 14, y); y += 5;
        }
      }
      y += 4;

      // Notes
      if (appointment.notes) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Notes", 14, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(appointment.notes, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 4;
      }

      // Diagnoses
      if (diagnoses.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Diagnoses", 14, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          head: [["Diagnosis", "ICD-10", "Notes"]],
          body: diagnoses.map((d: any) => [
            d.diagnosis_title || "",
            d.icd10_code || "-",
            d.notes || "-",
          ]),
          margin: { left: 14, right: 14 },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Clinical Items
      if (clinicalItems.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Clinical Items", 14, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          head: [["Type", "Name", "Dosage", "Frequency", "Duration", "Cost"]],
          body: clinicalItems.map((item: any) => [
            (item.item_type || "").replace(/_/g, " "),
            item.name || item.title || "",
            item.dosage || "-",
            item.frequency || "-",
            item.duration || "-",
            item.cost != null ? `$${Number(item.cost).toFixed(2)}` : "-",
          ]),
          margin: { left: 14, right: 14 },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Footer (Confidential + Docito branding + page X of Y)
      const pageCount = doc.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text(
          `Confidential - Generated ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
          14,
          pageH - 10,
        );
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageH - 10, { align: "right" });
        doc.setFontSize(7);
        doc.setTextColor(160);
        doc.text("Generated by Docito · docito.app", pageWidth / 2, pageH - 6, { align: "center" });
        doc.setTextColor(0);
      }

      const fileName = `appointment-summary-${format(new Date(appointment.appointment_date), "yyyy-MM-dd")}-${appointment.start_time.replace(":", "")}.pdf`;
      doc.save(fileName);
      toast.success("PDF summary downloaded");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error(err?.message || "Failed to generate PDF summary");
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloadSummary, loading };
}
