import { specialtyCategories } from "@/config/doctorFormData";

// Standard main specialties for display/filtering
export const MAIN_SPECIALTY_ICONS: Record<string, string> = {
  "Internal Medicine": "💝",
  "Pediatrics": "👶",
  "Obstetrics & Gynecology": "👥",
  "Neurology": "🧠",
  "Psychiatry": "🧠",
  "Dermatology": "🧴",
  "Emergency Medicine": "🚨",
  "Family Medicine": "👨‍👩‍👧‍👦",
  "Anesthesiology": "💉",
  "Radiology": "📷",
  "Pathology": "🔬",
  "Physical Medicine & Rehabilitation": "🏃",
  "Oncology": "🎗️",
  "General Surgery": "🔪",
  "Orthopedic Surgery": "🦴",
  "Neurosurgery": "🧠",
  "Cardiothoracic Surgery": "❤️",
  "Plastic Surgery": "✨",
  "Urology": "💧",
  "Vascular Surgery": "🩸",
  "Otolaryngology (ENT)": "👂",
  "Ophthalmology": "👁️",
  "General Dentistry": "🦷",
  "Orthodontics & Dentofacial Orthopedics": "🦷",
  "Oral & Maxillofacial Surgery": "🦷",
  "Periodontics": "🦷",
  "Prosthodontics": "🦷",
  "Endodontics": "🦷",
  "Pediatric Dentistry": "🦷",
  "Oral Medicine": "🦷",
  "Physiotherapy": "🏃",
  "Occupational Therapy": "🤲",
  "Speech & Language Therapy": "🗣️",
  "Dietetics / Nutrition": "🥗",
  "Audiology": "👂",
  "Optometry": "👓",
  "Laboratory Medicine": "🧪",
  "Pharmacy": "💊",
  "Nursing": "🏥",
  "Public Health": "🌍",
  "Integrative Medicine": "🌿",
};

// Map display-friendly specialty names to searchable categories
export const DISPLAY_SPECIALTIES = [
  { name: "Primary Care", icon: "💝", categories: ["Internal Medicine", "Family Medicine"] },
  { name: "Dentist", icon: "🦷", categories: ["General Dentistry", "Orthodontics & Dentofacial Orthopedics", "Oral & Maxillofacial Surgery", "Periodontics", "Prosthodontics", "Endodontics", "Pediatric Dentistry", "Oral Medicine"] },
  { name: "OB-GYN", icon: "👥", categories: ["Obstetrics & Gynecology"] },
  { name: "Dermatologist", icon: "🧴", categories: ["Dermatology"] },
  { name: "Psychiatrist", icon: "🧠", categories: ["Psychiatry"] },
  { name: "Ophthalmologist", icon: "👁️", categories: ["Ophthalmology", "Optometry"] },
  { name: "Cardiologist", icon: "❤️", categories: ["Cardiothoracic Surgery"], keywords: ["Cardiology"] },
  { name: "Neurologist", icon: "🧠", categories: ["Neurology", "Neurosurgery"] },
  { name: "Orthopedist", icon: "🦴", categories: ["Orthopedic Surgery", "Physical Medicine & Rehabilitation"] },
  { name: "Pediatrician", icon: "👶", categories: ["Pediatrics"] },
  { name: "ENT", icon: "👂", categories: ["Otolaryngology (ENT)"] },
  { name: "Urologist", icon: "💧", categories: ["Urology"] },
];

/**
 * Extract the main specialty category from a detailed specialty string
 * e.g., "Cardiology" -> "Internal Medicine"
 * e.g., "Internal Medicine - Cardiology" -> "Internal Medicine"
 * e.g., "Pediatric Urology" -> "Urology"
 */
export function getMainSpecialtyCategory(detailedSpecialty: string | null | undefined): string | null {
  if (!detailedSpecialty) return null;
  
  const specialty = detailedSpecialty.trim();
  
  // First check if it's in "MainCategory - SubCategory" format
  if (specialty.includes(" - ")) {
    const [mainCategory] = specialty.split(" - ");
    if (specialtyCategories[mainCategory]) {
      return mainCategory;
    }
  }
  
  // Check if it matches a main category directly
  if (specialtyCategories[specialty]) {
    return specialty;
  }
  
  // Search through all categories to find which main category contains this specialty
  for (const [mainCategory, subCategories] of Object.entries(specialtyCategories)) {
    if (subCategories.includes(specialty)) {
      return mainCategory;
    }
    // Also check for partial matches (e.g., "Cardiology" in "Internal Medicine")
    for (const sub of subCategories) {
      if (sub.toLowerCase().includes(specialty.toLowerCase()) || 
          specialty.toLowerCase().includes(sub.toLowerCase())) {
        return mainCategory;
      }
    }
  }
  
  // Try to match legacy/simplified specialty names
  const legacyMappings: Record<string, string> = {
    "cardiologist": "Internal Medicine",
    "cardiology": "Internal Medicine",
    "dentist": "General Dentistry",
    "dermatologist": "Dermatology",
    "pediatrician": "Pediatrics",
    "neurologist": "Neurology",
    "psychiatrist": "Psychiatry",
    "ophthalmologist": "Ophthalmology",
    "orthopedist": "Orthopedic Surgery",
    "urologist": "Urology",
    "general practice": "Family Medicine",
    "primary care": "Family Medicine",
    "ob-gyn": "Obstetrics & Gynecology",
    "obgyn": "Obstetrics & Gynecology",
    "ent": "Otolaryngology (ENT)",
  };
  
  const lowerSpecialty = specialty.toLowerCase();
  for (const [key, value] of Object.entries(legacyMappings)) {
    if (lowerSpecialty.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Get a display-friendly specialty name from a detailed specialty
 */
export function getDisplaySpecialty(detailedSpecialty: string | null | undefined): string {
  if (!detailedSpecialty) return "General Practice";
  
  const mainCategory = getMainSpecialtyCategory(detailedSpecialty);
  
  // Find matching display specialty
  if (mainCategory) {
    for (const displaySpec of DISPLAY_SPECIALTIES) {
      if (displaySpec.categories.includes(mainCategory)) {
        return displaySpec.name;
      }
    }
    return mainCategory;
  }
  
  // Return original if no mapping found
  return detailedSpecialty;
}

/**
 * Get icon for a specialty
 */
export function getSpecialtyIcon(specialty: string | null | undefined): string {
  if (!specialty) return "👨‍⚕️";
  
  const mainCategory = getMainSpecialtyCategory(specialty);
  
  if (mainCategory && MAIN_SPECIALTY_ICONS[mainCategory]) {
    return MAIN_SPECIALTY_ICONS[mainCategory];
  }
  
  // Check display specialties for icon
  for (const displaySpec of DISPLAY_SPECIALTIES) {
    if (displaySpec.name.toLowerCase() === specialty.toLowerCase()) {
      return displaySpec.icon;
    }
  }
  
  return "👨‍⚕️";
}

/**
 * Get search terms for a display specialty
 */
export function getSearchTermsForDisplaySpecialty(displayName: string): string[] {
  const displaySpec = DISPLAY_SPECIALTIES.find(s => s.name === displayName);
  if (!displaySpec) return [displayName];
  
  const terms: string[] = [displayName, ...displaySpec.categories];
  
  // Add all sub-specialties from the categories
  for (const category of displaySpec.categories) {
    const subs = specialtyCategories[category];
    if (subs) {
      terms.push(...subs);
    }
  }
  
  // Add keywords if any
  if ('keywords' in displaySpec && displaySpec.keywords) {
    terms.push(...(displaySpec.keywords as string[]));
  }
  
  return [...new Set(terms)];
}
