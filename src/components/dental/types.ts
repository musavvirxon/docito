// Dental Chart Types

export type ToothType = "permanent" | "primary";

export type ToothStatus = 
  | "healthy" 
  | "caries" 
  | "filled" 
  | "missing" 
  | "crown" 
  | "implant" 
  | "watch"
  | "extracted"
  | "root_canal"
  | "sealant";

export interface ToothData {
  toothNumber: number;
  toothType: ToothType;
  status: ToothStatus;
  diagnoses: string[];
  treatments: string[];
  procedures: ToothProcedure[];
  notes?: string;
}

export interface ToothProcedure {
  id: string;
  name: string;
  code?: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  date?: string;
  notes?: string;
}

// FDI Numbering System
export const PERMANENT_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11], // Q1
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],  // Q2
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],  // Q3
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41], // Q4
};

export const PRIMARY_TEETH = {
  upperRight: [55, 54, 53, 52, 51], // Upper Right
  upperLeft: [61, 62, 63, 64, 65],  // Upper Left
  lowerLeft: [71, 72, 73, 74, 75],  // Lower Left
  lowerRight: [85, 84, 83, 82, 81], // Lower Right
};

export const TOOTH_STATUS_CONFIG: Record<ToothStatus, { color: string; label: string; bgClass: string }> = {
  healthy: { color: "hsl(var(--muted))", label: "Healthy", bgClass: "bg-background border-border hover:border-primary" },
  caries: { color: "hsl(var(--destructive))", label: "Caries", bgClass: "bg-destructive/10 border-destructive hover:border-destructive/80" },
  filled: { color: "hsl(var(--primary))", label: "Filled", bgClass: "bg-primary/10 border-primary hover:border-primary/80" },
  missing: { color: "hsl(var(--muted-foreground))", label: "Missing", bgClass: "bg-muted border-muted-foreground opacity-40" },
  crown: { color: "hsl(45, 93%, 47%)", label: "Crown", bgClass: "bg-amber-100 border-amber-500 hover:border-amber-600" },
  implant: { color: "hsl(270, 50%, 60%)", label: "Implant", bgClass: "bg-purple-100 border-purple-500 hover:border-purple-600" },
  watch: { color: "hsl(38, 92%, 50%)", label: "Watch", bgClass: "bg-orange-100 border-orange-400 hover:border-orange-500" },
  extracted: { color: "hsl(var(--muted-foreground))", label: "Extracted", bgClass: "bg-muted/50 border-muted-foreground/50 line-through" },
  root_canal: { color: "hsl(200, 70%, 50%)", label: "Root Canal", bgClass: "bg-sky-100 border-sky-500 hover:border-sky-600" },
  sealant: { color: "hsl(160, 60%, 45%)", label: "Sealant", bgClass: "bg-emerald-100 border-emerald-500 hover:border-emerald-600" },
};

export const DENTAL_PROCEDURES = [
  { id: "filling", name: "Filling", category: "restorative" },
  { id: "extraction", name: "Extraction", category: "surgical" },
  { id: "crown", name: "Crown", category: "restorative" },
  { id: "root_canal", name: "Root Canal", category: "endodontic" },
  { id: "scaling", name: "Scaling & Polishing", category: "preventive" },
  { id: "sealant", name: "Sealant", category: "preventive" },
  { id: "pulpotomy", name: "Pulpotomy", category: "pediatric" },
  { id: "space_maintainer", name: "Space Maintainer", category: "pediatric" },
  { id: "fluoride", name: "Fluoride Varnish", category: "preventive" },
  { id: "bonding", name: "Bonding", category: "cosmetic" },
  { id: "veneer", name: "Veneer", category: "cosmetic" },
  { id: "implant", name: "Implant", category: "surgical" },
  { id: "bridge", name: "Bridge", category: "restorative" },
  { id: "denture", name: "Denture", category: "prosthetic" },
];
