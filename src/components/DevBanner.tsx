import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { DISABLE_VALIDATION } from "@/config/quickDevConfig";

interface DevBannerProps {
  onFillDummy?: () => void;
  showFillButton?: boolean;
}

export const DevBanner = ({ onFillDummy, showFillButton = false }: DevBannerProps) => {
  const { t } = useTranslation("common");
  if (!DISABLE_VALIDATION) return null;

  return (
    <Alert className="mb-6 bg-yellow-50 border-yellow-200">
      <AlertDescription className="flex items-center justify-between">
        <span className="text-yellow-800">
          {t("devBanner.label")}
        </span>
        {showFillButton && onFillDummy && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFillDummy}
            className="ml-4 bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
          >
            {t("devBanner.fillDummy")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
