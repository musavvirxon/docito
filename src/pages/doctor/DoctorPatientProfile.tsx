import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PatientProfileView } from '@/components/appointments/PatientProfileView';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from "react-i18next";

export default function DoctorPatientProfile() {
  const { t } = useTranslation('dashboard');
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();

  const patientType = useMemo(() => {
    const t = searchParams.get('type');
    return t === 'direct' ? 'direct' : 'registered';
  }, [searchParams]);

  if (!loading && !profile) {
    return <Navigate to="/auth" replace />;
  }

  if (!patientId) {
    return (
      <div className="p-6">
        <Card className="p-6">Missing patient id.</Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <PatientProfileView
        patientId={patientId}
        patientType={patientType}
        onBack={() => navigate(-1)}
      />
    </div>
  );
}
