import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DISABLE_VALIDATION } from "@/config/quickDevConfig";

interface DevBannerProps {
  onFillDummy?: () => void;
  showFillButton?: boolean;
}

export const DevBanner = ({ onFillDummy, showFillButton = false }: DevBannerProps) => {
  if (!DISABLE_VALIDATION) return null;

  return (
    <Alert className="mb-6 bg-yellow-50 border-yellow-200">
      <AlertDescription className="flex items-center justify-between">
        <span className="text-yellow-800">
          🚧 Development Mode: All fields are optional for quick testing
        </span>
        {showFillButton && onFillDummy && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={onFillDummy}
            className="ml-4 bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
          >
            🎭 Fill Dummy Data
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};