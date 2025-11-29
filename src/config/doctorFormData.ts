// Shared data between DoctorSignUp and DoctorProfileSection

export const specialtyCategories: Record<string, string[]> = {
  "Internal Medicine": [
    "Internal Medicine (General)",
    "Cardiology",
    "Endocrinology",
    "Gastroenterology",
    "Hepatology",
    "Nephrology",
    "Pulmonology / Respiratory Medicine",
    "Rheumatology",
    "Infectious Diseases",
    "Hematology",
    "Oncology",
    "Allergy & Immunology",
    "Geriatric Medicine",
    "Adolescent Medicine",
    "Hospital Medicine",
  ],
  "Pediatrics": [
    "Pediatrics (General)",
    "Pediatric Cardiology",
    "Pediatric Neurology",
    "Pediatric Endocrinology",
    "Pediatric Gastroenterology",
    "Pediatric Pulmonology",
    "Pediatric Nephrology",
    "Pediatric Hematology & Oncology",
    "Neonatology",
    "Pediatric Surgery",
    "Pediatric Intensive Care",
  ],
  "Obstetrics & Gynecology": [
    "Obstetrics & Gynecology (General)",
    "Maternal–Fetal Medicine",
    "Reproductive Endocrinology & Infertility",
    "Gynecologic Oncology",
    "Urogynecology",
  ],
  "Neurology": [
    "Neurology (General)",
    "Clinical Neurophysiology",
    "Neuromuscular Medicine",
    "Vascular Neurology (Stroke)",
    "Neurocritical Care",
    "Epileptology",
    "Movement Disorders",
    "Headache Medicine",
    "Sleep Medicine",
  ],
  "Psychiatry": [
    "Psychiatry (General)",
    "Child & Adolescent Psychiatry",
    "Geriatric Psychiatry",
    "Addiction Psychiatry",
    "Forensic Psychiatry",
    "Consultation–Liaison Psychiatry",
    "Sleep Psychiatry",
  ],
  "Dermatology": [
    "Dermatology (General)",
    "Cosmetic Dermatology",
    "Dermatopathology",
    "Pediatric Dermatology",
    "Mohs Surgery",
  ],
  "Emergency Medicine": [
    "Emergency Medicine (General)",
    "Medical Toxicology",
    "Sports Medicine",
    "Pediatric Emergency Medicine",
    "Disaster Medicine",
    "Critical Care",
  ],
  "Family Medicine": [
    "Family Medicine (General)",
    "Sports Medicine",
    "Geriatric Medicine",
    "Preventive Medicine",
  ],
  "Anesthesiology": [
    "Anesthesiology (General)",
    "Cardiothoracic Anesthesia",
    "Neuroanesthesia",
    "Pediatric Anesthesia",
    "Critical Care",
    "Pain Medicine",
  ],
  "Radiology": [
    "Radiology (General)",
    "Neuroradiology",
    "Musculoskeletal Radiology",
    "Abdominal Imaging",
    "Breast Imaging",
    "Pediatric Radiology",
    "Vascular & Interventional Radiology",
    "Nuclear Medicine",
  ],
  "Pathology": [
    "Pathology (General)",
    "Anatomical Pathology",
    "Clinical Pathology",
    "Cytopathology",
    "Hematopathology",
    "Forensic Pathology",
    "Molecular Pathology",
  ],
  "Physical Medicine & Rehabilitation": [
    "Physical Medicine & Rehabilitation (General)",
    "Sports Medicine",
    "Pain Medicine",
    "Spinal Cord Injury Medicine",
  ],
  "Oncology": [
    "Oncology (General)",
    "Medical Oncology",
    "Surgical Oncology",
    "Radiation Oncology",
    "Gynecologic Oncology",
    "Hematologic Oncology",
  ],
  "General Surgery": [
    "General Surgery",
    "Bariatric Surgery",
    "Breast Surgery",
    "Transplant Surgery",
    "Trauma Surgery",
    "Colorectal Surgery",
    "Minimally Invasive Surgery",
  ],
  "Orthopedic Surgery": [
    "Orthopedic Surgery (General)",
    "Spine Surgery",
    "Joint Replacement",
    "Sports Medicine",
    "Hand Surgery",
    "Pediatric Orthopedics",
    "Trauma Orthopedics",
  ],
  "Neurosurgery": [
    "Neurosurgery (General)",
    "Skull Base Surgery",
    "Spine Surgery",
    "Vascular Neurosurgery",
    "Pediatric Neurosurgery",
    "Functional Neurosurgery",
    "Neuro-Oncology",
  ],
  "Cardiothoracic Surgery": [
    "Cardiothoracic Surgery (General)",
    "Adult Cardiac Surgery",
    "Thoracic Surgery",
    "Congenital Heart Surgery",
  ],
  "Plastic Surgery": [
    "Plastic Surgery (General)",
    "Aesthetic (Cosmetic) Surgery",
    "Craniofacial Surgery",
    "Burn Surgery",
    "Hand Surgery",
    "Microsurgery",
  ],
  "Urology": [
    "Urology (General)",
    "Endourology",
    "Pediatric Urology",
    "Andrology",
    "Oncologic Urology",
    "Female Urology",
  ],
  "Vascular Surgery": [
    "Vascular Surgery (General)",
    "Endovascular Surgery",
    "Aortic Surgery",
    "Peripheral Vascular Surgery",
  ],
  "Otolaryngology (ENT)": [
    "Otolaryngology (General)",
    "Rhinology",
    "Laryngology",
    "Otology & Neurotology",
    "Head & Neck Surgery",
    "Pediatric ENT",
    "Facial Plastics",
  ],
  "Ophthalmology": [
    "Ophthalmology (General)",
    "Retina & Vitreous",
    "Cornea & External Disease",
    "Glaucoma",
    "Oculoplastics",
    "Neuro-ophthalmology",
    "Pediatric Ophthalmology",
    "Refractive Surgery",
  ],
  "General Dentistry": ["General Dentistry"],
  "Orthodontics & Dentofacial Orthopedics": ["Orthodontics & Dentofacial Orthopedics"],
  "Oral & Maxillofacial Surgery": [
    "Oral & Maxillofacial Surgery (General)",
    "Implant Surgery",
    "Orthognathic Surgery",
    "TMJ Surgery",
    "Facial Trauma",
    "Dentoalveolar Surgery",
  ],
  "Periodontics": [
    "Periodontics (General)",
    "Periodontal Surgery",
    "Soft Tissue Grafting",
    "Implant Periodontics",
  ],
  "Prosthodontics": [
    "Prosthodontics (General)",
    "Fixed Prosthodontics",
    "Removable Prosthodontics",
    "Implant Prosthodontics",
  ],
  "Endodontics": ["Endodontics"],
  "Pediatric Dentistry": ["Pediatric Dentistry"],
  "Oral Medicine": [
    "Oral Medicine (General)",
    "Oral Mucosal Diseases",
    "Orofacial Pain",
    "Dental Sleep Medicine",
  ],
  "Oral & Maxillofacial Radiology": ["Oral & Maxillofacial Radiology"],
  "Oral & Maxillofacial Pathology": ["Oral & Maxillofacial Pathology"],
  "Physiotherapy": ["Physiotherapy"],
  "Occupational Therapy": ["Occupational Therapy"],
  "Speech & Language Therapy": ["Speech & Language Therapy"],
  "Dietetics / Nutrition": ["Dietetics / Nutrition"],
  "Audiology": ["Audiology"],
  "Optometry": ["Optometry"],
  "Radiography": ["Radiography"],
  "Laboratory Medicine": ["Laboratory Medicine"],
  "Pharmacy": ["Pharmacy"],
  "Midwifery": ["Midwifery"],
  "Nursing": [
    "Nursing (General)",
    "Critical Care Nursing",
    "ER Nursing",
    "Oncology Nursing",
    "Pediatric Nursing",
  ],
  "Public Health": [
    "Public Health (General)",
    "Epidemiology",
    "Health Policy",
    "Environmental Health",
    "Preventive Medicine",
    "Lifestyle Medicine",
    "Aerospace Medicine",
  ],
  "Integrative Medicine": [
    "Integrative Medicine (General)",
    "Acupuncture",
    "Chiropractic",
    "Traditional Chinese Medicine",
    "Homeopathy",
  ],
};

