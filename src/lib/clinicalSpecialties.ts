const DENTAL_SPECIALTY_KEYWORDS = [
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
];

export function isDentalSpecialty(specialty: string | null | undefined): boolean {
  const normalized = String(specialty ?? "")
    .toLowerCase()
    .replace(/[^a-z\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return DENTAL_SPECIALTY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}