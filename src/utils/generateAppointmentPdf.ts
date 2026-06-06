import jsPDF from 'jspdf';
import {
  ensureUnicodeFont,
  PDF_FONT_NAME,
  fdiToCell,
  procedureToToothCode,
  type ToothFinding,
} from './pdfUnicodeFont';

export type { ToothFinding } from './pdfUnicodeFont';

export interface AppointmentPdfData {
  clinicName: string;
  clinicAddress: string;
  clinicLogoUrl?: string;
  clinicPhone?: string;
  doctorPhotoUrl?: string;
  patientName: string;
  gender?: string;
  age?: string | number;
  dob?: string;
  phone?: string;
  address?: string;
  profession?: string;
  appointmentDate: string;
  appointmentTime?: string;
  diagnosis?: string;
  complaints?: string;
  externalExam?: string;
  oralCavity?: string;
  xrayLab?: string;
  treatment?: string;
  serviceName?: string;
  doctorName: string;
  doctorSpecialty?: string;
  notes?: string;
  totalAmount?: number;
  amountPaid?: number;
  balance?: number;
  currency?: string;
  toothFindings?: ToothFinding[];
}

type Locale = 'en' | 'ru' | 'uz' | 'ar' | 'tr' | 'es' | 'de' | 'zh' | 'pt' | 'ja' | 'ko';

function normalizeLocale(v?: string): Locale {
  const c = (v || 'en').split('-')[0].toLowerCase();
  const supported: Locale[] = ['en','ru','uz','ar','tr','es','de','zh','pt','ja','ko'];
  return (supported as string[]).includes(c) ? (c as Locale) : 'en';
}

