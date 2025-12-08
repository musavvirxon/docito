import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bone, BoneAnnotation, BoneCategory, AnnotationType, Severity } from '@/components/skeleton/types';
import { toast } from 'sonner';

export function useSkeleton(patientId?: string) {
  const queryClient = useQueryClient();
  const [selectedBone, setSelectedBone] = useState<Bone | null>(null);
  const [hoveredBone, setHoveredBone] = useState<Bone | null>(null);
  const [activeCategory, setActiveCategory] = useState<BoneCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all bones
  const { data: bones = [], isLoading: bonesLoading } = useQuery({
    queryKey: ['bones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bones')
        .select('*')
        .order('bone_category', { ascending: true });
      
      if (error) throw error;
      return data as Bone[];
    },
  });

  // Fetch patient annotations if patientId provided
  const { data: annotations = [], isLoading: annotationsLoading } = useQuery({
    queryKey: ['bone-annotations', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('patient_bone_annotations')
        .select('*')
        .eq('patient_id', patientId);
      
      if (error) throw error;
      return data as BoneAnnotation[];
    },
    enabled: !!patientId,
  });

  // Create annotation mutation
  const createAnnotation = useMutation({
    mutationFn: async (annotation: {
      patient_id: string;
      bone_id: string;
      doctor_id: string;
      annotation_type: AnnotationType;
      severity?: Severity;
      notes?: string;
      diagnosis_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('patient_bone_annotations')
        .insert(annotation)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bone-annotations', patientId] });
      toast.success('Annotation added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add annotation');
      console.error(error);
    },
  });

  // Delete annotation mutation
  const deleteAnnotation = useMutation({
    mutationFn: async (annotationId: string) => {
      const { error } = await supabase
        .from('patient_bone_annotations')
        .delete()
        .eq('id', annotationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bone-annotations', patientId] });
      toast.success('Annotation removed');
    },
    onError: (error) => {
      toast.error('Failed to remove annotation');
      console.error(error);
    },
  });

  // Filter bones by category and search
  const filteredBones = useMemo(() => {
    return bones.filter((bone) => {
      const matchesCategory = activeCategory === 'All' || bone.bone_category === activeCategory;
      const matchesSearch = searchQuery === '' || 
        bone.english_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bone.latin_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [bones, activeCategory, searchQuery]);

  // Group annotations by bone
  const annotationsByBone = useMemo(() => {
    const map = new Map<string, BoneAnnotation[]>();
    annotations.forEach((annotation) => {
      const existing = map.get(annotation.bone_id) || [];
      map.set(annotation.bone_id, [...existing, annotation]);
    });
    return map;
  }, [annotations]);

  // Search highlight
  const searchHighlightedBone = useMemo(() => {
    if (!searchQuery) return null;
    return bones.find(
      (bone) =>
        bone.english_name.toLowerCase() === searchQuery.toLowerCase() ||
        bone.latin_name.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [bones, searchQuery]);

  return {
    bones,
    filteredBones,
    selectedBone,
    setSelectedBone,
    hoveredBone,
    setHoveredBone,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    annotations,
    annotationsByBone,
    searchHighlightedBone,
    createAnnotation,
    deleteAnnotation,
    isLoading: bonesLoading || annotationsLoading,
  };
}

// Check if user has orthopedic specialty
export function useIsOrthopedic() {
  const { data: isOrthopedic = false, isLoading } = useQuery({
    queryKey: ['is-orthopedic'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: doctor } = await supabase
        .from('doctors')
        .select('specialty')
        .eq('user_id', user.id)
        .single();

      if (!doctor) return false;

      const orthopedicSpecialties = [
        'orthopedic',
        'orthopedics',
        'orthopedist',
        'orthopaedic',
        'orthopaedics',
        'orthopaedist',
        'bone',
        'musculoskeletal'
      ];

      return orthopedicSpecialties.some(
        (s) => doctor.specialty.toLowerCase().includes(s)
      );
    },
  });

  return { isOrthopedic, isLoading };
}
