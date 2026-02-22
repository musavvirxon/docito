import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, TrendingUp, DollarSign, Target, Calculator } from "lucide-react";
import { useState } from "react";
import FinancialInputsModal from "./FinancialInputsModal";
import { useTranslation } from "react-i18next";

interface AdvancedMetrics {
  roi: number | null;
  roas: number | null;
  adRevenue: number;
  adCost: number;
  workingCapital: number | null;
  workingCapitalRatio: number | null;
  netProfitMargin: number | null;
  grossProfitMargin: number | null;
  ebitda: number | null;
  breakEvenUnits: number | null;
  revenueRunRate: number;
  cac: number | null;
  ltv: number | null;
  cacToLtvRatio: number | null;
}

interface AdvancedFinancialMetricsProps {
  metrics: AdvancedMetrics;
  revenue: number;
  onUpdateInputs: () => void;
}

const AdvancedFinancialMetrics = ({ metrics, revenue, onUpdateInputs }: AdvancedFinancialMetricsProps) => {
  const { t } = useTranslation("dashboard");
  const [showInputsModal, setShowInputsModal] = useState(false);

  const na = t("doctor.performance.notAvailable");

  const formatCurrency = (value: number | null) => {
    if (value === null) return na;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return na;
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return na;
    return value.toFixed(2);
  };

  const metricsData = [
    {
      title: t("doctor.performance.advancedFinancial.metrics.roi.title"),
      value: formatPercentage(metrics.roi),
      icon: TrendingUp,
      color: "text-green-500",
      description: t("doctor.performance.advancedFinancial.metrics.roi.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.roas.title"),
      value: formatNumber(metrics.roas),
      icon: Target,
      color: "text-blue-500",
      description: t("doctor.performance.advancedFinancial.metrics.roas.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.adRevenueCost.title"),
      value: `${formatCurrency(metrics.adRevenue)} / ${formatCurrency(metrics.adCost)}`,
      icon: DollarSign,
      color: "text-purple-500",
      description: t("doctor.performance.advancedFinancial.metrics.adRevenueCost.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.workingCapital.title"),
      value: formatCurrency(metrics.workingCapital),
      icon: DollarSign,
      color: "text-indigo-500",
      description: t("doctor.performance.advancedFinancial.metrics.workingCapital.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.workingCapitalRatio.title"),
      value: formatNumber(metrics.workingCapitalRatio),
      icon: Calculator,
      color: "text-cyan-500",
      description: t("doctor.performance.advancedFinancial.metrics.workingCapitalRatio.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.netProfitMargin.title"),
      value: formatPercentage(metrics.netProfitMargin),
      icon: TrendingUp,
      color: "text-green-500",
      description: t("doctor.performance.advancedFinancial.metrics.netProfitMargin.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.grossProfitMargin.title"),
      value: formatPercentage(metrics.grossProfitMargin),
      icon: TrendingUp,
      color: "text-emerald-500",
      description: t("doctor.performance.advancedFinancial.metrics.grossProfitMargin.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.ebitda.title"),
      value: formatCurrency(metrics.ebitda),
      icon: DollarSign,
      color: "text-yellow-500",
      description: t("doctor.performance.advancedFinancial.metrics.ebitda.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.breakEvenUnits.title"),
      value: metrics.breakEvenUnits !== null ? Math.ceil(metrics.breakEvenUnits).toString() : na,
      icon: Target,
      color: "text-orange-500",
      description: t("doctor.performance.advancedFinancial.metrics.breakEvenUnits.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.revenueRunRate.title"),
      value: formatCurrency(metrics.revenueRunRate),
      icon: TrendingUp,
      color: "text-blue-500",
      description: t("doctor.performance.advancedFinancial.metrics.revenueRunRate.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.cac.title"),
      value: formatCurrency(metrics.cac),
      icon: DollarSign,
      color: "text-red-500",
      description: t("doctor.performance.advancedFinancial.metrics.cac.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.ltv.title"),
      value: formatCurrency(metrics.ltv),
      icon: TrendingUp,
      color: "text-green-500",
      description: t("doctor.performance.advancedFinancial.metrics.ltv.description"),
    },
    {
      title: t("doctor.performance.advancedFinancial.metrics.cacToLtv.title"),
      value: metrics.cacToLtvRatio !== null ? `1:${metrics.cacToLtvRatio.toFixed(2)}` : na,
      icon: Calculator,
      color: metrics.cacToLtvRatio && metrics.cacToLtvRatio >= 3 ? "text-green-500" : "text-orange-500",
      description: t("doctor.performance.advancedFinancial.metrics.cacToLtv.description"),
    },
  ];

  const cacToLtvInsight =
    metrics.cacToLtvRatio === null
      ? null
      : metrics.cacToLtvRatio >= 3
        ? t("doctor.performance.advancedFinancial.insights.cacToLtvHealthy")
        : t("doctor.performance.advancedFinancial.insights.cacToLtvNeedsImprovement");

  const netProfitInsight =
    metrics.netProfitMargin === null
      ? null
      : metrics.netProfitMargin > 15
        ? t("doctor.performance.advancedFinancial.insights.netProfitStrong")
        : t("doctor.performance.advancedFinancial.insights.netProfitBelowAvg");

  const workingCapitalInsight =
    metrics.workingCapitalRatio === null
      ? null
      : metrics.workingCapitalRatio >= 1.5
        ? t("doctor.performance.advancedFinancial.insights.workingCapitalHealthy")
        : t("doctor.performance.advancedFinancial.insights.workingCapitalTight");

  const roasInsight =
    metrics.roas === null
      ? null
      : metrics.roas >= 4
        ? t("doctor.performance.advancedFinancial.insights.roasExcellent")
        : t("doctor.performance.advancedFinancial.insights.roasNeedsOptimization");

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("doctor.performance.advancedFinancial.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("doctor.performance.advancedFinancial.description")}</p>
          </div>
          <Button onClick={() => setShowInputsModal(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            {t("doctor.performance.advancedFinancial.configureInputs")}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metricsData.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t("doctor.performance.advancedFinancial.keyInsightsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {cacToLtvInsight && (
              <p
                className={
                  metrics.cacToLtvRatio !== null && metrics.cacToLtvRatio >= 3
                    ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                }
              >
                {cacToLtvInsight}
              </p>
            )}
            {netProfitInsight && (
              <p
                className={
                  metrics.netProfitMargin !== null && metrics.netProfitMargin > 15
                    ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                }
              >
                {netProfitInsight}
              </p>
            )}
            {workingCapitalInsight && (
              <p
                className={
                  metrics.workingCapitalRatio !== null && metrics.workingCapitalRatio >= 1.5
                    ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                }
              >
                {workingCapitalInsight}
              </p>
            )}
            {roasInsight && (
              <p
                className={
                  metrics.roas !== null && metrics.roas >= 4
                    ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                }
              >
                {roasInsight}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <FinancialInputsModal open={showInputsModal} onOpenChange={setShowInputsModal} onSave={onUpdateInputs} />
    </>
  );
};

export default AdvancedFinancialMetrics;