// Translations for the Uzbek MOH form-043/u medical card.
// Ru/Uz are the official languages of this regulated form. Other locales
// fall back to English via the tr() helper.
const I18N: Record<Locale, Record<string, string>> = {
  en: {
    moh: 'Ministry of Health',
    institutionName: 'Institution: ',
    okpoCode: 'OKPO code: ____________',
    addressLabel: 'Address: ',
    phoneLabel: 'Phone: ',
    medicalCard: 'MEDICAL CARD',
    ofDentalPatient: 'of the dental patient',
    formNo: 'Form No. 043/u  |  Medical record',
    dateLabel: 'Date: ',
    timeLabel: 'Time: ',
    patientFullNameLabel: 'Full name: ',
    genderLabel: 'Gender: ',
    ageLabel: '  Age: ',
    dobLabel: '  DOB: ',
    phoneInline: '  Phone: ',
    professionLabel: 'Occupation: ',
    addressInline: '  Address: ',
    diagnosisLabel: 'Diagnosis: ',
    complaintsTitle: 'Chief complaints:',
    externalExamTitle: 'Objective examination. External exam:',
    oralExamTitle: 'Intraoral examination:',
    legend: 'Legend: missing-O, root-R, caries-C, pulpitis-P, periodontitis-Pt, filling-F, periodontosis-A, mobility-I/II/III, crown-Cr, implant-Imp',
    rightArrow: '← Right',
    leftArrow: 'Left →',
    upperShort: 'Upr',
    lowerShort: 'Lwr',
    biteLabel: 'Occlusion: ',
    mucosaTitle: 'Condition of mucosa, gingiva, alveolar ridges and palate:',
    xrayLabTitle: 'Radiographic and laboratory findings:',
    treatmentPlanHeader: 'TREATMENT PLAN / TREATMENT DIARY',
    serviceLabel: 'Service / procedure: ',
    performedProcedures: 'Performed procedures:',
    toothCol: 'Tooth',
    descriptionCol: 'Description',
    treatmentDescTitle: 'Treatment description:',
    notesTitle: 'Notes:',
    financialInfo: 'FINANCIAL INFORMATION',
    totalPayable: 'Total due:',
    paidLabel: 'Paid:',
    balanceDebt: 'Balance / Debt:',
    attendingDoctor: 'Attending doctor: ',
    signature: 'Signature: _______________________',
    patientSignature: 'Patient signature: ___________________________',
    footerForm: 'Form No. 043/u  |  Ministry of Health  |  Page',
    pageOf: 'of',
  },
  ru: {
    moh: 'Министерство здравоохранения Республики Узбекистан',
    institutionName: 'Наименование учреждения: ',
    okpoCode: 'Код по ОКПО: ____________',
    addressLabel: 'Адрес: ',
    phoneLabel: 'Тел: ',
    medicalCard: 'МЕДИЦИНСКАЯ КАРТА',
    ofDentalPatient: 'стоматологического больного',
    formNo: 'Форма N 043/у  |  Медицинская документация',
    dateLabel: 'Дата: ',
    timeLabel: 'Время: ',
    patientFullNameLabel: 'Фамилия, имя, отчество: ',
    genderLabel: 'Пол: ',
    ageLabel: '  Возраст: ',
    dobLabel: '  Дата рождения: ',
    phoneInline: '  Тел: ',
    professionLabel: 'Профессия: ',
    addressInline: '  Адрес: ',
    diagnosisLabel: 'Диагноз: ',
    complaintsTitle: 'Жалобы:',
    externalExamTitle: 'Данные объективного исследования. Внешний осмотр:',
    oralExamTitle: 'Осмотр полости рта:',
    legend: 'Усл. обозн.: отсутствует-О, корень-Кр, кариес-С, пульпит-Р, периодонтит-Pt, пломба-П, пародонтоз-А, подвижн.-I/II/III, коронка-К, имплант-Имп',
    rightArrow: '← Правая',
    leftArrow: 'Левая →',
    upperShort: 'Верх',
    lowerShort: 'Низ',
    biteLabel: 'Прикус: ',
    mucosaTitle: 'Состояние слизистой оболочки, дёсен, альвеолярных отростков и нёба:',
    xrayLabTitle: 'Данные рентгеновских и лабораторных исследований:',
    treatmentPlanHeader: 'ПЛАН ЛЕЧЕНИЯ / ДНЕВНИК ЛЕЧЕНИЯ',
    serviceLabel: 'Услуга / процедура: ',
    performedProcedures: 'Выполненные процедуры:',
    toothCol: 'Зуб',
    descriptionCol: 'Описание',
    treatmentDescTitle: 'Описание лечения:',
    notesTitle: 'Примечания:',
    financialInfo: 'ФИНАНСОВАЯ ИНФОРМАЦИЯ',
    totalPayable: 'Итого к оплате:',
    paidLabel: 'Оплачено:',
    balanceDebt: 'Остаток / Долг:',
    attendingDoctor: 'Лечащий врач: ',
    signature: 'Подпись: _______________________',
    patientSignature: 'Подпись пациента: ___________________________',
    footerForm: 'Форма N 043/у  |  Министерство здравоохранения Республики Узбекистан  |  Стр.',
    pageOf: 'из',
  },
  uz: {
    moh: "O'ZBEKISTON RESPUBLIKASI SOG'LIQNI SAQLASH VAZIRLIGI",
    institutionName: 'Muassasa nomi: ',
    okpoCode: 'OKPO kodi: ____________',
    addressLabel: 'Manzil: ',
    phoneLabel: 'Tel: ',
    medicalCard: 'TIBBIY KARTA',
    ofDentalPatient: 'stomatologik bemorning',
    formNo: 'Shakl N 043/u  |  Tibbiy hujjat',
    dateLabel: 'Sana: ',
    timeLabel: 'Vaqt: ',
    patientFullNameLabel: 'Familiya, ism, sharif: ',
    genderLabel: 'Jinsi: ',
    ageLabel: '  Yoshi: ',
    dobLabel: "  Tug'ilgan: ",
    phoneInline: '  Tel: ',
    professionLabel: 'Kasbi: ',
    addressInline: '  Manzil: ',
    diagnosisLabel: 'Tashxis: ',
    complaintsTitle: 'Shikoyatlar:',
    externalExamTitle: "Ob'ektiv tekshiruv. Tashqi ko'rik:",
    oralExamTitle: "Og'iz bo'shlig'ini ko'rik:",
    legend: "Shartli bel.: yo'q-Y, ildiz-Il, karies-K, pulpit-P, periodontit-Pt, plomba-Pl, paradontoz-Pd, harak.-I/II/III, toj-T, implant-Imp",
    rightArrow: "← O'ng",
    leftArrow: 'Chap →',
    upperShort: 'Yuq',
    lowerShort: 'Pas',
    biteLabel: 'Tishlar tutashuvi: ',
    mucosaTitle: "Og'iz bo'shlig'i shilliq qavati, milklar va tanglay holati:",
    xrayLabTitle: "Rentgen va laboratoriya tekshiruvlari ma'lumotlari:",
    treatmentPlanHeader: 'DAVOLASH REJASI / DAVOLASH KUNDALIGI',
    serviceLabel: 'Xizmat / protsedura: ',
    performedProcedures: 'Bajarilgan protseduralar:',
    toothCol: 'Tish',
    descriptionCol: 'Tavsif',
    treatmentDescTitle: 'Davolash tavsifi:',
    notesTitle: 'Izohlar:',
    financialInfo: "MOLIYAVIY MA'LUMOT",
    totalPayable: "To'lov summasi:",
    paidLabel: "To'langan:",
    balanceDebt: "Qoldiq / Qarz:",
    attendingDoctor: 'Davoluvchi shifokor: ',
    signature: 'Imzo: _______________________',
    patientSignature: 'Bemor imzosi: ___________________________',
    footerForm: "Shakl N 043/u  |  O'zbekiston Respublikasi Sog'liqni saqlash vazirligi  |  Bet",
    pageOf: '/',
  },
  ar: {},
  tr: {},
  es: {},
  de: {},
  zh: {},
  pt: {},
  ja: {},
  ko: {},
};

