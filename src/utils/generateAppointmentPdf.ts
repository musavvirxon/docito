import jsPDF from 'jspdf';

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
  treatment?: string;
  serviceName?: string;
  doctorName: string;
  doctorSpecialty?: string;
  notes?: string;
  totalAmount?: number;
  amountPaid?: number;
  balance?: number;
}

const fmtCur = (n?: number) =>
  n != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
    : '_____________';
const v = (x?: string | number | null, fb = '______________________________') =>
  x != null && x !== '' ? String(x) : fb;

export function generateAppointmentPdf(
  data: AppointmentPdfData,
  lang: 'ru' | 'uz' = 'ru',
): void {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const M = 15;
    const CW = W - M * 2;
    let y = 15;
    const LH = 6;
    const SLH = 5;
    const ru = lang === 'ru';

    const font = (bold = false) => doc.setFont('helvetica', bold ? 'bold' : 'normal');
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
      (ru ? 'Пол: ' : 'Жинси: ') +
        v(data.gender, '__') +
        (ru ? '  Возраст: ' : '  Йоши: ') +
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
    const cx = M + 9;
    const cw = (CW - 11) / 16;
    const ch = 6;
    const nums = ['8', '7', '6', '5', '4', '3', '2', '1', '1', '2', '3', '4', '5', '6', '7', '8'];
    size(6.5);
    font(false);
    doc.text(ru ? '← Правая' : "← O'ng", cx + cw * 3.5, y, { align: 'center' });
    doc.text(ru ? 'Левая →' : 'Chap →', cx + cw * 12.5, y, { align: 'center' });
    y += 3;
    size(7);
    font(true);
    nums.forEach((n, i) => doc.text(n, cx + i * cw + cw / 2, y, { align: 'center' }));
    y += 3;
    nums.forEach((_, i) => doc.rect(cx + i * cw, y, cw, ch));
    ln(cx + cw * 8, y - 4, cx + cw * 8, y + ch * 2 + 4, 0.8);
    y += ch;
    nums.forEach((_, i) => doc.rect(cx + i * cw, y, cw, ch));
    y += ch;
    size(7);
    font(true);
    nums.forEach((n, i) => doc.text(n, cx + i * cw + cw / 2, y + 3, { align: 'center' }));
    size(7);
    font(false);
    doc.text(ru ? 'Верхняя' : 'Yuqori', M + 2, y - 12);
    doc.text(ru ? 'Нижняя' : 'Quyi', M + 2, y - 6);
    y += 10;

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
          ['Итого к оплате:', fmtCur(data.totalAmount)],
          ['Оплачено:', fmtCur(data.amountPaid)],
          ['Остаток / Долг:', fmtCur(data.balance)],
        ]
      : [
          ["To'lov summasi:", fmtCur(data.totalAmount)],
          ["To'langan:", fmtCur(data.amountPaid)],
          ['Qoldiq / Qarz:', fmtCur(data.balance)],
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
