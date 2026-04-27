// Shared Unicode font loader for jsPDF.
// jsPDF's built-in fonts (helvetica/times/courier) are WinAnsi/Latin-1 only,
// so any Cyrillic, Uzbek diacritic, or smart quote renders as a black box.
// We embed Noto Sans (Cyrillic + Latin Extended) once and reuse the cached
// base64 across all PDF generators.

export const PDF_FONT_NAME = 'NotoSans';

const TTF_REGULAR_URL =
  'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf';
const TTF_BOLD_URL =
  'https://fonts.gstatic.com/s/notosans/v36/o-0NIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjA-BFlVfE5Mh8nqKn7BqHe.ttf';

const cache: { regular?: string; bold?: string; promise?: Promise<void> } = {};

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as any,
    );
  }
  return btoa(binary);
}

async function loadFonts(): Promise<void> {
  if (cache.regular && cache.bold) return;
  if (!cache.promise) {
    cache.promise = (async () => {
      const [reg, bold] = await Promise.all([
        fetchAsBase64(TTF_REGULAR_URL),
        fetchAsBase64(TTF_BOLD_URL),
      ]);
      cache.regular = reg;
      cache.bold = bold;
    })();
  }
  await cache.promise;
}

/**
 * Registers Noto Sans (regular + bold) on the given jsPDF document so that
 * Cyrillic and Uzbek text renders correctly. Safe to call multiple times.
 * After calling this, use: doc.setFont('NotoSans', 'normal' | 'bold').
 */
export async function ensureUnicodeFont(doc: any): Promise<void> {
  await loadFonts();
  doc.addFileToVFS(`${PDF_FONT_NAME}-Regular.ttf`, cache.regular!);
  doc.addFont(`${PDF_FONT_NAME}-Regular.ttf`, PDF_FONT_NAME, 'normal');
  doc.addFileToVFS(`${PDF_FONT_NAME}-Bold.ttf`, cache.bold!);
  doc.addFont(`${PDF_FONT_NAME}-Bold.ttf`, PDF_FONT_NAME, 'bold');
  doc.setFont(PDF_FONT_NAME, 'normal');
}

/**
 * Map a UnifiedProcedure / appointment_procedures row to the short legend
 * code that should appear inside a tooth cell on the 043/u dental chart.
 * Uses the same legend already printed under the chart.
 */
export function procedureToToothCode(
  raw: string | undefined | null,
  lang: 'ru' | 'uz' = 'ru',
): string {
  if (!raw) return '';
  const s = raw.toLowerCase();
  const ru = lang === 'ru';
  if (/(extract|удал|olib|remov|missing|absent|отсут)/.test(s)) return ru ? 'О' : 'Y';
  if (/(implant|имплант)/.test(s)) return ru ? 'Имп' : 'Imp';
  if (/(crown|коронк|toj)/.test(s)) return ru ? 'К' : 'T';
  if (/(filling|пломб|plomba|restorat)/.test(s)) return ru ? 'П' : 'Pl';
  if (/(root.?canal|endo|пульпит|pulpit)/.test(s)) return ru ? 'Р' : 'P';
  if (/(periodont|периодонт)/.test(s)) return 'Pt';
  if (/(caries|кариес|karies|decay)/.test(s)) return ru ? 'С' : 'K';
  if (/(periodontal|пародонт|paradontoz)/.test(s)) return ru ? 'А' : 'Pd';
  // Fallback: first letter of the procedure name, uppercased.
  const first = raw.trim().charAt(0);
  return first ? first.toUpperCase() : '•';
}

/**
 * Maps an FDI tooth number (11–18, 21–28, 31–38, 41–48) to the (row, col)
 * cell index on the 043/u tooth chart, where row 0 = upper, row 1 = lower
 * and col 0..15 corresponds to the printed numbers
 *   8 7 6 5 4 3 2 1 | 1 2 3 4 5 6 7 8
 */
export function fdiToCell(fdi: number): { row: 0 | 1; col: number } | null {
  if (!Number.isFinite(fdi)) return null;
  const q = Math.floor(fdi / 10);
  const n = fdi % 10;
  if (n < 1 || n > 8) return null;
  // Quadrant 1 = upper-right (cols 0..7, number "8..1")
  // Quadrant 2 = upper-left  (cols 8..15, number "1..8")
  // Quadrant 3 = lower-left  (cols 8..15)
  // Quadrant 4 = lower-right (cols 0..7)
  switch (q) {
    case 1: return { row: 0, col: 8 - n };       // 11→7, 18→0
    case 2: return { row: 0, col: 7 + n };       // 21→8, 28→15
    case 3: return { row: 1, col: 7 + n };       // 31→8, 38→15
    case 4: return { row: 1, col: 8 - n };       // 41→7, 48→0
    default: return null;
  }
}

export interface ToothFinding {
  tooth: number;        // FDI number, e.g. 36
  code?: string;        // pre-computed short code (С, П, Imp, …); if absent, derived from `label`
  label?: string;       // long description shown in the footnote list
}
