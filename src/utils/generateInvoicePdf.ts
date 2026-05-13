import jsPDF from 'jspdf';

export interface InvoiceLineItem {
  name: string;
  amount: number;
  quantity?: number;
  code?: string;
}

export interface InvoicePaymentRow {
  date: string;
  method: string;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  patientName: string;
  appointmentDate?: string;
  doctorName?: string;
  clinicName?: string;
  clinicAddress?: string;
  currency?: string;
  items: InvoiceLineItem[];
  totalBilled: number;
  totalDiscount: number;
  totalPaid: number;
  outstanding: number;
  payments?: InvoicePaymentRow[];
}

const money = (n: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n || 0);
  } catch {
    return `${(n || 0).toFixed(2)} ${currency}`;
  }
};

export function generateInvoicePdf(data: InvoiceData) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', margin, y);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const issueDate = new Date().toLocaleDateString();
  pdf.text(`#${data.invoiceNumber}`, pageW - margin, y, { align: 'right' });
  y += 6;
  pdf.text(`Date: ${issueDate}`, pageW - margin, y, { align: 'right' });
  y += 10;

  if (data.clinicName) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.clinicName, margin, y);
    y += 5;
  }
  if (data.clinicAddress) {
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.clinicAddress, margin, y);
    y += 5;
  }

  y += 4;
  pdf.setDrawColor(220);
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  // Bill to
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill To', margin, y);
  pdf.text('Appointment', pageW / 2, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.patientName || '—', margin, y);
  pdf.text(`${data.appointmentDate || ''}`, pageW / 2, y);
  y += 5;
  if (data.doctorName) {
    pdf.text(`Doctor: ${data.doctorName}`, pageW / 2, y);
    y += 5;
  }

  y += 6;

  // Table header
  pdf.setFillColor(245, 247, 250);
  pdf.rect(margin, y - 4, pageW - margin * 2, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.text('Code', margin + 2, y + 1);
  pdf.text('Description', margin + 28, y + 1);
  pdf.text('Amount', pageW - margin - 2, y + 1, { align: 'right' });
  y += 8;

  pdf.setFont('helvetica', 'normal');
  for (const item of data.items) {
    if (y > 250) {
      pdf.addPage();
      y = margin;
    }
    const lines = pdf.splitTextToSize(item.name, pageW - margin * 2 - 65);
    pdf.text(item.code || '—', margin + 2, y);
    pdf.text(lines, margin + 28, y);
    pdf.text(money(item.amount, data.currency), pageW - margin - 2, y, { align: 'right' });
    y += Math.max(6, lines.length * 5);
  }

  y += 4;
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  // Totals
  const totalsX = pageW - margin - 60;
  const labelTotals: Array<[string, number]> = [
    ['Subtotal', data.totalBilled],
    ['Discount', -Math.abs(data.totalDiscount || 0)],
    ['Paid', -Math.abs(data.totalPaid || 0)],
  ];
  pdf.setFont('helvetica', 'normal');
  for (const [label, amt] of labelTotals) {
    pdf.text(label, totalsX, y);
    pdf.text(money(amt, data.currency), pageW - margin - 2, y, { align: 'right' });
    y += 6;
  }
  pdf.setFont('helvetica', 'bold');
  pdf.text('Outstanding', totalsX, y);
  pdf.text(money(data.outstanding, data.currency), pageW - margin - 2, y, { align: 'right' });
  y += 10;

  // Payments
  if (data.payments && data.payments.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Payments received', margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    for (const p of data.payments) {
      if (y > 270) {
        pdf.addPage();
        y = margin;
      }
      const dateStr = p.date ? new Date(p.date).toLocaleDateString() : '';
      pdf.text(`${dateStr} · ${p.method}`, margin + 2, y);
      pdf.text(money(p.amount, data.currency), pageW - margin - 2, y, { align: 'right' });
      y += 5;
    }
  }

  // Footer
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(140);
  pdf.text(
    'Thank you for your trust. Please contact us with any questions about this invoice.',
    margin,
    285,
  );

  const fname = `invoice_${data.invoiceNumber}_${(data.patientName || 'patient').replace(/\s+/g, '_')}.pdf`;
  pdf.save(fname);
}
