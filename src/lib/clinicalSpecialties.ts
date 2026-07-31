const DENTAL_SPECIALTY_KEYWORDS = [
  // Latin
  "dent",
  "stomatolog",
  "orthodont",
  "endodont",
  "periodont",
  "parodont",
  "pedodont",
  "prosthodont",
  "oral surgeon",
  "oral surgery",
  "maxillofacial",
  "omfs",
  "dentoalveolar",
  // Uzbek
  "tish",
  "ortodont",
  // Cyrillic (ru/uz)
  "стоматолог",
  "стоматологи",
  "ортодонт",
  "зубн",
  "зуб",
  "челюстно",
];

export function isDentalSpecialty(specialty: string | null | undefined): boolean {
  // Keep unicode letters (Cyrillic etc.) — only collapse punctuation/whitespace.
  const normalized = String(specialty ?? "")
    .toLowerCase()
    .replace(/[_\-/.,()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return DENTAL_SPECIALTY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