function tr(locale: Locale, key: string): string {
  return I18N[locale]?.[key] ?? I18N.en[key] ?? key;
}

const fmtCur = (n?: number, currency = 'USD') =>
  n != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
    : '_____________';
const vv = (x?: string | number | null, fb = '______________________________') =>
  x != null && x !== '' ? String(x) : fb;

export async function generateAppointmentPdf(
  data: AppointmentPdfData,
  lang: string = 'en',
): Promise<void> {
  try {
    const locale = normalizeLocale(lang);
    const t = (k: string) => tr(locale, k);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await ensureUnicodeFont(doc);

    const W = 210;
    const M = 15;
    const CW = W - M * 2;
    let y = 15;
    const LH = 6;
    const SLH = 5;
    const currency = data.currency || 'USD';

    const font = (bold = false) => doc.setFont(PDF_FONT_NAME, bold ? 'bold' : 'normal');
    const size = (s: number) => doc.setFontSize(s);
    const txt = (
      s: string,
      x: number,
      yy: number,
      sz = 9,
      bold = false,
      align: 'left' | 'center' | 'right' = 'left',
    ) => {
      size(sz);
      font(bold);
      doc.text(s, x, yy, { align });
    };
    const ln = (x1: number, y1: number, x2: number, y2: number, w = 0.3) => {
      doc.setLineWidth(w);
      doc.line(x1, y1, x2, y2);
    };
    const hrule = (yy: number) => ln(M, yy, W - M, yy, 0.5);
    const emptyLn = (n: number, yy: number) => {
      let cur = yy;
      for (let i = 0; i < n; i++) {
        ln(M, cur, W - M, cur);
        cur += LH;
      }
      return cur;
    };
    const secTitle = (s: string, yy: number) => {
      txt(s, M, yy, 9, true);
      return yy + LH;
    };
    const fldLine = (lbl: string, val: string, x: number, yy: number, totalW: number) => {
      size(8.5);
      font(true);
      doc.text(lbl + ' ', x, yy);
      const lw = doc.getTextWidth(lbl + ' ');
      font(false);
      doc.text(val, x + lw, yy);
      ln(x + lw + doc.getTextWidth(val) + 1, yy + 0.5, x + totalW, yy + 0.5);
    };

    if (data.clinicLogoUrl) {
      try {
        const res = await fetch(data.clinicLogoUrl);
        if (res.ok) {
          const blob = await res.blob();
          const dataUrl: string = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.onerror = () => reject(new Error('read failed'));
            r.readAsDataURL(blob);
          });
          const fmt = data.clinicLogoUrl.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
          doc.addImage(dataUrl, fmt, M, 8, 40, 14);
        }
      } catch { /* silent */ }
    }

    txt(t('moh'), W / 2, y, 9, true, 'center');
    y += LH;

    size(7.5);
    font(false);
    doc.text(t('institutionName') + vv(data.clinicName, '__________________________'), M, y);
    doc.text(t('okpoCode'), W - M, y, { align: 'right' });
    y += SLH;
    doc.text(t('addressLabel') + vv(data.clinicAddress, '_________________________'), M, y);
    y += SLH;
    if (data.clinicPhone) {
      doc.text(t('phoneLabel') + data.clinicPhone, M, y);
      y += SLH;
    }
    y += LH - SLH;

    hrule(y);
    y += 3;
    txt(t('medicalCard'), W / 2, y, 15, true, 'center');
    y += 7;
    txt(t('ofDentalPatient'), W / 2, y, 10, true, 'center');
    y += 5;
    txt(t('formNo'), W / 2, y, 7, false, 'center');
    y += 5;
    hrule(y);
    y += 4;

    const bt = y;
    doc.rect(M, y, CW, 30);
    y += 4;
    size(8);
    font(false);
    doc.text(t('dateLabel') + vv(data.appointmentDate), M + 3, y);
    doc.text(t('timeLabel') + vv(data.appointmentTime, '______'), M + 65, y);
    y += SLH;
    size(8.5);
    font(true);
    doc.text(t('patientFullNameLabel') + vv(data.patientName), M + 3, y);
    y += SLH;
    size(8);
    font(false);
    doc.text(
      t('genderLabel') + vv(data.gender, '__') +
        t('ageLabel') + vv(data.age, '__') +
        t('dobLabel') + vv(data.dob, '__________') +
        t('phoneInline') + vv(data.phone, '____________'),
      M + 3,
      y,
    );
    y += SLH;
    doc.text(
      t('professionLabel') + vv(data.profession, '_____________') +
        t('addressInline') + vv(data.address, '_______________________'),
      M + 3,
      y,
    );
    y = bt + 34;

    fldLine(t('diagnosisLabel'), vv(data.diagnosis, ''), M, y, CW);
    y += LH;
    ln(M, y, W - M, y);
    y += LH;

    y = secTitle(t('complaintsTitle'), y);
    if (data.complaints) {
      size(8);
      font(false);
      const w = doc.splitTextToSize(data.complaints, CW);
      doc.text(w, M, y);
      y += w.length * SLH + 2;
    }
    y = emptyLn(2, y);

    const textOrBlanks = (val: string | undefined, blanks: number, yy: number) => {
      const v = (val || '').trim();
      if (v) {
        size(8);
        font(false);
        const w = doc.splitTextToSize(v, CW);
        doc.text(w, M, yy);
        return yy + w.length * SLH + 2;
      }
      return emptyLn(blanks, yy);
    };

    y = secTitle(t('externalExamTitle'), y);
    y = textOrBlanks(data.externalExam, 2, y);

    y = secTitle(t('oralExamTitle'), y);
    size(6.5);
    font(false);
    doc.text(t('legend'), M, y);
    y += SLH;

    const cx = M + 11;
    const cw = (CW - 13) / 16;
    const ch = 6;
    const nums = ['8', '7', '6', '5', '4', '3', '2', '1', '1', '2', '3', '4', '5', '6', '7', '8'];

    size(6.5);
    font(false);
    doc.text(t('rightArrow'), cx + cw * 3.5, y, { align: 'center' });
    doc.text(t('leftArrow'), cx + cw * 12.5, y, { align: 'center' });
    y += 4;

    size(7);
    font(true);
    nums.forEach((n, i) => doc.text(n, cx + i * cw + cw / 2, y, { align: 'center' }));
    y += 2;

    const upperY = y;
    nums.forEach((_, i) => doc.rect(cx + i * cw, upperY, cw, ch));
    const lowerY = upperY + ch;
    nums.forEach((_, i) => doc.rect(cx + i * cw, lowerY, cw, ch));

    ln(cx + cw * 8, upperY - 2, cx + cw * 8, lowerY + ch + 2, 0.8);

    size(6.5);
    font(false);
    doc.text(t('upperShort'), M, upperY + ch / 2 + 1.2, { align: 'left' });
    doc.text(t('lowerShort'), M, lowerY + ch / 2 + 1.2, { align: 'left' });

    y = lowerY + ch + 3.5;
    size(7);
    font(true);
    nums.forEach((n, i) => doc.text(n, cx + i * cw + cw / 2, y, { align: 'center' }));
    y += 2;

    // Pass locale to dental code helper; it only branches on ru/uz today.
    const codeLang: 'ru' | 'uz' = locale === 'uz' ? 'uz' : 'ru';
    const findings = (data.toothFindings || []).map((f) => ({
      ...f,
      code: f.code || procedureToToothCode(f.label, codeLang),
    }));
    if (findings.length > 0) {
      font(true);
      size(6.5);
      doc.setTextColor(180, 0, 0);
      for (const f of findings) {
        const cell = fdiToCell(f.tooth);
        if (!cell) continue;
        const code = (f.code || '').slice(0, 3);
        if (!code) continue;
        const xx = cx + cell.col * cw + cw / 2;
        const yy = (cell.row === 0 ? upperY : lowerY) + ch / 2 + 1.2;
        doc.text(code, xx, yy, { align: 'center' });
      }
      doc.setTextColor(0, 0, 0);
    }
    y += 4;

    if (findings.length > 0) {
      const footnotes = findings
        .filter((f) => f.label)
        .map((f) => `${f.tooth} — ${f.label}`)
        .join('   •   ');
      if (footnotes) {
        size(6.5);
        font(false);
        const w = doc.splitTextToSize(footnotes, CW);
        doc.text(w, M, y);
        y += w.length * 3 + 2;
      }
    }

    fldLine(t('biteLabel'), '', M, y, CW / 2);
    y += LH;
    y = secTitle(t('mucosaTitle'), y);
    y = textOrBlanks(data.oralCavity, 2, y);
    y = secTitle(t('xrayLabTitle'), y);
    y = textOrBlanks(data.xrayLab, 2, y);

    doc.addPage();
    y = 15;
    hrule(y);
    y += 4;
    txt(t('treatmentPlanHeader'), W / 2, y, 11, true, 'center');
    y += 7;

    fldLine(t('serviceLabel'), vv(data.serviceName, ''), M, y, CW);
    y += LH;

    if (findings.length > 0) {
      y = secTitle(t('performedProcedures'), y);
      size(8);
      font(true);
      doc.rect(M, y, 18, 6);
      doc.rect(M + 18, y, CW - 18, 6);
      doc.text(t('toothCol'), M + 9, y + 4, { align: 'center' });
      doc.text(t('descriptionCol'), M + 18 + 3, y + 4);
      y += 6;
      font(false);
      for (const f of findings) {
        const desc = f.label || f.code || '';
        const lines = doc.splitTextToSize(desc, CW - 18 - 4) as string[];
        const rowH = Math.max(6, lines.length * 4 + 2);
        doc.rect(M, y, 18, rowH);
        doc.rect(M + 18, y, CW - 18, rowH);
        doc.text(String(f.tooth), M + 9, y + rowH / 2 + 1, { align: 'center' });
        doc.text(lines, M + 18 + 3, y + 4);
        y += rowH;
      }
      y += 4;
    }

    y = secTitle(t('treatmentDescTitle'), y);
    if (data.treatment) {
      size(8);
      font(false);
      const w = doc.splitTextToSize(data.treatment, CW);
      doc.text(w, M, y);
      y += w.length * SLH + 2;
    }
    y = emptyLn(3, y);

    y = secTitle(t('notesTitle'), y);
    if (data.notes) {
      size(8);
      font(false);
      const w = doc.splitTextToSize(data.notes, CW);
      doc.text(w, M, y);
      y += w.length * SLH + 4;
    } else {
      y = emptyLn(2, y);
    }

    y += 3;
    hrule(y);
    y += 4;
    txt(t('financialInfo'), W / 2, y, 10, true, 'center');
    y += 7;
    const rows: Array<[string, string]> = [
      [t('totalPayable'), fmtCur(data.totalAmount, currency)],
      [t('paidLabel'), fmtCur(data.amountPaid, currency)],
      [t('balanceDebt'), fmtCur(data.balance, currency)],
    ];
    const cw1 = 80;
    const cw2 = 60;
    const tx = (W - cw1 - cw2) / 2;
    rows.forEach(([lbl, val]) => {
      doc.rect(tx, y, cw1, 8);
      doc.rect(tx + cw1, y, cw2, 8);
      size(8.5);
      font(true);
      doc.text(lbl, tx + 2, y + 5.5);
      font(false);
      doc.text(val, tx + cw1 + cw2 / 2, y + 5.5, { align: 'center' });
      y += 8;
    });
    y += 6;

    hrule(y);
    y += 5;
    size(8.5);
    font(true);
    const dl = t('attendingDoctor');
    doc.text(dl, M, y);
    const dlw = doc.getTextWidth(dl);
    font(false);
    doc.text(vv(data.doctorName), M + dlw, y);
    if (data.doctorSpecialty) {
      size(7);
      doc.text(data.doctorSpecialty, M + dlw, y + 4);
    }
    size(8);
    font(false);
    doc.text(t('signature'), W - M, y, { align: 'right' });
    y += 14;
    doc.text(t('patientSignature'), M, y);
    y += 10;

    const pc = doc.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setDrawColor(180);
      ln(M, 287, W - M, 287);
      size(6.5);
      font(false);
      doc.setDrawColor(0);
      doc.text(`${t('footerForm')} ${i} ${t('pageOf')} ${pc}`, W / 2, 291, { align: 'center' });
      size(6);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by Docito · docito.app', W - M, 294, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }

    const safe = (data.patientName || 'patient').replace(/\s+/g, '_');
    const ds = (data.appointmentDate || new Date().toLocaleDateString()).replace(/\//g, '-');
    doc.save(`043u_${safe}_${ds}_${locale.toUpperCase()}.pdf`);
  } catch (e) {
    console.error('PDF generation failed:', e);
    throw e;
  }
}