export const allLanguages = [
  // Major world languages first (sorted by speakers)
  "English", "Mandarin Chinese", "Hindi", "Spanish", "French", "Arabic", "Bengali", "Portuguese", "Russian", "Japanese",
  "German", "Korean", "Vietnamese", "Turkish", "Italian", "Thai", "Polish", "Ukrainian", "Dutch", "Greek",
  "Czech", "Swedish", "Hungarian", "Finnish", "Danish", "Norwegian", "Romanian", "Bulgarian", "Slovak", "Croatian",
  "Serbian", "Slovenian", "Lithuanian", "Latvian", "Estonian", "Albanian", "Macedonian", "Bosnian",
  // Asian languages
  "Cantonese", "Wu Chinese", "Min Chinese", "Hakka Chinese", "Taiwanese",
  "Indonesian", "Malay", "Tagalog", "Filipino", "Javanese", "Sundanese",
  "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu", "Sindhi", "Nepali", "Sinhala",
  "Burmese", "Khmer", "Lao",
  // Middle Eastern languages
  "Hebrew", "Persian (Farsi)", "Kurdish", "Pashto", "Dari", "Azerbaijani",
  // African languages
  "Swahili", "Amharic", "Hausa", "Yoruba", "Igbo", "Zulu", "Xhosa", "Afrikaans", "Somali", "Oromo", "Tigrinya",
  // Central Asian languages
  "Uzbek", "Kazakh", "Kyrgyz", "Tajik", "Turkmen", "Uyghur", "Mongolian",
  // Other European languages
  "Catalan", "Basque", "Galician", "Welsh", "Irish", "Scottish Gaelic", "Icelandic", "Maltese", "Luxembourgish",
  // South American indigenous
  "Quechua", "Guarani", "Aymara",
  // Sign languages
  "American Sign Language (ASL)", "British Sign Language (BSL)", "International Sign Language",
  // Other
  "Esperanto", "Latin"
];

