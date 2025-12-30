export const DEFAULT_PROCEDURE_CATEGORIES: Array<{ value: string; label: string }> = [
  // General Medicine
  { value: "general_consultation", label: "General Consultation" },
  { value: "preventive_care", label: "Preventive Care" },
  { value: "diagnostic", label: "Diagnostic / Examination" },
  { value: "vaccination", label: "Vaccination / Immunization" },
  { value: "chronic_disease", label: "Chronic Disease Management" },
  { value: "acute_care", label: "Acute Care / Urgent Visit" },
  { value: "follow_up", label: "Follow-up Visit" },
  { value: "minor_surgery", label: "Minor Surgery / Procedure" },
  { value: "physical_therapy", label: "Physical Therapy" },
  { value: "mental_health", label: "Mental Health / Counseling" },
  { value: "womens_health", label: "Women's Health" },
  { value: "pediatric_care", label: "Pediatric Care" },
  { value: "geriatric_care", label: "Geriatric Care" },

  // Dental (existing)
  { value: "general", label: "General" },
  { value: "preventive", label: "Preventive" },
  { value: "restorative", label: "Restorative" },
  { value: "cosmetic", label: "Cosmetic" },
  { value: "endodontic", label: "Endodontics" },
  { value: "periodontic", label: "Periodontics" },
  { value: "orthodontic", label: "Orthodontics" },
  { value: "oral_surgery", label: "Oral Surgery" },
  { value: "prosthodontic", label: "Prosthodontics" },
  { value: "pediatric_dentistry", label: "Pediatric Dentistry" },
  { value: "emergency", label: "Emergency" },
];

const titleCase = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const getProcedureCategoryLabel = (category?: string | null) => {
  if (!category) return "Uncategorized";
  const cleaned = category.replace(/[_-]+/g, " ").trim();
  return cleaned ? titleCase(cleaned) : "Uncategorized";
};

export const mergeCategories = (
  base: Array<{ value: string; label: string }>,
  customValues: string[]
) => {
  const map = new Map<string, string>();
  for (const c of base) map.set(c.value, c.label);

  for (const val of customValues) {
    if (!val) continue;
    if (!map.has(val)) map.set(val, getProcedureCategoryLabel(val));
  }

  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
};
