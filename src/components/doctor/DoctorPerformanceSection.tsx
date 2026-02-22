import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw, Award } from "lucide-react";
import { useDoctorPerformance } from "@/hooks/useDoctorPerformance";
import { useAdvancedFinancialMetrics } from "@/hooks/useAdvancedFinancialMetrics";
import AdvancedFinancialMetrics from "@/components/financial/AdvancedFinancialMetrics";
import { motion, AnimatePresence } from "framer-motion";
import { PerformanceOverview } from "./PerformanceOverview";
import { PerformanceServices } from "./PerformanceServices";
import { PerformanceReviews } from "./PerformanceReviews";
import { PerformanceTrends } from "./PerformanceTrends";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface DoctorPerformanceSectionProps {
  doctorProfile: {
    id: string;
    specialty: string;
    verified: boolean;
    average_rating: number;
    num_reviews: number;
    appointment_count: number;
  };
  stats?: any;
}

const DoctorPerformanceSection = ({ doctorProfile, stats: providedStats }: DoctorPerformanceSectionProps) => {
  const { t } = useTranslation("dashboard");
  const [dateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const {
    stats,
    dailyTrends,
    servicePerformance,
    popularTimeSlots,
    recentReviews,
    newAchievements,
    loading,
    error,
    refreshData,
  } = useDoctorPerformance(dateRange.from, dateRange.to);

  const { metrics: advancedMetrics, refreshData: refreshAdvancedMetrics } = useAdvancedFinancialMetrics(
    stats.monthlyRevenue,
    "doctor",
  );

  const handleExport = () => {
    toast.success(t("doctor.performance.exportComingSoon"));
  };

  const handleRefresh = () => {
    refreshData();
    toast.success(t("doctor.performance.dataRefreshed"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("doctor.performance.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-12 text-center">
          <p className="text-destructive font-medium mb-2">{t("doctor.performance.errorLoading")}</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("doctor.performance.tryAgain")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{t("doctor.performance.title")}</h2>
              <p className="text-muted-foreground">{t("doctor.performance.description")}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("doctor.performance.refresh")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                {t("doctor.performance.export")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Achievement Notification */}
      <AnimatePresence>
        {newAchievements && newAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Award className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{t("doctor.performance.newAchievement")}</h3>
                <p className="text-lg">{newAchievements[0].title}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs for Different Sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t("doctor.performance.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="services">{t("doctor.performance.tabs.services")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("doctor.performance.tabs.reviews")}</TabsTrigger>
          <TabsTrigger value="trends">{t("doctor.performance.tabs.trends")}</TabsTrigger>
          <TabsTrigger value="advanced">{t("doctor.performance.tabs.advanced")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PerformanceOverview stats={stats} dailyTrends={dailyTrends as any} />
        </TabsContent>

        <TabsContent value="services">
          <PerformanceServices services={servicePerformance as any} />
        </TabsContent>

        <TabsContent value="reviews">
          <PerformanceReviews reviews={recentReviews as any} averageRating={stats.averageRating} totalReviews={stats.totalReviews} />
        </TabsContent>

        <TabsContent value="trends">
          <PerformanceTrends dailyTrends={dailyTrends as any} popularTimeSlots={popularTimeSlots as any} stats={stats} />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedFinancialMetrics
            metrics={advancedMetrics}
            revenue={stats.monthlyRevenue}
            onUpdateInputs={() => {
              refreshData();
              refreshAdvancedMetrics();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorPerformanceSection;
