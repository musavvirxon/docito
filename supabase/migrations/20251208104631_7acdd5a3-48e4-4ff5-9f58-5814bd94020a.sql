-- Create bones table with anatomical data
CREATE TABLE public.bones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  english_name TEXT NOT NULL,
  latin_name TEXT NOT NULL,
  bone_category TEXT NOT NULL CHECK (bone_category IN ('Skull', 'Spine', 'Thorax', 'Upper Limb', 'Lower Limb', 'Pelvis')),
  parent_bone_id UUID REFERENCES public.bones(id),
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  position_z FLOAT DEFAULT 0,
  description TEXT,
  clinical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bones ENABLE ROW LEVEL SECURITY;

-- Bones are readable by all authenticated users (reference data)
CREATE POLICY "Bones are readable by authenticated users"
ON public.bones
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify bones
CREATE POLICY "Admins can manage bones"
ON public.bones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create patient bone annotations table (for marking conditions on specific bones)
CREATE TABLE public.patient_bone_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  bone_id UUID NOT NULL REFERENCES public.bones(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('fracture', 'arthritis', 'inflammation', 'surgery', 'implant', 'other')),
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT,
  diagnosis_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_bone_annotations ENABLE ROW LEVEL SECURITY;

-- Doctors can view annotations for their patients
CREATE POLICY "Doctors can view their patient annotations"
ON public.patient_bone_annotations
FOR SELECT
USING (
  doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Doctors can create annotations
CREATE POLICY "Doctors can create annotations"
ON public.patient_bone_annotations
FOR INSERT
WITH CHECK (
  doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Doctors can update their own annotations
CREATE POLICY "Doctors can update their annotations"
ON public.patient_bone_annotations
FOR UPDATE
USING (
  doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Doctors can delete their own annotations
CREATE POLICY "Doctors can delete their annotations"
ON public.patient_bone_annotations
FOR DELETE
USING (
  doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_bones_updated_at
  BEFORE UPDATE ON public.bones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_bone_annotations_updated_at
  BEFORE UPDATE ON public.patient_bone_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert anatomical bone data
INSERT INTO public.bones (english_name, latin_name, bone_category, position_x, position_y, position_z, description) VALUES
-- Skull
('Frontal Bone', 'Os frontale', 'Skull', 0, 4.5, 0.3, 'Forms the forehead and upper eye sockets'),
('Parietal Bone (Left)', 'Os parietale sinistrum', 'Skull', -0.3, 4.7, 0, 'Forms the sides and roof of the skull'),
('Parietal Bone (Right)', 'Os parietale dextrum', 'Skull', 0.3, 4.7, 0, 'Forms the sides and roof of the skull'),
('Temporal Bone (Left)', 'Os temporale sinistrum', 'Skull', -0.5, 4.3, 0, 'Houses the ear structures'),
('Temporal Bone (Right)', 'Os temporale dextrum', 'Skull', 0.5, 4.3, 0, 'Houses the ear structures'),
('Occipital Bone', 'Os occipitale', 'Skull', 0, 4.4, -0.3, 'Forms the back and base of the skull'),
('Sphenoid Bone', 'Os sphenoidale', 'Skull', 0, 4.2, 0.1, 'Butterfly-shaped bone at skull base'),
('Ethmoid Bone', 'Os ethmoidale', 'Skull', 0, 4.1, 0.2, 'Between eye sockets'),
('Mandible', 'Mandibula', 'Skull', 0, 3.8, 0.2, 'Lower jaw bone'),
('Maxilla', 'Maxilla', 'Skull', 0, 4.0, 0.3, 'Upper jaw bone'),
('Zygomatic Bone (Left)', 'Os zygomaticum sinistrum', 'Skull', -0.4, 4.1, 0.3, 'Cheekbone'),
('Zygomatic Bone (Right)', 'Os zygomaticum dextrum', 'Skull', 0.4, 4.1, 0.3, 'Cheekbone'),
('Nasal Bone (Left)', 'Os nasale sinistrum', 'Skull', -0.05, 4.1, 0.4, 'Bridge of nose'),
('Nasal Bone (Right)', 'Os nasale dextrum', 'Skull', 0.05, 4.1, 0.4, 'Bridge of nose'),

-- Spine
('Cervical Vertebra C1 (Atlas)', 'Atlas', 'Spine', 0, 3.5, 0, 'First cervical vertebra'),
('Cervical Vertebra C2 (Axis)', 'Axis', 'Spine', 0, 3.4, 0, 'Second cervical vertebra'),
('Cervical Vertebra C3', 'Vertebra cervicalis III', 'Spine', 0, 3.3, 0, 'Third cervical vertebra'),
('Cervical Vertebra C4', 'Vertebra cervicalis IV', 'Spine', 0, 3.2, 0, 'Fourth cervical vertebra'),
('Cervical Vertebra C5', 'Vertebra cervicalis V', 'Spine', 0, 3.1, 0, 'Fifth cervical vertebra'),
('Cervical Vertebra C6', 'Vertebra cervicalis VI', 'Spine', 0, 3.0, 0, 'Sixth cervical vertebra'),
('Cervical Vertebra C7', 'Vertebra cervicalis VII', 'Spine', 0, 2.9, 0, 'Seventh cervical vertebra'),
('Thoracic Vertebra T1', 'Vertebra thoracica I', 'Spine', 0, 2.8, 0, 'First thoracic vertebra'),
('Thoracic Vertebra T2', 'Vertebra thoracica II', 'Spine', 0, 2.7, 0, 'Second thoracic vertebra'),
('Thoracic Vertebra T3', 'Vertebra thoracica III', 'Spine', 0, 2.6, 0, 'Third thoracic vertebra'),
('Thoracic Vertebra T4', 'Vertebra thoracica IV', 'Spine', 0, 2.5, 0, 'Fourth thoracic vertebra'),
('Thoracic Vertebra T5', 'Vertebra thoracica V', 'Spine', 0, 2.4, 0, 'Fifth thoracic vertebra'),
('Thoracic Vertebra T6', 'Vertebra thoracica VI', 'Spine', 0, 2.3, 0, 'Sixth thoracic vertebra'),
('Thoracic Vertebra T7', 'Vertebra thoracica VII', 'Spine', 0, 2.2, 0, 'Seventh thoracic vertebra'),
('Thoracic Vertebra T8', 'Vertebra thoracica VIII', 'Spine', 0, 2.1, 0, 'Eighth thoracic vertebra'),
('Thoracic Vertebra T9', 'Vertebra thoracica IX', 'Spine', 0, 2.0, 0, 'Ninth thoracic vertebra'),
('Thoracic Vertebra T10', 'Vertebra thoracica X', 'Spine', 0, 1.9, 0, 'Tenth thoracic vertebra'),
('Thoracic Vertebra T11', 'Vertebra thoracica XI', 'Spine', 0, 1.8, 0, 'Eleventh thoracic vertebra'),
('Thoracic Vertebra T12', 'Vertebra thoracica XII', 'Spine', 0, 1.7, 0, 'Twelfth thoracic vertebra'),
('Lumbar Vertebra L1', 'Vertebra lumbalis I', 'Spine', 0, 1.6, 0, 'First lumbar vertebra'),
('Lumbar Vertebra L2', 'Vertebra lumbalis II', 'Spine', 0, 1.5, 0, 'Second lumbar vertebra'),
('Lumbar Vertebra L3', 'Vertebra lumbalis III', 'Spine', 0, 1.4, 0, 'Third lumbar vertebra'),
('Lumbar Vertebra L4', 'Vertebra lumbalis IV', 'Spine', 0, 1.3, 0, 'Fourth lumbar vertebra'),
('Lumbar Vertebra L5', 'Vertebra lumbalis V', 'Spine', 0, 1.2, 0, 'Fifth lumbar vertebra'),
('Sacrum', 'Os sacrum', 'Spine', 0, 0.9, 0, 'Fused vertebrae at base of spine'),
('Coccyx', 'Os coccygis', 'Spine', 0, 0.6, 0, 'Tailbone'),

-- Thorax
('Sternum', 'Sternum', 'Thorax', 0, 2.4, 0.4, 'Breastbone'),
('Rib 1 (Left)', 'Costa I sinistra', 'Thorax', -0.3, 2.75, 0.2, 'First rib'),
('Rib 1 (Right)', 'Costa I dextra', 'Thorax', 0.3, 2.75, 0.2, 'First rib'),
('Rib 2 (Left)', 'Costa II sinistra', 'Thorax', -0.4, 2.65, 0.25, 'Second rib'),
('Rib 2 (Right)', 'Costa II dextra', 'Thorax', 0.4, 2.65, 0.25, 'Second rib'),
('Rib 3 (Left)', 'Costa III sinistra', 'Thorax', -0.45, 2.55, 0.28, 'Third rib'),
('Rib 3 (Right)', 'Costa III dextra', 'Thorax', 0.45, 2.55, 0.28, 'Third rib'),
('Rib 4 (Left)', 'Costa IV sinistra', 'Thorax', -0.5, 2.45, 0.3, 'Fourth rib'),
('Rib 4 (Right)', 'Costa IV dextra', 'Thorax', 0.5, 2.45, 0.3, 'Fourth rib'),
('Rib 5 (Left)', 'Costa V sinistra', 'Thorax', -0.52, 2.35, 0.32, 'Fifth rib'),
('Rib 5 (Right)', 'Costa V dextra', 'Thorax', 0.52, 2.35, 0.32, 'Fifth rib'),
('Rib 6 (Left)', 'Costa VI sinistra', 'Thorax', -0.54, 2.25, 0.33, 'Sixth rib'),
('Rib 6 (Right)', 'Costa VI dextra', 'Thorax', 0.54, 2.25, 0.33, 'Sixth rib'),
('Rib 7 (Left)', 'Costa VII sinistra', 'Thorax', -0.55, 2.15, 0.34, 'Seventh rib'),
('Rib 7 (Right)', 'Costa VII dextra', 'Thorax', 0.55, 2.15, 0.34, 'Seventh rib'),
('Rib 8 (Left)', 'Costa VIII sinistra', 'Thorax', -0.54, 2.05, 0.33, 'Eighth rib'),
('Rib 8 (Right)', 'Costa VIII dextra', 'Thorax', 0.54, 2.05, 0.33, 'Eighth rib'),
('Rib 9 (Left)', 'Costa IX sinistra', 'Thorax', -0.52, 1.95, 0.32, 'Ninth rib'),
('Rib 9 (Right)', 'Costa IX dextra', 'Thorax', 0.52, 1.95, 0.32, 'Ninth rib'),
('Rib 10 (Left)', 'Costa X sinistra', 'Thorax', -0.5, 1.85, 0.3, 'Tenth rib'),
('Rib 10 (Right)', 'Costa X dextra', 'Thorax', 0.5, 1.85, 0.3, 'Tenth rib'),
('Rib 11 (Left)', 'Costa XI sinistra', 'Thorax', -0.45, 1.75, 0.25, 'Eleventh rib (floating)'),
('Rib 11 (Right)', 'Costa XI dextra', 'Thorax', 0.45, 1.75, 0.25, 'Eleventh rib (floating)'),
('Rib 12 (Left)', 'Costa XII sinistra', 'Thorax', -0.4, 1.68, 0.2, 'Twelfth rib (floating)'),
('Rib 12 (Right)', 'Costa XII dextra', 'Thorax', 0.4, 1.68, 0.2, 'Twelfth rib (floating)'),

-- Pelvis
('Hip Bone (Left)', 'Os coxae sinistrum', 'Pelvis', -0.4, 0.8, 0.1, 'Left hip bone (ilium, ischium, pubis)'),
('Hip Bone (Right)', 'Os coxae dextrum', 'Pelvis', 0.4, 0.8, 0.1, 'Right hip bone (ilium, ischium, pubis)'),

-- Upper Limb
('Clavicle (Left)', 'Clavicula sinistra', 'Upper Limb', -0.4, 2.85, 0.35, 'Left collarbone'),
('Clavicle (Right)', 'Clavicula dextra', 'Upper Limb', 0.4, 2.85, 0.35, 'Right collarbone'),
('Scapula (Left)', 'Scapula sinistra', 'Upper Limb', -0.5, 2.6, -0.2, 'Left shoulder blade'),
('Scapula (Right)', 'Scapula dextra', 'Upper Limb', 0.5, 2.6, -0.2, 'Right shoulder blade'),
('Humerus (Left)', 'Humerus sinister', 'Upper Limb', -0.7, 2.2, 0, 'Left upper arm bone'),
('Humerus (Right)', 'Humerus dexter', 'Upper Limb', 0.7, 2.2, 0, 'Right upper arm bone'),
('Radius (Left)', 'Radius sinister', 'Upper Limb', -0.75, 1.6, 0.1, 'Left forearm bone (thumb side)'),
('Radius (Right)', 'Radius dexter', 'Upper Limb', 0.75, 1.6, 0.1, 'Right forearm bone (thumb side)'),
('Ulna (Left)', 'Ulna sinistra', 'Upper Limb', -0.8, 1.6, 0, 'Left forearm bone (pinky side)'),
('Ulna (Right)', 'Ulna dextra', 'Upper Limb', 0.8, 1.6, 0, 'Right forearm bone (pinky side)'),
('Carpal Bones (Left)', 'Ossa carpi sinistra', 'Upper Limb', -0.85, 1.1, 0.05, 'Left wrist bones (8 bones)'),
('Carpal Bones (Right)', 'Ossa carpi dextra', 'Upper Limb', 0.85, 1.1, 0.05, 'Right wrist bones (8 bones)'),
('Metacarpals (Left)', 'Ossa metacarpi sinistra', 'Upper Limb', -0.9, 0.95, 0.08, 'Left hand bones (5 bones)'),
('Metacarpals (Right)', 'Ossa metacarpi dextra', 'Upper Limb', 0.9, 0.95, 0.08, 'Right hand bones (5 bones)'),
('Phalanges of Hand (Left)', 'Phalanges manus sinistra', 'Upper Limb', -0.95, 0.75, 0.1, 'Left finger bones (14 bones)'),
('Phalanges of Hand (Right)', 'Phalanges manus dextra', 'Upper Limb', 0.95, 0.75, 0.1, 'Right finger bones (14 bones)'),

-- Lower Limb
('Femur (Left)', 'Femur sinister', 'Lower Limb', -0.35, 0.2, 0.05, 'Left thigh bone'),
('Femur (Right)', 'Femur dexter', 'Lower Limb', 0.35, 0.2, 0.05, 'Right thigh bone'),
('Patella (Left)', 'Patella sinistra', 'Lower Limb', -0.35, -0.4, 0.15, 'Left kneecap'),
('Patella (Right)', 'Patella dextra', 'Lower Limb', 0.35, -0.4, 0.15, 'Right kneecap'),
('Tibia (Left)', 'Tibia sinistra', 'Lower Limb', -0.32, -1.0, 0.08, 'Left shinbone'),
('Tibia (Right)', 'Tibia dextra', 'Lower Limb', 0.32, -1.0, 0.08, 'Right shinbone'),
('Fibula (Left)', 'Fibula sinistra', 'Lower Limb', -0.4, -1.0, 0.05, 'Left calf bone'),
('Fibula (Right)', 'Fibula dextra', 'Lower Limb', 0.4, -1.0, 0.05, 'Right calf bone'),
('Tarsal Bones (Left)', 'Ossa tarsi sinistra', 'Lower Limb', -0.35, -1.6, 0.1, 'Left ankle bones (7 bones)'),
('Tarsal Bones (Right)', 'Ossa tarsi dextra', 'Lower Limb', 0.35, -1.6, 0.1, 'Right ankle bones (7 bones)'),
('Metatarsals (Left)', 'Ossa metatarsi sinistra', 'Lower Limb', -0.35, -1.75, 0.15, 'Left foot bones (5 bones)'),
('Metatarsals (Right)', 'Ossa metatarsi dextra', 'Lower Limb', 0.35, -1.75, 0.15, 'Right foot bones (5 bones)'),
('Phalanges of Foot (Left)', 'Phalanges pedis sinistra', 'Lower Limb', -0.35, -1.9, 0.18, 'Left toe bones (14 bones)'),
('Phalanges of Foot (Right)', 'Phalanges pedis dextra', 'Lower Limb', 0.35, -1.9, 0.18, 'Right toe bones (14 bones)');