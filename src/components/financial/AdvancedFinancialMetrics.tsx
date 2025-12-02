import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, TrendingUp, TrendingDown, DollarSign, Target, Calculator } from "lucide-react";
import { useState } from "react";
import FinancialInputsModal from "./FinancialInputsModal";

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
  const [showInputsModal, setShowInputsModal] = useState(false);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return "N/A";
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return "N/A";
    return value.toFixed(2);
  };

  const metricsData = [
    {
      title: "ROI (Return on Investment)",
      value: formatPercentage(metrics.roi),
      icon: TrendingUp,
      color: "text-green-500",
      description: "Overall investment return"
    },
    {
      title: "ROAS (Return on Ad Spend)",
      value: formatNumber(metrics.roas),
      icon: Target,
      color: "text-blue-500",
      description: "Revenue per ad dollar"
    },
    {
      title: "Ad Revenue / Cost",
      value: `${formatCurrency(metrics.adRevenue)} / ${formatCurrency(metrics.adCost)}`,
      icon: DollarSign,
      color: "text-purple-500",
      description: "Advertising performance"
    },
    {
      title: "Working Capital",
      value: formatCurrency(metrics.workingCapital),
      icon: DollarSign,
      color: "text-indigo-500",
      description: "Current assets - liabilities"
    },
    {
      title: "Working Capital Ratio",
      value: formatNumber(metrics.workingCapitalRatio),
      icon: Calculator,
      color: "text-cyan-500",
      description: "Liquidity measure"
    },
    {
      title: "Net Profit Margin",
      value: formatPercentage(metrics.netProfitMargin),
      icon: TrendingUp,
      color: "text-green-500",
      description: "Profitability after all expenses"
    },
    {
      title: "Gross Profit Margin",
      value: formatPercentage(metrics.grossProfitMargin),
      icon: TrendingUp,
      color: "text-emerald-500",
      description: "Revenue minus COGS"
    },
    {
      title: "EBITDA",
      value: formatCurrency(metrics.ebitda),
      icon: DollarSign,
      color: "text-yellow-500",
      description: "Earnings before interest, taxes, depreciation"
    },
    {
      title: "Break-Even Point (Units)",
      value: metrics.breakEvenUnits !== null ? Math.ceil(metrics.breakEvenUnits).toString() : "N/A",
      icon: Target,
      color: "text-orange-500",
      description: "Units needed to break even"
    },
    {
      title: "Revenue Run Rate",
      value: formatCurrency(metrics.revenueRunRate),
      icon: TrendingUp,
      color: "text-blue-500",
      description: "Annualized revenue projection"
    },
    {
      title: "CAC (Customer Acquisition Cost)",
      value: formatCurrency(metrics.cac),
      icon: DollarSign,
      color: "text-red-500",
      description: "Cost to acquire one customer"
    },
    {
      title: "LTV (Lifetime Value)",
      value: formatCurrency(metrics.ltv),
      icon: TrendingUp,
      color: "text-green-500",
      description: "Customer lifetime revenue"
    },
    {
      title: "CAC to LTV Ratio",
      value: metrics.cacToLtvRatio !== null ? `1:${metrics.cacToLtvRatio.toFixed(2)}` : "N/A",
      icon: Calculator,
      color: metrics.cacToLtvRatio && metrics.cacToLtvRatio >= 3 ? "text-green-500" : "text-orange-500",
      description: "Customer value vs acquisition cost"
    }
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Advanced Financial Metrics</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track key financial KPIs and profitability metrics
            </p>
          </div>
          <Button onClick={() => setShowInputsModal(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure Inputs
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
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {metrics.cacToLtvRatio !== null && (
              <p className={metrics.cacToLtvRatio >= 3 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>
                • CAC to LTV ratio is {metrics.cacToLtvRatio >= 3 ? "healthy" : "needs improvement"} 
                {metrics.cacToLtvRatio >= 3 ? " (>3:1 is ideal)" : " (<3:1 indicates high acquisition costs)"}
              </p>
            )}
            {metrics.netProfitMargin !== null && (
              <p className={metrics.netProfitMargin > 15 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>
                • Net profit margin is {metrics.netProfitMargin > 15 ? "strong" : "below average"} 
                {metrics.netProfitMargin > 15 ? " (>15% is excellent)" : " (aim for >15%)"}
              </p>
            )}
            {metrics.workingCapitalRatio !== null && (
              <p className={metrics.workingCapitalRatio >= 1.5 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>
                • Working capital ratio is {metrics.workingCapitalRatio >= 1.5 ? "healthy" : "tight"} 
                {metrics.workingCapitalRatio >= 1.5 ? " (1.5-2.0 is ideal)" : " (should be >1.5)"}
              </p>
            )}
            {metrics.roas !== null && (
              <p className={metrics.roas >= 4 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>
                • ROAS is {metrics.roas >= 4 ? "excellent" : "needs optimization"} 
                {metrics.roas >= 4 ? " (4:1 or higher)" : " (aim for at least 4:1)"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <FinancialInputsModal
        open={showInputsModal}
        onOpenChange={setShowInputsModal}
        onSave={onUpdateInputs}
      />
    </>
  );
};

export default AdvancedFinancialMetrics;
