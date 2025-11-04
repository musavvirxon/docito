import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface MobileFilterDrawerProps {
  filters: {
    doctorsOnly: boolean;
    practicesOnly: boolean;
    acceptsNewPatients: boolean;
    availableToday: boolean;
    acceptsInsurance: boolean;
    videoConsultation: boolean;
  };
  onFilterChange: (key: string, value: boolean) => void;
  onReset: () => void;
}

const MobileFilterDrawer = ({ filters, onFilterChange, onReset }: MobileFilterDrawerProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("dashboard");

  const handleApply = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          {t("patient.filters.title")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>{t("patient.filters.title")}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Provider Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("patient.filters.providerType")}</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-doctors-only" className="text-sm">
                  {t("patient.filters.doctorsOnly")}
                </Label>
                <Switch
                  id="mobile-doctors-only"
                  checked={filters.doctorsOnly}
                  onCheckedChange={(checked) => onFilterChange('doctorsOnly', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-practices-only" className="text-sm">
                  {t("patient.filters.practicesOnly")}
                </Label>
                <Switch
                  id="mobile-practices-only"
                  checked={filters.practicesOnly}
                  onCheckedChange={(checked) => onFilterChange('practicesOnly', checked)}
                />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("patient.filters.availability")}</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-new-patients" className="text-sm">
                  {t("patient.filters.acceptingNewPatients")}
                </Label>
                <Switch
                  id="mobile-new-patients"
                  checked={filters.acceptsNewPatients}
                  onCheckedChange={(checked) => onFilterChange('acceptsNewPatients', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-available-today" className="text-sm">
                  {t("patient.filters.availableToday")}
                </Label>
                <Switch
                  id="mobile-available-today"
                  checked={filters.availableToday}
                  onCheckedChange={(checked) => onFilterChange('availableToday', checked)}
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("patient.filters.services")}</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-accepts-insurance" className="text-sm">
                  {t("patient.filters.acceptsInsurance")}
                </Label>
                <Switch
                  id="mobile-accepts-insurance"
                  checked={filters.acceptsInsurance}
                  onCheckedChange={(checked) => onFilterChange('acceptsInsurance', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-video-consultation" className="text-sm">
                  {t("patient.filters.videoConsultation")}
                </Label>
                <Switch
                  id="mobile-video-consultation"
                  checked={filters.videoConsultation}
                  onCheckedChange={(checked) => onFilterChange('videoConsultation', checked)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-6 left-6 right-6 flex gap-3">
          <Button variant="outline" onClick={onReset} className="flex-1">
            {t("patient.filters.reset")}
          </Button>
          <Button onClick={handleApply} className="flex-1">
            {t("patient.filters.apply")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFilterDrawer;