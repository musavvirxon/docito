export type BoneCategory = 'Skull' | 'Spine' | 'Thorax' | 'Upper Limb' | 'Lower Limb' | 'Pelvis';

export interface Bone {
  id: string;
  english_name: string;
  latin_name: string;
  bone_category: BoneCategory;
  parent_bone_id: string | null;
  position_x: number;
  position_y: number;
  position_z: number;
  description: string | null;
  clinical_notes: string | null;
}

export type AnnotationType = 'fracture' | 'arthritis' | 'inflammation' | 'surgery' | 'implant' | 'other';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface BoneAnnotation {
  id: string;
  patient_id: string;
  bone_id: string;
  doctor_id: string;
  annotation_type: AnnotationType;
  severity: Severity | null;
  notes: string | null;
  diagnosis_date: string | null;
  created_at: string;
}

export interface SkeletonState {
  selectedBone: Bone | null;
  hoveredBone: Bone | null;
  activeCategory: BoneCategory | 'All';
  searchQuery: string;
  annotations: Map<string, BoneAnnotation[]>;
}

export const BONE_CATEGORIES: BoneCategory[] = [
  'Skull',
  'Spine', 
  'Thorax',
  'Upper Limb',
  'Lower Limb',
  'Pelvis'
];

export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  fracture: '#ef4444',
  arthritis: '#f97316',
  inflammation: '#eab308',
  surgery: '#22c55e',
  implant: '#3b82f6',
  other: '#8b5cf6'
};

export const CATEGORY_COLORS: Record<BoneCategory, string> = {
  'Skull': '#60a5fa',
  'Spine': '#34d399',
  'Thorax': '#a78bfa',
  'Upper Limb': '#f472b6',
  'Lower Limb': '#fbbf24',
  'Pelvis': '#fb923c'
};
