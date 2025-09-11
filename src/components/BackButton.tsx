import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface BackButtonProps {
  className?: string;
  defaultRoute?: string;
}

const BackButton = ({ className = "", defaultRoute = "/patient-dashboard" }: BackButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Check if there's browser history to go back to
    if (window.history.length > 1 && document.referrer) {
      navigate(-1);
    } else {
      // If no history or accessed directly, go to default route
      navigate(defaultRoute);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleBack}
      className={`mb-4 ${className}`}
    >
      <ChevronLeft className="w-4 h-4 mr-2" />
      Back
    </Button>
  );
};

export default BackButton;