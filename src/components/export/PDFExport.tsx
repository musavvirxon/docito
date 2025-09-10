import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TreatmentPlan {
  id: string;
  title: string;
  description?: string;
  total_cost: number;
  created_at: string;
  patient_id: string;
  dentist_id: string;
  status: string;
}

interface TreatmentPlanProcedure {
  id: string;
  procedure: {
    name: string;
    category: string;
  };
  custom_cost?: number;
  custom_notes?: string;
  tooth_numbers?: number[];
  status: string;
}

interface PDFExportProps {
  treatmentPlan: TreatmentPlan;
  procedures?: TreatmentPlanProcedure[];
  patientName?: string;
  doctorName?: string;
  practiceName?: string;
}

const PDFExport = ({
  treatmentPlan,
  procedures = [],
  patientName = "Patient",
  doctorName = "Doctor",
  practiceName = "Dental Practice"
}: PDFExportProps) => {

  const generatePDF = () => {
    // Create a printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Treatment Plan - ${treatmentPlan.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .practice-info {
              text-align: center;
              margin-bottom: 20px;
            }
            .practice-name {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .plan-title {
              font-size: 20px;
              font-weight: bold;
              margin: 20px 0;
            }
            .patient-info {
              display: flex;
              justify-content: space-between;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .procedures-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .procedures-table th,
            .procedures-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .procedures-table th {
              background-color: #2563eb;
              color: white;
              font-weight: bold;
            }
            .procedures-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .total-cost {
              text-align: right;
              margin: 20px 0;
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
              border-top: 1px solid #333;
              padding-top: 5px;
              text-align: center;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="practice-info">
              <div class="practice-name">${practiceName}</div>
              <div>Dental Treatment Plan</div>
            </div>
          </div>

          <div class="plan-title">Treatment Plan: ${treatmentPlan.title}</div>

          <div class="patient-info">
            <div>
              <strong>Patient:</strong> ${patientName}<br>
              <strong>Doctor:</strong> ${doctorName}
            </div>
            <div>
              <strong>Date Created:</strong> ${new Date(treatmentPlan.created_at).toLocaleDateString()}<br>
              <strong>Plan ID:</strong> ${treatmentPlan.id.slice(0, 8)}
            </div>
          </div>

          ${treatmentPlan.description ? `
            <div style="margin: 20px 0;">
              <strong>Description:</strong><br>
              ${treatmentPlan.description}
            </div>
          ` : ''}

          <table class="procedures-table">
            <thead>
              <tr>
                <th>Procedure</th>
                <th>Category</th>
                <th>Teeth</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${procedures.map(proc => `
                <tr>
                  <td>${proc.procedure.name}</td>
                  <td>${proc.procedure.category}</td>
                  <td>${proc.tooth_numbers && proc.tooth_numbers.length > 0 
                    ? proc.tooth_numbers.join(', ') 
                    : 'General'}</td>
                  <td>$${(proc.custom_cost || 0).toFixed(2)}</td>
                  <td>${proc.status.replace('_', ' ').toUpperCase()}</td>
                  <td>${proc.custom_notes || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-cost">
            Total Treatment Cost: $${treatmentPlan.total_cost.toFixed(2)}
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div>Patient Signature</div>
              <div style="margin-top: 20px; font-size: 10px;">Date: _______________</div>
            </div>
            <div class="signature-box">
              <div>Doctor Signature</div>
              <div style="margin-top: 20px; font-size: 10px;">Date: _______________</div>
            </div>
          </div>

          <div class="footer">
            <div>This document was generated on ${new Date().toLocaleString()}</div>
            <div>${practiceName} - Treatment Plan</div>
          </div>
        </body>
      </html>
    `;

    // Create a new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
      toast.success("PDF export initiated - check your browser's print dialog");
    } else {
      toast.error("Unable to open print dialog. Please check your browser settings.");
    }
  };

  const downloadPDF = () => {
    // For a more advanced PDF generation, you could integrate with libraries like:
    // - jsPDF
    // - html2pdf.js
    // - Puppeteer (server-side)
    
    // For now, we'll use the browser's print-to-PDF functionality
    generatePDF();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={downloadPDF}
      className="flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      Export PDF
    </Button>
  );
};

export default PDFExport;