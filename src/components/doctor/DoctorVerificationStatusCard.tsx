import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { verificationStatus, loading } = useDoctorVerificationStatus();

  const goToVerification = () => navigate('/doctor/verification');

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
            {t('doctor.verificationStatusCard.notStartedTitle', 'Verification Not Started')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-yellow-600 dark:text-yellow-400">
            {t(
              'doctor.verificationStatusCard.notStartedDescription',
              "You haven't submitted your verification application yet. Complete your profile and submit for verification to start accepting patients.",
            )}
          </p>
          <Button onClick={goToVerification} className="w-full">
            {t('doctor.verificationStatusCard.completeButton', 'Complete Verification')}
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
          title: t('doctor.verificationStatusCard.statusPendingTitle', 'Verification Pending'),
          description: t('doctor.verificationStatusCard.statusPendingDescription', 'Your application is under review. We will notify you once it has been reviewed.'),
        };
      case 'resubmitted':
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          bgColor: 'bg-purple-50 dark:bg-purple-950/20',
          borderColor: 'border-purple-200',
          title: t('doctor.verificationStatusCard.statusResubmittedTitle', 'Resubmitted for Review'),
          description: t('doctor.verificationStatusCard.statusResubmittedDescription', 'Your updated application is being reviewed. We will get back to you shortly.'),
        };
      case 'approved':
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          color: 'bg-green-100 text-green-700 border-green-200',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          borderColor: 'border-green-200',
          title: t('doctor.verificationStatusCard.statusApprovedTitle', 'Verification Approved'),
          description: t('doctor.verificationStatusCard.statusApprovedDescription', 'Congratulations! Your profile has been verified. You can now accept patients.'),
        };
      case 'declined':
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: 'bg-red-100 text-red-700 border-red-200',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200',
          title: t('doctor.verificationStatusCard.statusDeclinedTitle', 'Verification Declined'),
          description: t('doctor.verificationStatusCard.statusDeclinedDescription', 'Your application was declined. Please review the feedback and resubmit.'),
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          bgColor: 'bg-gray-50 dark:bg-gray-950/20',
          borderColor: 'border-gray-200',
          title: t('doctor.verificationStatusCard.statusUnknownTitle', 'Unknown Status'),
          description: t('doctor.verificationStatusCard.statusUnknownDescription', 'Status not recognized.'),
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
              <strong>{t('doctor.verificationStatusCard.declineReasonLabel', 'Reason for decline:')}</strong> {verificationStatus.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 border-t pt-4">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('doctor.verificationStatusCard.submittedInformation', 'Submitted Information')}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {(additionalInfo.first_name || additionalInfo.last_name) && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('doctor.verificationStatusCard.fields.name', 'Name')}</p>
                  <p className="text-muted-foreground">
                    {additionalInfo.first_name} {additionalInfo.last_name}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('doctor.verificationStatusCard.fields.specialty', 'Specialty')}</p>
                <p className="text-muted-foreground">{verificationStatus.specialty}</p>
              </div>
            </div>

            {verificationStatus.years_of_experience && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('doctor.verificationStatusCard.fields.experience', 'Experience')}</p>
                  <p className="text-muted-foreground">{verificationStatus.years_of_experience}</p>
                </div>
              </div>
            )}

            {verificationStatus.license_number && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('doctor.verificationStatusCard.fields.license', 'License Number')}</p>
                  <p className="text-muted-foreground">{verificationStatus.license_number}</p>
                </div>
              </div>
            )}

            {(additionalInfo.country || additionalInfo.region) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('doctor.verificationStatusCard.fields.location', 'Location')}</p>
                  <p className="text-muted-foreground">
                    {additionalInfo.region && `${additionalInfo.region}, `}
                    {additionalInfo.country}
                  </p>
                </div>
              </div>
            )}

            {verificationStatus.verification_data?.languages && verificationStatus.verification_data.languages.length > 0 && (
              <div className="flex items-start gap-2">
                <Languages className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('doctor.verificationStatusCard.fields.languages', 'Languages Spoken')}</p>
                  <p className="text-muted-foreground text-xs">
                    {verificationStatus.verification_data.languages.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {verificationStatus.documents && verificationStatus.documents.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-medium text-sm mb-2">{t('doctor.verificationStatusCard.uploadedDocuments', 'Uploaded Documents')}</p>
              <div className="space-y-1">
                {verificationStatus.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {doc.document_type === 'medical_license'
                      ? t('doctor.verificationStatusCard.docTypes.medicalLicense', 'Medical License')
                      : t('doctor.verificationStatusCard.docTypes.professionalId', 'Professional ID')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {verificationStatus.status === 'declined' && (
            <Button onClick={goToVerification} className="flex-1">
              {t('doctor.verificationStatusCard.updateResubmit', 'Update & Resubmit')}
            </Button>
          )}
          <Button variant="outline" onClick={goToVerification} className="flex-1">
            {t('doctor.verificationStatusCard.openVerification', 'Open Verification')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/profile')} className="flex-1">
            {t('doctor.verificationStatusCard.viewFullProfile', 'View Full Profile')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('doctor.verificationStatusCard.submittedOn', 'Submitted on')} {new Date(verificationStatus.submitted_at).toLocaleDateString()}
          {verificationStatus.reviewed_at && ` • ${t('doctor.verificationStatusCard.reviewedOn', 'Reviewed on')} ${new Date(verificationStatus.reviewed_at).toLocaleDateString()}`}
        </p>
      </CardContent>
    </Card>
  );
};
