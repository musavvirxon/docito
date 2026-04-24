import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, PageBreak,
} from 'docx';

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
}

const CONTENT_WIDTH = 9026;
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BORDERS_ALL = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const BORDER_NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BORDERS_NONE = { top: BORDER_NONE, bottom: BORDER_NONE, left: BORDER_NONE, right: BORDER_NONE };
const BORDER_BOTTOM = {
  top: BORDER_NONE, left: BORDER_NONE, right: BORDER_NONE,
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

function t(text: string, size = 18, bold = false) {
  return new TextRun({ text, font: 'Times New Roman', size, bold });
}
function p(children: any[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, spaceAfter = 40) {
  return new Paragraph({ alignment: align, spacing: { before: 0, after: spaceAfter }, children });
}
function centerP(text: string, size = 18, bold = false) {
  return p([t(text, size, bold)], AlignmentType.CENTER, 20);
}
function lines(n: number) {
  return Array(n).fill(null).map(() =>
    new TableRow({
      children: [new TableCell({
        borders: BORDER_BOTTOM,
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [p([], AlignmentType.LEFT, 0)],
      })],
    })
  );
}
function linesTable(n: number) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: lines(n),
  });
}
function toothChart() {
  const nums = ['8','7','6','5','4','3','2','1','1','2','3','4','5','6','7','8'];
  const cw = Math.floor((CONTENT_WIDTH - 900) / 16);
  const lw = 900;
  const numRow = () => new TableRow({
    children: [
      new TableCell({
        borders: BORDERS_NONE,
        width: { size: lw, type: WidthType.DXA },
        children: [p([], AlignmentType.LEFT, 0)],
      }),
      ...nums.map((n, i) => new TableCell({
        borders: i === 7
          ? { ...BORDERS_NONE, right: { style: BorderStyle.SINGLE, size: 10, color: '000000' } }
          : BORDERS_NONE,
        width: { size: cw, type: WidthType.DXA },
        margins: { top: 10, bottom: 10, left: 0, right: 0 },
        children: [p([t(n, 16, true)], AlignmentType.CENTER, 0)],
      })),
    ],
  });
  const boxRow = (label: string) => new TableRow({
    height: { value: 460, rule: 'exact' as any },
    children: [
      new TableCell({
        borders: BORDERS_NONE,
        width: { size: lw, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 40, right: 80 },
        verticalAlign: VerticalAlign.CENTER,
        children: [p([t(label, 15, true)], AlignmentType.RIGHT, 0)],
      }),
      ...[...Array(16)].map((_, i) => new TableCell({
        borders: i === 7
          ? { ...BORDERS_ALL, right: { style: BorderStyle.SINGLE, size: 12, color: '000000' } }
          : BORDERS_ALL,
        width: { size: cw, type: WidthType.DXA },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [p([], AlignmentType.LEFT, 0)],
      })),
    ],
  });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [lw, ...Array(16).fill(cw)],
    rows: [numRow(), boxRow('Yuqori / Верхняя'), boxRow('Quyi / Нижняя'), numRow()],
  });
}
function visitTable(headers: string[]) {
  const hw = [1200, 800, 5526, 1500];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: hw,
    rows: [
      new TableRow({
        children: headers.map((h, i) => new TableCell({
          borders: BORDERS_ALL,
          width: { size: hw[i], type: WidthType.DXA },
          shading: { fill: 'D9D9D9', type: ShadingType.CLEAR, color: 'auto' },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [p([t(h, 17, true)], AlignmentType.CENTER, 0)],
        })),
      }),
      ...Array(10).fill(null).map(() => new TableRow({
        height: { value: 480, rule: 'atLeast' as any },
        children: hw.map((w) => new TableCell({
          borders: BORDERS_ALL,
          width: { size: w, type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 100, right: 100 },
          children: [p([], AlignmentType.LEFT, 0)],
        })),
      })),
    ],
  });
}

