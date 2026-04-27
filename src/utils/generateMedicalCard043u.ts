// Medical Card 043/u — PDF generator (RU + UZ)
// Uses jsPDF + jspdf-autotable, dynamically imported to keep bundle small.
// Unicode font (Noto Sans) loading lives in `pdfUnicodeFont.ts` and is shared
// with the appointment-summary PDF generator.

import {
  ensureUnicodeFont,
  PDF_FONT_NAME,
  fdiToCell,
  procedureToToothCode,
  type ToothFinding,
} from './pdfUnicodeFont';

export type { ToothFinding } from './pdfUnicodeFont';

export interface MedicalCardData {
  // Patient
  patientName: string;
  gender: string;
  age: string | number;
  dob: string;
  phone: string;
  profession: string;
  address: string;
  // Appointment
  appointmentDate: string;
  diagnosis: string;
  doctorName: string;
  serviceName: string;
  // Clinic
  clinicName: string;
  clinicAddress: string;
  // Optional dental findings (rendered inside the chart cells)
  toothFindings?: ToothFinding[];
}

const FONT_NAME = PDF_FONT_NAME;

type Strings = {
  ministry: string;
  institutionName: string;
  institutionAddress: string;
  cardTitle: string;
  cardSubtitle: string;
  formLine: string;
  fillDate: string;
  fullName: string;
  gender: string;
  age: string;
  dob: string;
  phone: string;
  profession: string;
  address: string;
  diagnosis: string;
  complaints: string;
  pastDiseases: string;
  currentDevelopment: string;
  externalExam: string;
  oralExam: string;
  legend: string;
  upper: string;
  lower: string;
  bite: string;
  mucosa: string;
  xrayLab: string;
  treatmentPlan: string;
  diary: string;
  diaryCont: string;
  epicrisis: string;
  doctor: string;
  cols: [string, string, string, string];
  footer: string;
};

const RU: Strings = {
  ministry: 'Министерство здравоохранения Республики Узбекистан',
  institutionName: 'Наименование учреждения',
  institutionAddress: 'Адрес учреждения',
  cardTitle: 'МЕДИЦИНСКАЯ КАРТА',
  cardSubtitle: 'стоматологического больного',
  formLine: 'Форма N 043/у   |   Медицинская документация',
  fillDate: 'Дата заполнения',
  fullName: 'Фамилия, имя, отчество',
  gender: 'Пол',
  age: 'Возраст',
  dob: 'Дата рождения',
  phone: 'Телефон',
  profession: 'Профессия',
  address: 'Адрес',
  diagnosis: 'Диагноз',
  complaints: 'Жалобы',
  pastDiseases: 'Перенесённые и сопутствующие заболевания',
  currentDevelopment: 'Развитие настоящего заболевания',
  externalExam: 'Данные объективного исследования. Внешний осмотр',
  oralExam: 'Осмотр полости рта',
  legend:
    'Усл. обозначения: отсутствует — О, корень — Кр, кариес — С, пульпит — Р, периодонтит — Pt, пломба — П, пародонтоз — А, подвижность — I/II/III, коронка — К, имплант — Имп',
  upper: 'Верхняя',
  lower: 'Нижняя',
  bite: 'Прикус',
  mucosa:
    'Состояние слизистой оболочки, дёсен, альвеолярных отростков и нёба',
  xrayLab: 'Данные рентгеновских и лабораторных исследований',
  treatmentPlan: 'ПЛАН ЛЕЧЕНИЯ',
  diary: 'Дневник лечения',
  diaryCont: 'Продолжение дневника',
  epicrisis: 'Эпикриз',
  doctor: 'Лечащий врач',
  cols: ['Дата', 'Зуб', 'Диагноз / Описание лечения', 'Подпись врача'],
  footer:
    'Форма N 043/у   |   Министерство здравоохранения Республики Узбекистан',
};

