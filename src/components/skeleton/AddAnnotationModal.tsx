import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bone, AnnotationType, Severity, ANNOTATION_COLORS } from './types';

interface AddAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bone: Bone | null;
  onSubmit: (data: {
    annotation_type: AnnotationType;
    severity?: Severity;
    notes?: string;
    diagnosis_date?: string;
  }) => void;
}

const ANNOTATION_TYPES: { value: AnnotationType; label: string }[] = [
  { value: 'fracture', label: 'Fracture' },
  { value: 'arthritis', label: 'Arthritis' },
  { value: 'inflammation', label: 'Inflammation' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'implant', label: 'Implant' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS: { value: Severity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

export function AddAnnotationModal({
  isOpen,
  onClose,
  bone,
  onSubmit,
}: AddAnnotationModalProps) {
  const [annotationType, setAnnotationType] = useState<AnnotationType>('fracture');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [notes, setNotes] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      annotation_type: annotationType,
      severity: severity || undefined,
      notes: notes || undefined,
      diagnosis_date: diagnosisDate || undefined,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setAnnotationType('fracture');
    setSeverity('');
    setNotes('');
    setDiagnosisDate('');
  };

  if (!bone) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Annotation</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 rounded-lg bg-muted/50">
          <p className="font-medium text-foreground">{bone.english_name}</p>
          <p className="text-sm italic text-muted-foreground">{bone.latin_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Annotation Type */}
          <div className="space-y-2">
            <Label>Annotation Type</Label>
            <Select
              value={annotationType}
              onValueChange={(value) => setAnnotationType(value as AnnotationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANNOTATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ANNOTATION_COLORS[type.value] }}
                      />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>Severity (Optional)</Label>
            <Select
              value={severity}
              onValueChange={(value) => setSeverity(value as Severity)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Diagnosis Date */}
          <div className="space-y-2">
            <Label>Diagnosis Date (Optional)</Label>
            <Input
              type="date"
              value={diagnosisDate}
              onChange={(e) => setDiagnosisDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add clinical notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Annotation</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