export async function generateMedicalCard043uRussian(data: MedicalCardData): Promise<Blob> {
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 18 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        centerP('Министерство здравоохранения Республики Узбекистан', 18, true),
        p([t(`Наименование учреждения: ${data.clinicName || '___________________________'}`, 16)]),
        p([t(`Адрес учреждения: ${data.clinicAddress || '___________________________________'}`, 16)]),
        p([]),
        centerP('МЕДИЦИНСКАЯ КАРТА', 26, true),
        centerP('стоматологического больного', 20, true),
        centerP('Форма N 043/у  |  Медицинская документация', 14),
        p([]),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: BORDERS_ALL,
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 150, right: 150 },
            children: [
              p([t(`Дата заполнения: ${data.appointmentDate || '___________'}`, 17)]),
              p([t(`Фамилия, имя, отчество: ${data.patientName || '_________________________'}`, 17, true)]),
              p([t(`Пол: ${data.gender || '___'}   Возраст: ${data.age || '___'}   Дата рождения: ${data.dob || '____________'}   Телефон: ${data.phone || '____________'}`, 17)]),
              p([t(`Профессия: ${data.profession || '___________________'}   Адрес: ${data.address || '__________________________________'}`, 17)]),
            ],
          })]})],
        }),
        p([]),
        p([t('Диагноз: ', 17, true), t(data.diagnosis || '_______________________________________________', 17)]),
        p([t('Жалобы:', 17, true)]), linesTable(3), p([]),
        p([t('Перенесённые и сопутствующие заболевания:', 17, true)]), linesTable(3), p([]),
        p([t('Развитие настоящего заболевания:', 17, true)]), linesTable(3), p([]),
        p([t('Данные объективного исследования. Внешний осмотр:', 17, true)]), linesTable(3), p([]),
        p([t('Осмотр полости рта:', 17, true)]),
        p([t('Усл. обозначения: отсутствует — О, корень — Кр, кариес — С, пульпит — Р, периодонтит — Pt, пломба — П, пародонтоз — А, подвижность — I/II/III, коронка — К, имплант — Имп', 14)]),
        p([]),
        toothChart(),
        p([]),
        p([t('Прикус: ____________________________', 17)]),
        p([t('Состояние слизистой оболочки, дёсен, альвеолярных отростков и нёба:', 17, true)]), linesTable(3), p([]),
        p([t('Данные рентгеновских и лабораторных исследований:', 17, true)]), linesTable(3),
        p([new PageBreak()], AlignmentType.LEFT, 0),
        centerP('ПЛАН ЛЕЧЕНИЯ', 20, true), linesTable(4), p([]),
        p([t('Дневник лечения:', 17, true)]),
        visitTable(['Дата', 'Зуб', 'Диагноз / Описание лечения', 'Подпись врача']),
        p([]),
        p([new PageBreak()], AlignmentType.LEFT, 0),
        p([t('Продолжение дневника:', 17, true)]),
        visitTable(['Дата', 'Зуб', 'Диагноз / Описание лечения', 'Подпись врача']),
        p([]),
        p([t('Эпикриз:', 17, true)]), linesTable(5),
        p([]),
        p([t(`Лечащий врач: ${data.doctorName || '_______________________'}`, 17)]),
        p([]),
        centerP('Форма N 043/у  |  Министерство здравоохранения Республики Узбекистан', 12),
      ],
    }],
  });
  return await Packer.toBlob(doc);
}

export async function generateMedicalCard043uUzbek(data: MedicalCardData): Promise<Blob> {
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 18 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        centerP("O'ZBEKISTON RESPUBLIKASI SOG'LIQNI SAQLASH VAZIRLIGI", 18, true),
        p([t(`Muassasa nomi: ${data.clinicName || '___________________________'}`, 16)]),
        p([t(`Muassasa manzili: ${data.clinicAddress || '___________________________________'}`, 16)]),
        p([]),
        centerP('TIBBIY KARTA', 28, true),
        centerP('stomatologik bemorning', 20, true),
        centerP('Shakl N 043/u  |  Tibbiy hujjat', 14),
        p([]),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: BORDERS_ALL,
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 150, right: 150 },
            children: [
              p([t(`To'ldirilgan sana: ${data.appointmentDate || '___________'}`, 17)]),
              p([t(`Familiya, ism, sharif: ${data.patientName || '_________________________'}`, 17, true)]),
              p([t(`Jinsi: ${data.gender || '___'}   Yoshi: ${data.age || '___'}   Tug'ilgan sanasi: ${data.dob || '____________'}   Telefon: ${data.phone || '____________'}`, 17)]),
              p([t(`Kasbi: ${data.profession || '___________________'}   Manzil: ${data.address || '__________________________________'}`, 17)]),
            ],
          })]})],
        }),
        p([]),
        p([t('Tashxis: ', 17, true), t(data.diagnosis || '_______________________________________________', 17)]),
        p([t('Shikoyatlar:', 17, true)]), linesTable(3), p([]),
        p([t("O'tkazilgan va qo'shimcha kasalliklar:", 17, true)]), linesTable(3), p([]),
        p([t('Hozirgi kasallikning rivojlanishi:', 17, true)]), linesTable(3), p([]),
        p([t("Ob'ektiv tekshiruv. Tashqi ko'rik:", 17, true)]), linesTable(3), p([]),
        p([t("Og'iz bo'shlig'ini ko'rik:", 17, true)]),
        p([t("Shartli belgilar: yo'q — Y, ildiz — Il, karies — K, pulpit — P, periodontit — Pt, plomba — Pl, paradontoz — Pd, harakatchanlik — I/II/III, toj — T, implant — Imp", 14)]),
        p([]),
        toothChart(),
        p([]),
        p([t('Tishlar tutashuvi (okkluziya): ____________________________', 17)]),
        p([t("Og'iz bo'shlig'i shilliq qavati, milklar, alveolyar o'simtalar va tanglay holati:", 17, true)]), linesTable(3), p([]),
        p([t("Rentgen va laboratoriya tekshiruvlari ma'lumotlari:", 17, true)]), linesTable(3),
        p([new PageBreak()], AlignmentType.LEFT, 0),
        centerP('DAVOLASH REJASI', 20, true), linesTable(4), p([]),
        p([t('Davolash kundaligi:', 17, true)]),
        visitTable(['Sana', 'Tish', 'Tashxis / Davolash tavsifi', 'Shifokor imzosi']),
        p([]),
        p([new PageBreak()], AlignmentType.LEFT, 0),
        p([t('Davolash kundaligi (davomi):', 17, true)]),
        visitTable(['Sana', 'Tish', 'Tashxis / Davolash tavsifi', 'Shifokor imzosi']),
        p([]),
        p([t('Epikriz:', 17, true)]), linesTable(5),
        p([]),
        p([t(`Davoluvchi shifokor: ${data.doctorName || '_______________________'}`, 17)]),
        p([]),
        centerP("Shakl N 043/u  |  O'zbekiston Respublikasi Sog'liqni saqlash vazirligi", 12),
      ],
    }],
  });
  return await Packer.toBlob(doc);
}