const UZ: Strings = {
  ministry: "O'ZBEKISTON RESPUBLIKASI SOG'LIQNI SAQLASH VAZIRLIGI",
  institutionName: 'Muassasa nomi',
  institutionAddress: 'Muassasa manzili',
  cardTitle: 'TIBBIY KARTA',
  cardSubtitle: 'stomatologik bemorning',
  formLine: 'Shakl N 043/u   |   Tibbiy hujjat',
  fillDate: "To'ldirilgan sana",
  fullName: 'Familiya, ism, sharif',
  gender: 'Jinsi',
  age: 'Yoshi',
  dob: "Tug'ilgan sanasi",
  phone: 'Telefon',
  profession: 'Kasbi',
  address: 'Manzil',
  diagnosis: 'Tashxis',
  complaints: 'Shikoyatlar',
  pastDiseases: "O'tkazilgan va qo'shimcha kasalliklar",
  currentDevelopment: 'Hozirgi kasallikning rivojlanishi',
  externalExam: "Ob'ektiv tekshiruv. Tashqi ko'rik",
  oralExam: "Og'iz bo'shlig'ini ko'rik",
  legend:
    "Shartli belgilar: yo'q — Y, ildiz — Il, karies — K, pulpit — P, periodontit — Pt, plomba — Pl, paradontoz — Pd, harakatchanlik — I/II/III, toj — T, implant — Imp",
  upper: 'Yuqori',
  lower: 'Quyi',
  bite: 'Tishlar tutashuvi (okkluziya)',
  mucosa:
    "Og'iz bo'shlig'i shilliq qavati, milklar, alveolyar o'simtalar va tanglay holati",
  xrayLab: "Rentgen va laboratoriya tekshiruvlari ma'lumotlari",
  treatmentPlan: 'DAVOLASH REJASI',
  diary: 'Davolash kundaligi',
  diaryCont: 'Davolash kundaligi (davomi)',
  epicrisis: 'Epikriz',
  doctor: 'Davoluvchi shifokor',
  cols: ['Sana', 'Tish', 'Tashxis / Davolash tavsifi', 'Shifokor imzosi'],
  footer:
    "Shakl N 043/u   |   O'zbekiston Respublikasi Sog'liqni saqlash vazirligi",
};

