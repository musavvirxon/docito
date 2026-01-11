import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  Pill,
  User,
  MessageSquare,
  Video,
  CalendarPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import EnhancedTreatmentPlanDetailModal from "./EnhancedTreatmentPlanDetailModal";
import MedicationManagementModal from "./MedicationManagementModal";

interface TreatmentPlan {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  total_cost: number;
  estimated_completion_date?: string;
  created_at: string;
  updated_at: string;
  doctor?: {
    name: string;
    specialty: string;
  };
  patient?: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
  };
  procedures?: {
    total: number;
    completed: number;
  };
  medications?: {
    total: number;
    active: number;
  };
}

interface TreatmentPlanCardProps {
  treatmentPlan: TreatmentPlan;
  patientId?: string;
  onUpdate?: () => void;
  onMessage?: (patientId: string) => void;
  onSchedule?: (patientId: string) => void;
}

export const TreatmentPlanCard = ({ treatmentPlan, patientId, onUpdate, onMessage, onSchedule }: TreatmentPlanCardProps) => {
  const navigate = useNavigate();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [medicationModalOpen, setMedicationModalOpen] = useState(false);

  const handleMessage = () => {
    const targetPatientId = treatmentPlan.patient?.id || patientId;
    if (targetPatientId) {
      if (onMessage) {
        onMessage(targetPatientId);
      } else {
        navigate(`/messages?recipient=${targetPatientId}`);
      }
    }
  };

  const handleSchedule = () => {
    const targetPatientId = treatmentPlan.patient?.id || patientId;
    if (targetPatientId) {
      if (onSchedule) {
        onSchedule(targetPatientId);
      } else {
        navigate(`/doctor-dashboard?section=calendar&patient=${targetPatientId}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-4 h-4" />;
      case 'active':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProgressPercentage = () => {
    if (!treatmentPlan.procedures?.total) return 0;
    return Math.round((treatmentPlan.procedures.completed / treatmentPlan.procedures.total) * 100);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight">{treatmentPlan.title}</CardTitle>
              {/* Patient Info */}
              {treatmentPlan.patient && (
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <User className="w-3 h-3" />
                  <span>{treatmentPlan.patient.name}</span>
                </div>
              )}
              {treatmentPlan.doctor && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{treatmentPlan.doctor.name}</span>
                  <span>•</span>
                  <span>{treatmentPlan.doctor.specialty}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(treatmentPlan.status)} border text-xs`}>
                {getStatusIcon(treatmentPlan.status)}
                <span className="ml-1 capitalize">{treatmentPlan.status}</span>
              </Badge>
              <Badge className={`${getPriorityColor(treatmentPlan.priority)} border text-xs`}>
                <span className="capitalize">{treatmentPlan.priority}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {treatmentPlan.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {treatmentPlan.description}
            </p>
          )}

          {/* Progress Section */}
          {treatmentPlan.procedures && treatmentPlan.procedures.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {treatmentPlan.procedures.completed} of {treatmentPlan.procedures.total} procedures
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {treatmentPlan.total_cost > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">{formatCurrency(treatmentPlan.total_cost)}</span>
              </div>
            )}

            {treatmentPlan.estimated_completion_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-muted-foreground">Target:</span>
                <span className="font-medium">
                  {format(new Date(treatmentPlan.estimated_completion_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}

            {treatmentPlan.medications && treatmentPlan.medications.total > 0 && (
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" />
                <span className="text-muted-foreground">Medications:</span>
                <span className="font-medium">
                  {treatmentPlan.medications.active} active
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">
                {format(new Date(treatmentPlan.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDetailModalOpen(true)}
              className="flex-1 min-w-[100px]"
            >
              <Eye className="w-3 h-3 mr-2" />
              View Details
            </Button>

            {/* Message Patient Button */}
            {(treatmentPlan.patient?.id || patientId) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMessage}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Message
              </Button>
            )}

            {/* Schedule Appointment Button */}
            {(treatmentPlan.patient?.id || patientId) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSchedule}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CalendarPlus className="w-3 h-3 mr-1" />
                Schedule
              </Button>
            )}

            {/* Video Call Button */}
            {(treatmentPlan.patient?.id || patientId) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Video call functionality - placeholder for future implementation
                  navigate(`/video-call?patient=${treatmentPlan.patient?.id || patientId}`);
                }}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Video className="w-3 h-3 mr-1" />
                Video Call
              </Button>
            )}

            {treatmentPlan.medications && treatmentPlan.medications.total > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMedicationModalOpen(true)}
              >
                <Pill className="w-3 h-3 mr-2" />
                Medications
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <EnhancedTreatmentPlanDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        treatmentPlan={{
          id: treatmentPlan.id,
          title: treatmentPlan.title,
          notes: treatmentPlan.description,
          status: treatmentPlan.status,
          total_cost: treatmentPlan.total_cost,
          created_at: treatmentPlan.created_at,
          doctor_id: '',
          patient_id: patientId || ''
        }}
        onUpdate={onUpdate}
      />

      {treatmentPlan.medications && treatmentPlan.medications.total > 0 && (
        <MedicationManagementModal
          open={medicationModalOpen}
          onOpenChange={setMedicationModalOpen}
          treatmentPlanId={treatmentPlan.id}
          patientId={patientId || ''}
        />
      )}
    </>
  );
};