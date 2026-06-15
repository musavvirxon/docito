import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

interface BackButtonProps {
  className?: string;
  fallbackPath?: string;
}

const BackButton = ({
  className = "",
  fallbackPath
}: BackButtonProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { profile } = useAuth();

  const handleBack = () => {
    const getDashboardPath = () => {
      if (profile?.role === 'doctor') return '/doctor-dashboard';
      if (profile?.role === 'admin') return '/practice-dashboard';
      return '/patient-dashboard';
    };

    const targetPath = fallbackPath || getDashboardPath();
    navigate(targetPath);
  };
  return (
    <Button
      variant="ghost"
      onClick={handleBack}
      className={`flex items-center gap-2 ${className}`}
    >
      <ChevronLeft className="w-4 h-4" />
      {t("actions.back")}
    </Button>
  );
};
export default BackButton;
