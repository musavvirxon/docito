import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  FileText,
  User,
  Briefcase,
  MapPin,
  Languages,
  Calendar,
  DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDoctorVerificationStatus } from "@/hooks/useDoctorVerificationStatus";
import { Skeleton } from "@/components/ui/skeleton";

export const DoctorVerificationStatusCard = () => {
  const navigate = useNavigate();
  const { verificationStatus, loading } = useDoctorVerificationStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!verificationStatus) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
            <AlertCircle className="h-5 w-5" />
            Verification Not Started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-yellow-600 dark:text-yellow-400">
            You haven't submitted your verification application yet. Complete your profile and submit for verification to start accepting patients.
          </p>
          <Button onClick={() => navigate('/doctor/dashboard/verification')} className="w-full">
            Complete Verification Application
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200',
          title: 'Verification Pending',
          description: 'Your application is under review. We will notify you once it has been reviewed.',
        };
      case 'resubmitted':
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          bgColor: 'bg-purple-50 dark:bg-purple-950/20',
          borderColor: 'border-purple-200',
          title: 'Resubmitted for Review',
          description: 'Your updated application is being reviewed. We will get back to you shortly.',
        };
      case 'approved':
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          color: 'bg-green-100 text-green-700 border-green-200',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          borderColor: 'border-green-200',
          title: 'Verification Approved',
          description: 'Congratulations! Your profile has been verified. You can now accept patients.',
        };
      case 'declined':
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: 'bg-red-100 text-red-700 border-red-200',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200',
          title: 'Verification Declined',
          description: 'Your application was declined. Please review the feedback and resubmit.',
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          bgColor: 'bg-gray-50 dark:bg-gray-950/20',
          borderColor: 'border-gray-200',
          title: 'Unknown Status',
          description: 'Status not recognized.',
        };
    }
  };

  const statusConfig = getStatusConfig(verificationStatus.status);
  const additionalInfo = verificationStatus.verification_data?.additional_info || {};

  return (
    <Card className={`${statusConfig.borderColor} ${statusConfig.bgColor}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {statusConfig.icon}
          {statusConfig.title}
          <Badge className={statusConfig.color}>
            {verificationStatus.status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={statusConfig.borderColor}>
          <AlertDescription>{statusConfig.description}</AlertDescription>
        </Alert>

        {verificationStatus.status === 'declined' && verificationStatus.rejection_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Reason for decline:</strong> {verificationStatus.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Submitted Information */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Submitted Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {/* Personal Information */}
            {(additionalInfo.first_name || additionalInfo.last_name) && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Name</p>
                  <p className="text-muted-foreground">
                    {additionalInfo.first_name} {additionalInfo.last_name}
                  </p>
                </div>
              </div>
            )}

            {additionalInfo.gender && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Gender</p>
                  <p className="text-muted-foreground">{additionalInfo.gender}</p>
                </div>
              </div>
            )}

            {additionalInfo.email && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">{additionalInfo.email}</p>
                </div>
              </div>
            )}

            {additionalInfo.phone && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">{additionalInfo.phone}</p>
                </div>
              </div>
            )}

            {/* Professional Information */}
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">Specialty</p>
                <p className="text-muted-foreground">{verificationStatus.specialty}</p>
              </div>
            </div>

            {additionalInfo.all_specialties && additionalInfo.all_specialties.length > 0 && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">All Specialties</p>
                  <p className="text-muted-foreground text-xs">
                    {additionalInfo.all_specialties.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {additionalInfo.degrees && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Degrees & Certifications</p>
                  <p className="text-muted-foreground text-xs">{additionalInfo.degrees}</p>
                </div>
              </div>
            )}

            {verificationStatus.years_of_experience && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Experience</p>
                  <p className="text-muted-foreground">{verificationStatus.years_of_experience}</p>
                </div>
              </div>
            )}

            {verificationStatus.license_number && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">License Number</p>
                  <p className="text-muted-foreground">{verificationStatus.license_number}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {(additionalInfo.country || additionalInfo.region) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">
                    {additionalInfo.region && `${additionalInfo.region}, `}
                    {additionalInfo.country}
                  </p>
                </div>
              </div>
            )}

            {/* Languages */}
            {verificationStatus.verification_data?.languages && verificationStatus.verification_data.languages.length > 0 && (
              <div className="flex items-start gap-2">
                <Languages className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Languages Spoken</p>
                  <p className="text-muted-foreground text-xs">
                    {verificationStatus.verification_data.languages.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Consultation Fee */}
            {(additionalInfo.consultation_fee_from || additionalInfo.consultation_fee_to) && (
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Consultation Fee Range</p>
                  <p className="text-muted-foreground">
                    ${additionalInfo.consultation_fee_from || '0'} - ${additionalInfo.consultation_fee_to || '0'}
                  </p>
                </div>
              </div>
            )}

            {/* Appointment Types */}
            {additionalInfo.preferred_appointment_types && additionalInfo.preferred_appointment_types.length > 0 && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Preferred Appointment Types</p>
                  <p className="text-muted-foreground text-xs">
                    {additionalInfo.preferred_appointment_types.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Clinic Information */}
            {additionalInfo.linked_clinic_id && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Linked Clinic</p>
                  <p className="text-muted-foreground">Associated with clinic</p>
                </div>
              </div>
            )}

            {additionalInfo.manual_clinic?.name && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Manual Clinic Entry</p>
                  <p className="text-muted-foreground">{additionalInfo.manual_clinic.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          {verificationStatus.documents && verificationStatus.documents.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-medium text-sm mb-2">Uploaded Documents</p>
              <div className="space-y-1">
                {verificationStatus.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {doc.document_type === 'medical_license' ? 'Medical License' : 'Professional ID'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio Section */}
          <div className="border-t pt-3">
            <p className="font-medium text-sm mb-2">Professional Bio</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {verificationStatus.specialty ? `Bio not available in current data structure` : 'No bio provided'}
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Note: Your full bio is stored in your profile and will be visible once verified.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
        {verificationStatus.status === 'declined' && (
            <Button onClick={() => navigate('/doctor/dashboard/verification')} className="flex-1">
              Resubmit Application
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => navigate('/doctor-dashboard?section=profile')}
            className="flex-1"
          >
            View Full Profile
          </Button>
        </div>

        {/* Submission Date */}
        <p className="text-xs text-muted-foreground text-center">
          Submitted on {new Date(verificationStatus.submitted_at).toLocaleDateString()}
          {verificationStatus.reviewed_at && ` • Reviewed on ${new Date(verificationStatus.reviewed_at).toLocaleDateString()}`}
        </p>
      </CardContent>
    </Card>
  );
};
