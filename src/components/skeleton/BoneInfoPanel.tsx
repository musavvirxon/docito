import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bone, BoneAnnotation, ANNOTATION_COLORS, CATEGORY_COLORS } from './types';

interface BoneInfoPanelProps {
  bone: Bone | null;
  annotations: BoneAnnotation[];
  onClose: () => void;
  onAddAnnotation?: () => void;
  onDeleteAnnotation?: (id: string) => void;
  canEdit?: boolean;
}

export function BoneInfoPanel({
  bone,
  annotations,
  onClose,
  onAddAnnotation,
  onDeleteAnnotation,
  canEdit = false,
}: BoneInfoPanelProps) {
  if (!bone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute top-4 right-4 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div 
          className="p-4 border-b border-border"
          style={{ 
            background: `linear-gradient(135deg, ${CATEGORY_COLORS[bone.bone_category]}20, transparent)` 
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground">{bone.english_name}</h3>
              <p className="text-sm italic text-muted-foreground">{bone.latin_name}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Badge 
            variant="secondary" 
            className="mt-2"
            style={{ 
              backgroundColor: `${CATEGORY_COLORS[bone.bone_category]}30`,
              color: CATEGORY_COLORS[bone.bone_category]
            }}
          >
            {bone.bone_category}
          </Badge>
        </div>

        {/* Description */}
        {bone.description && (
          <div className="p-4 border-b border-border">
            <h4 className="text-sm font-medium text-foreground mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">{bone.description}</p>
          </div>
        )}

        {/* Clinical Notes */}
        {bone.clinical_notes && (
          <div className="p-4 border-b border-border bg-muted/30">
            <h4 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Clinical Notes
            </h4>
            <p className="text-sm text-muted-foreground">{bone.clinical_notes}</p>
          </div>
        )}

        {/* Annotations */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">Patient Annotations</h4>
            {canEdit && onAddAnnotation && (
              <Button variant="outline" size="sm" onClick={onAddAnnotation}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>

          {annotations.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No annotations for this bone</p>
          ) : (
            <div className="space-y-2">
              {annotations.map((annotation) => (
                <motion.div
                  key={annotation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ANNOTATION_COLORS[annotation.annotation_type] }}
                        />
                        <span className="text-sm font-medium capitalize">
                          {annotation.annotation_type}
                        </span>
                        {annotation.severity && (
                          <Badge variant="outline" className="text-xs">
                            {annotation.severity}
                          </Badge>
                        )}
                      </div>
                      {annotation.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{annotation.notes}</p>
                      )}
                      {annotation.diagnosis_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Diagnosed: {new Date(annotation.diagnosis_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {canEdit && onDeleteAnnotation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => onDeleteAnnotation(annotation.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
