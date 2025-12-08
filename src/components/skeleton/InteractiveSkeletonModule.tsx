import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bone as BoneIcon, Info, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonViewer } from './SkeletonViewer';
import { SkeletonControls } from './SkeletonControls';
import { BoneInfoPanel } from './BoneInfoPanel';
import { AddAnnotationModal } from './AddAnnotationModal';
import { useSkeleton, useIsOrthopedic } from '@/hooks/useSkeleton';
import { Bone, AnnotationType, Severity } from './types';
import { Loader2, Lock } from 'lucide-react';

interface InteractiveSkeletonModuleProps {
  patientId?: string;
  doctorId?: string;
  className?: string;
}

export function InteractiveSkeletonModule({
  patientId,
  doctorId,
  className = '',
}: InteractiveSkeletonModuleProps) {
  const { isOrthopedic, isLoading: checkingSpecialty } = useIsOrthopedic();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);

  const {
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
    annotationsByBone,
    searchHighlightedBone,
    createAnnotation,
    deleteAnnotation,
    isLoading,
  } = useSkeleton(patientId);

  // Loading state
  if (checkingSpecialty || isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Access control - show locked state for non-orthopedic users
  if (!isOrthopedic) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Orthopedic Module</h3>
          <p className="text-muted-foreground max-w-sm">
            This interactive skeleton module is available for orthopedic specialists only.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedBoneAnnotations = selectedBone
    ? annotationsByBone.get(selectedBone.id) || []
    : [];

  const handleAddAnnotation = (data: {
    annotation_type: AnnotationType;
    severity?: Severity;
    notes?: string;
    diagnosis_date?: string;
  }) => {
    if (!selectedBone || !patientId || !doctorId) return;

    createAnnotation.mutate({
      patient_id: patientId,
      bone_id: selectedBone.id,
      doctor_id: doctorId,
      ...data,
    });
  };

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-background'
    : className;

  return (
    <motion.div
      layout
      className={containerClasses}
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BoneIcon className="h-5 w-5 text-primary" />
              Interactive Skeleton
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col lg:flex-row">
          {/* Controls Sidebar */}
          <div className="w-full lg:w-72 p-4 border-b lg:border-b-0 lg:border-r border-border shrink-0">
            <SkeletonControls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              boneSuggestions={bones.map((b) => ({
                english_name: b.english_name,
                latin_name: b.latin_name,
              }))}
            />

            {/* Stats */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{bones.length}</p>
                  <p className="text-xs text-muted-foreground">Total Bones</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{filteredBones.length}</p>
                  <p className="text-xs text-muted-foreground">Filtered</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Controls:</p>
                  <ul className="space-y-0.5">
                    <li>• Click bone to select</li>
                    <li>• Drag to rotate view</li>
                    <li>• Scroll to zoom</li>
                    <li>• Right-click drag to pan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Viewer */}
          <div className="flex-1 relative min-h-[400px] lg:min-h-0">
            <SkeletonViewer
              bones={filteredBones}
              selectedBone={selectedBone}
              hoveredBone={hoveredBone}
              activeCategory={activeCategory}
              annotationsByBone={annotationsByBone}
              searchHighlightedBone={searchHighlightedBone}
              onSelectBone={setSelectedBone}
              onHoverBone={setHoveredBone}
            />

            {/* Info Panel */}
            <BoneInfoPanel
              bone={selectedBone}
              annotations={selectedBoneAnnotations}
              onClose={() => setSelectedBone(null)}
              onAddAnnotation={
                patientId && doctorId ? () => setShowAnnotationModal(true) : undefined
              }
              onDeleteAnnotation={
                patientId && doctorId
                  ? (id) => deleteAnnotation.mutate(id)
                  : undefined
              }
              canEdit={!!patientId && !!doctorId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Annotation Modal */}
      <AddAnnotationModal
        isOpen={showAnnotationModal}
        onClose={() => setShowAnnotationModal(false)}
        bone={selectedBone}
        onSubmit={handleAddAnnotation}
      />
    </motion.div>
  );
}
