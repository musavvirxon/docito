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
  /** Doctor's external (extra-oral) examination notes */
  externalExam?: string;
  /** Oral cavity / mucosa / gingiva description */
  oralCavity?: string;
  /** X-ray + lab investigation summary */
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
  /** Optional dental findings rendered into the 32-tooth chart */
  toothFindings?: ToothFinding[];
}

const fmtCur = (n?: number, currency = 'USD') =>
  n != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
    : '_____________';
const v = (x?: string | number | null, fb = '______________________________') =>
  x != null && x !== '' ? String(x) : fb;

export async function generateAppointmentPdf(
  data: AppointmentPdfData,
  lang: 'ru' | 'uz' = 'ru',
): Promise<void> {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    // CRITICAL: jsPDF's built-in Helvetica only supports Latin-1, so any
    // Cyrillic / Uzbek text would render as black squares without this.
    await ensureUnicodeFont(doc);

    const W = 210;
    const M = 15;
    const CW = W - M * 2;
    let y = 15;
    const LH = 6;
    const SLH = 5;
    const ru = lang === 'ru';
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
    const secTitle = (t: string, yy: number) => {
      txt(t, M, yy, 9, true);
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

    // ─ HEADER ────────────────────────────────────────────
    txt(
      ru
        ? 'Министерство здравоохранения Республики Узбекистан'
        : "O'ZBEKISTON RESPUBLIKASI SOG'LIQNI SAQLASH VAZIRLIGI",
      W / 2,
      y,
      9,
      true,
      'center',
    );
    y += LH;

    size(7.5);
    font(false);
    doc.text(
      (ru ? 'Наименование учреждения: ' : 'Muassasa nomi: ') +
        v(data.clinicName, '__________________________'),
      M,
      y,
    );
    doc.text(ru ? 'Код по ОКПО: ____________' : 'OKPO kodi: ____________', W - M, y, {
      align: 'right',
    });
    y += SLH;
    doc.text(
      (ru ? 'Адрес: ' : 'Manzil: ') + v(data.clinicAddress, '_________________________'),
      M,
      y,
    );
    y += LH;

    // ─ TITLE ─────────────────────────────────────────────
    hrule(y);
    y += 3;
    txt(ru ? 'МЕДИЦИНСКАЯ КАРТА' : 'TIBBIY KARTA', W / 2, y, 15, true, 'center');
    y += 7;
    txt(
      ru ? 'стоматологического больного' : 'stomatologik bemorning',
      W / 2,
      y,
      10,
      true,
      'center',
    );
    y += 5;
    txt(
      ru ? 'Форма N 043/у  |  Медицинская документация' : 'Shakl N 043/u  |  Tibbiy hujjat',
      W / 2,
      y,
      7,
      false,
      'center',
    );
    y += 5;
    hrule(y);
    y += 4;

    // ─ PATIENT BOX ────────────────────────────────────────
    const bt = y;
    doc.rect(M, y, CW, 30);
    y += 4;
    size(8);
    font(false);
    doc.text((ru ? 'Дата: ' : 'Sana: ') + v(data.appointmentDate), M + 3, y);
    doc.text((ru ? 'Время: ' : 'Vaqt: ') + v(data.appointmentTime, '______'), M + 65, y);
    y += SLH;
    size(8.5);
    font(true);
    doc.text(
      (ru ? 'Фамилия, имя, отчество: ' : 'Familiya, ism, sharif: ') + v(data.patientName),
      M + 3,
      y,
    );
    y += SLH;
    size(8);
    font(false);
    doc.text(
      (ru ? 'Пол: ' : 'Jinsi: ') +
        v(data.gender, '__') +
        (ru ? '  Возраст: ' : '  Yoshi: ') +
        v(data.age, '__') +
        (ru ? '  Дата рождения: ' : "  Tug'ilgan: ") +
        v(data.dob, '__________') +
        (ru ? '  Тел: ' : '  Tel: ') +
        v(data.phone, '____________'),
      M + 3,
      y,
    );
    y += SLH;
    doc.text(
      (ru ? 'Профессия: ' : 'Kasbi: ') +
        v(data.profession, '_____________') +
        (ru ? '  Адрес: ' : '  Manzil: ') +
        v(data.address, '_______________________'),
      M + 3,
      y,
    );
    y = bt + 34;

    // ─ DIAGNOSIS ─────────────────────────────────────────
    fldLine(ru ? 'Диагноз: ' : 'Tashxis: ', v(data.diagnosis, ''), M, y, CW);
    y += LH;
    ln(M, y, W - M, y);
    y += LH;

    y = secTitle(ru ? 'Жалобы:' : 'Shikoyatlar:', y);
    if (data.complaints) {
      size(8);
      font(false);
      const w = doc.splitTextToSize(data.complaints, CW);
      doc.text(w, M, y);
      y += w.length * SLH + 2;
    }
    y = emptyLn(2, y);

    y = secTitle(
      ru
        ? 'Данные объективного исследования. Внешний осмотр:'
        : "Ob'ektiv tekshiruv. Tashqi ko'rik:",
      y,
    );
    y = emptyLn(2, y);

    // ─ ORAL CAVITY ──────────────────────────────────────
    y = secTitle(ru ? 'Осмотр полости рта:' : "Og'iz bo'shlig'ini ko'rik:", y);
    size(6.5);
    font(false);
    doc.text(
      ru
        ? 'Усл. обозн.: отсутствует-О, корень-Кр, кариес-С, пульпит-Р, периодонтит-Pt, пломба-П, пародонтоз-А, подвижн.-I/II/III, коронка-К, имплант-Имп'
        : "Shartli bel.: yo'q-Y, ildiz-Il, karies-K, pulpit-P, periodontit-Pt, plomba-Pl, paradontoz-Pd, harak.-I/II/III, toj-T, implant-Imp",
      M,
      y,
    );
    y += SLH;

    // ─ TOOTH CHART ────────────────────────────────────────
    const cx = M + 11;
    const cw = (CW - 13) / 16;
    const ch = 6;
    const nums = ['8', '7', '6', '5', '4', '3', '2', '1', '1', '2', '3', '4', '5', '6', '7', '8'];

    // Direction labels (above the chart, with their own row)
    size(6.5);
    font(false);
    doc.text(ru ? '← Правая' : "← O'ng", cx + cw * 3.5, y, { align: 'center' });
    doc.text(ru ? 'Левая →' : 'Chap →', cx + cw * 12.5, y, { align: 'center' });
    y += 4;

    // Top FDI numbers row
    size(7);
    font(true);
    nums.forEach((n, i) => doc.text(n, cx + i * cw + cw / 2, y, { align: 'center' }));
    y += 2;

    // Upper jaw cells
    const upperY = y;
    nums.forEach((_, i) => doc.rect(cx + i * cw, upperY, cw, ch));
    // Lower jaw cells
    const lowerY = upperY + ch;
    nums.forEach((_, i) => doc.rect(cx + i * cw, lowerY, cw, ch));

    // Vertical midline (between R/L)
    ln(cx + cw * 8, upperY - 2, cx + cw * 8, lowerY + ch + 2, 0.8);

    // Side labels — Upper / Lower — placed to the LEFT of cells, vertically centered on each row
    size(6.5);
    font(false);
    doc.text(ru ? 'Верх' : 'Yuq', M, upperY + ch / 2 + 1.2, { align: 'left' });
    doc.text(ru ? 'Низ' : 'Pas', M, lowerY + ch / 2 + 1.2, { align: 'left' });

    // Bottom FDI numbers row (under the lower-jaw cells)
    y = lowerY + ch + 3.5;
    size(7);
    font(true);
    nums.forEach((n, i) => doc.text(n, cx + i * cw + cw / 2, y, { align: 'center' }));
    y += 2;

    // Stamp the diagnoses inside the matching cells
    const findings = (data.toothFindings || []).map((f) => ({
      ...f,
      code: f.code || procedureToToothCode(f.label, lang),
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

    // Footnote list of long descriptions
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

    // ─ BITE & MUCOSA ─────────────────────────────────
    fldLine(ru ? 'Прикус: ' : 'Tishlar tutashuvi: ', '', M, y, CW / 2);
    y += LH;
    y = secTitle(
      ru
        ? 'Состояние слизистой оболочки, дёсен, альвеолярных отростков и нёба:'
        : "Og'iz bo'shlig'i shilliq qavati, milklar va tanglay holati:",
      y,
    );
    y = emptyLn(2, y);
    y = secTitle(
      ru
        ? 'Данные рентгеновских и лабораторных исследований:'
        : "Rentgen va laboratoriya tekshiruvlari ma'lumotlari:",
      y,
    );
    y = emptyLn(2, y);

    // ─ PAGE 2 ───────────────────────────────────────────────
    doc.addPage();
    y = 15;
    hrule(y);
    y += 4;
    txt(
      ru ? 'ПЛАН ЛЕЧЕНИЯ / ДНЕВНИК ЛЕЧЕНИЯ' : 'DAVOLASH REJASI / DAVOLASH KUNDALIGI',
      W / 2,
      y,
      11,
      true,
      'center',
    );
    y += 7;

    fldLine(
      ru ? 'Услуга / процедура: ' : 'Xizmat / protsedura: ',
      v(data.serviceName, ''),
      M,
      y,
      CW,
    );
    y += LH;

    // Procedures table from findings
    if (findings.length > 0) {
      y = secTitle(ru ? 'Выполненные процедуры:' : 'Bajarilgan protseduralar:', y);
      size(8);
      font(true);
      doc.rect(M, y, 18, 6);
      doc.rect(M + 18, y, CW - 18, 6);
      doc.text(ru ? 'Зуб' : 'Tish', M + 9, y + 4, { align: 'center' });
      doc.text(ru ? 'Описание' : 'Tavsif', M + 18 + 3, y + 4);
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

    y = secTitle(ru ? 'Описание лечения:' : 'Davolash tavsifi:', y);
    if (data.treatment) {
      size(8);
      font(false);
      const w = doc.splitTextToSize(data.treatment, CW);
      doc.text(w, M, y);
      y += w.length * SLH + 2;
    }
    y = emptyLn(3, y);

    y = secTitle(ru ? 'Примечания:' : 'Izohlar:', y);
    if (data.notes) {
      size(8);
      font(false);
      const w = doc.splitTextToSize(data.notes, CW);
      doc.text(w, M, y);
      y += w.length * SLH + 4;
    } else {
      y = emptyLn(2, y);
    }

    // ─ FINANCE TABLE ───────────────────────────────────────
    y += 3;
    hrule(y);
    y += 4;
    txt(
      ru ? 'ФИНАНСОВАЯ ИНФОРМАЦИЯ' : "MOLIYAVIY MA'LUMOT",
      W / 2,
      y,
      10,
      true,
      'center',
    );
    y += 7;
    const rows = ru
      ? [
          ['Итого к оплате:', fmtCur(data.totalAmount, currency)],
          ['Оплачено:', fmtCur(data.amountPaid, currency)],
          ['Остаток / Долг:', fmtCur(data.balance, currency)],
        ]
      : [
          ["To'lov summasi:", fmtCur(data.totalAmount, currency)],
          ["To'langan:", fmtCur(data.amountPaid, currency)],
          ['Qoldiq / Qarz:', fmtCur(data.balance, currency)],
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

    // ─ SIGNATURES ──────────────────────────────────────────
    hrule(y);
    y += 5;
    size(8.5);
    font(true);
    const dl = ru ? 'Лечащий врач: ' : 'Davoluvchi shifokor: ';
    doc.text(dl, M, y);
    const dlw = doc.getTextWidth(dl);
    font(false);
    doc.text(v(data.doctorName), M + dlw, y);
    if (data.doctorSpecialty) {
      size(7);
      doc.text(data.doctorSpecialty, M + dlw, y + 4);
    }
    size(8);
    font(false);
    doc.text(
      ru ? 'Подпись: _______________________' : 'Imzo: _______________________',
      W - M,
      y,
      { align: 'right' },
    );
    y += 14;
    doc.text(
      ru
        ? 'Подпись пациента: ___________________________'
        : 'Bemor imzosi: ___________________________',
      M,
      y,
    );
    y += 10;

    // ─ FOOTER (all pages) ────────────────────────────────
    const pc = doc.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setDrawColor(180);
      ln(M, 287, W - M, 287);
      size(6.5);
      font(false);
      doc.setDrawColor(0);
      doc.text(
        ru
          ? `Форма N 043/у  |  Министерство здравоохранения Республики Узбекистан  |  Стр. ${i} из ${pc}`
          : `Shakl N 043/u  |  O'zbekiston Respublikasi Sog'liqni saqlash vazirligi  |  Bet ${i} / ${pc}`,
        W / 2,
        291,
        { align: 'center' },
      );
    }

    const safe = (data.patientName || 'patient').replace(/\s+/g, '_');
    const ds = (data.appointmentDate || new Date().toLocaleDateString()).replace(/\//g, '-');
    doc.save(`043u_${safe}_${ds}_${lang.toUpperCase()}.pdf`);
  } catch (e) {
    console.error('PDF generation failed:', e);
    throw e;
  }
}