async function buildPdf(data: MedicalCardData, S: Strings): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await ensureUnicodeFont(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const setFont = (size: number, bold = false) => {
    doc.setFont(FONT_NAME, bold ? 'bold' : 'normal');
    doc.setFontSize(size);
  };

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (
    str: string,
    opts: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; gap?: number } = {}
  ) => {
    const { size = 10, bold = false, align = 'left', gap = 1.2 } = opts;
    setFont(size, bold);
    const lines = doc.splitTextToSize(str, contentW) as string[];
    const lineH = size * 0.45;
    ensureSpace(lines.length * lineH + gap);
    const x = align === 'center' ? pageW / 2 : align === 'right' ? pageW - margin : margin;
    doc.text(lines, x, y + lineH, { align, baseline: 'alphabetic' });
    y += lines.length * lineH + gap;
  };

  const labelValue = (label: string, value: string, size = 10) => {
    text(`${label}: ${value || '_______________________________'}`, { size });
  };

  const blankLines = (n: number, lineGap = 6) => {
    ensureSpace(n * lineGap);
    setFont(10);
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    for (let i = 0; i < n; i++) {
      const ly = y + lineGap - 1;
      doc.line(margin, ly, pageW - margin, ly);
      y += lineGap;
    }
    y += 1;
  };

  const sectionLines = (title: string, n: number) => {
    text(title + ':', { size: 10, bold: true, gap: 1 });
    blankLines(n);
  };

  // ===== Page 1 =====
  text(S.ministry, { size: 11, bold: true, align: 'center', gap: 2 });
  text(`${S.institutionName}: ${data.clinicName || '___________________________'}`, { size: 9 });
  text(`${S.institutionAddress}: ${data.clinicAddress || '___________________________'}`, {
    size: 9,
    gap: 3,
  });

  text(S.cardTitle, { size: 18, bold: true, align: 'center', gap: 1 });
  text(S.cardSubtitle, { size: 12, bold: true, align: 'center', gap: 1 });
  text(S.formLine, { size: 8, align: 'center', gap: 4 });

  // Patient info box (rendered with autoTable for clean borders)
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: FONT_NAME, fontSize: 9.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    body: [
      [`${S.fillDate}: ${data.appointmentDate || '___________'}`],
      [{ content: `${S.fullName}: ${data.patientName || '_________________________'}`, styles: { fontStyle: 'bold' } }],
      [
        `${S.gender}: ${data.gender || '___'}    ${S.age}: ${data.age || '___'}    ${S.dob}: ${
          data.dob || '____________'
        }    ${S.phone}: ${data.phone || '____________'}`,
      ],
      [
        `${S.profession}: ${data.profession || '___________________'}    ${S.address}: ${
          data.address || '__________________________________'
        }`,
      ],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  text(`${S.diagnosis}: ${data.diagnosis || '_______________________________________________'}`, {
    size: 10,
    bold: true,
    gap: 2,
  });

  sectionLines(S.complaints, 3);
  sectionLines(S.pastDiseases, 3);
  sectionLines(S.currentDevelopment, 3);
  sectionLines(S.externalExam, 3);

  text(S.oralExam + ':', { size: 10, bold: true, gap: 1 });
  text(S.legend, { size: 7.5, gap: 2 });

  // Tooth chart — 32 teeth with midline
  drawToothChart(doc, margin, y, contentW, S.upper, S.lower);
  y += 36;

  ensureSpace(40);
  text(`${S.bite}: ____________________________`, { size: 10 });
  sectionLines(S.mucosa, 3);
  sectionLines(S.xrayLab, 3);

  // ===== Page 2 =====
  doc.addPage();
  y = margin;
  text(S.treatmentPlan, { size: 14, bold: true, align: 'center', gap: 2 });
  blankLines(5);
  y += 2;

  text(S.diary + ':', { size: 10, bold: true, gap: 1 });
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [S.cols as any],
    body: Array(10).fill(null).map(() => ['', '', '', '']),
    styles: { font: FONT_NAME, fontSize: 9, cellPadding: 2, minCellHeight: 9, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { font: FONT_NAME, fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 0, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 14 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // ===== Page 3 =====
  doc.addPage();
  y = margin;
  text(S.diaryCont + ':', { size: 10, bold: true, gap: 1 });
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [S.cols as any],
    body: Array(12).fill(null).map(() => ['', '', '', '']),
    styles: { font: FONT_NAME, fontSize: 9, cellPadding: 2, minCellHeight: 9, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { font: FONT_NAME, fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 0, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 14 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  sectionLines(S.epicrisis, 5);
  text(`${S.doctor}: ${data.doctorName || '_______________________'}`, { size: 10, gap: 4 });

  // Footer on last page
  setFont(8);
  doc.text(S.footer, pageW / 2, pageH - 8, { align: 'center' });

  return doc.output('blob');
}

function drawToothChart(
  doc: any,
  x: number,
  yStart: number,
  width: number,
  upperLabel: string,
  lowerLabel: string
) {
  const labelW = 22;
  const cellsW = width - labelW;
  const cellW = cellsW / 16;
  const rowH = 9;
  const numRowH = 5;
  const nums = ['8', '7', '6', '5', '4', '3', '2', '1', '1', '2', '3', '4', '5', '6', '7', '8'];

  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(8);

  let y = yStart;
  // Top number row
  for (let i = 0; i < 16; i++) {
    const cx = x + labelW + cellW * (i + 0.5);
    doc.text(nums[i], cx, y + 3.5, { align: 'center' });
  }
  y += numRowH;

  // Upper teeth row
  doc.setFontSize(8);
  doc.text(upperLabel, x + labelW - 1, y + rowH / 2 + 1, { align: 'right' });
  for (let i = 0; i < 16; i++) {
    doc.rect(x + labelW + i * cellW, y, cellW, rowH);
  }
  y += rowH;

  // Lower teeth row
  doc.text(lowerLabel, x + labelW - 1, y + rowH / 2 + 1, { align: 'right' });
  for (let i = 0; i < 16; i++) {
    doc.rect(x + labelW + i * cellW, y, cellW, rowH);
  }
  y += rowH;

  // Bottom number row
  for (let i = 0; i < 16; i++) {
    const cx = x + labelW + cellW * (i + 0.5);
    doc.text(nums[i], cx, y + 3.5, { align: 'center' });
  }
  y += numRowH;

  // Thick midline across both teeth rows
  doc.setLineWidth(0.8);
  const midX = x + labelW + cellW * 8;
  doc.line(midX, yStart + numRowH, midX, yStart + numRowH + rowH * 2);
  doc.setLineWidth(0.2);
}

export async function generateMedicalCard043uRussian(data: MedicalCardData): Promise<Blob> {
  return buildPdf(data, RU);
}

export async function generateMedicalCard043uUzbek(data: MedicalCardData): Promise<Blob> {
  return buildPdf(data, UZ);
}