export const consultationTypes = ["In-person", "Video", "Phone", "Chat", "Home Visit"];

export const experienceOptions = [
  { value: "0-2", label: "0-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "6-10", label: "6-10 years" },
  { value: "11-15", label: "11-15 years" },
  { value: "16-20", label: "16-20 years" },
  { value: "20+", label: "20+ years" },
];

// Get all specialties as flat array for simple select
export const getAllSpecialtiesFlat = (): string[] => {
  const result: string[] = [];
  Object.entries(specialtyCategories).forEach(([main, subs]) => {
    subs.forEach(sub => result.push(`${main} - ${sub}`));
  });
  return result;
};

// Get main specialties only (for simple dropdown)
export const getMainSpecialties = (): string[] => {
  return Object.keys(specialtyCategories);
};

// Phone number validation - basic international format check
export const validatePhoneNumber = (phone: string): { isValid: boolean; message: string } => {
  if (!phone) return { isValid: false, message: "Phone number is required" };
  
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if it starts with + and has 7-15 digits after
  const internationalPattern = /^\+[1-9]\d{6,14}$/;
  // Or just digits (7-15 digits for local numbers)
  const localPattern = /^[0-9]{7,15}$/;
  
  if (internationalPattern.test(cleaned) || localPattern.test(cleaned)) {
    return { isValid: true, message: "Valid phone number" };
  }
  
  return { isValid: false, message: "Please enter a valid phone number (e.g., +1234567890)" };
};
