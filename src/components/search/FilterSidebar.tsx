import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FilterSidebarProps {
  filters: {
    doctorsOnly: boolean;
    practicesOnly: boolean;
    acceptsNewPatients: boolean;
    availableToday: boolean;
    acceptsInsurance: boolean;
    videoConsultation: boolean;
  };
  onFilterChange: (key: string, value: boolean) => void;
}

const FilterSidebar = ({ filters, onFilterChange }: FilterSidebarProps) => {
  const { t } = useTranslation("dashboard");

  return (
    <aside className="w-80 flex-shrink-0">
      <Card className="sticky top-6">{/* Reduced top offset since search panel is no longer sticky */}
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5" />
            <h3 className="text-lg font-semibold">{t("patient.filters.title")}</h3>
          </div>

          <div className="space-y-4">
            {/* Provider Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("patient.filters.providerType")}</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="doctors-only" className="text-sm">
                    {t("patient.filters.doctorsOnly")}
                  </Label>
                  <Switch
                    id="doctors-only"
                    checked={filters.doctorsOnly}
                    onCheckedChange={(checked) => onFilterChange('doctorsOnly', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="practices-only" className="text-sm">
                    {t("patient.filters.practicesOnly")}
                  </Label>
                  <Switch
                    id="practices-only"
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
                  <Label htmlFor="new-patients" className="text-sm">
                    {t("patient.filters.acceptingNewPatients")}
                  </Label>
                  <Switch
                    id="new-patients"
                    checked={filters.acceptsNewPatients}
                    onCheckedChange={(checked) => onFilterChange('acceptsNewPatients', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="available-today" className="text-sm">
                    {t("patient.filters.availableToday")}
                  </Label>
                  <Switch
                    id="available-today"
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
                  <Label htmlFor="accepts-insurance" className="text-sm">
                    {t("patient.filters.acceptsInsurance")}
                  </Label>
                  <Switch
                    id="accepts-insurance"
                    checked={filters.acceptsInsurance}
                    onCheckedChange={(checked) => onFilterChange('acceptsInsurance', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="video-consultation" className="text-sm">
                    {t("patient.filters.videoConsultation")}
                  </Label>
                  <Switch
                    id="video-consultation"
                    checked={filters.videoConsultation}
                    onCheckedChange={(checked) => onFilterChange('videoConsultation', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
};

export default FilterSidebar;