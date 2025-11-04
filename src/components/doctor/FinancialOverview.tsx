import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, CreditCard, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface FinancialOverviewProps {
  stats: {
    totalEarnings: number;
    earningsThisMonth: number;
    earningsThisWeek: number;
    unpaidEarnings: number;
    payoutsProcessed: number;
    nextPayoutDate: string | null;
    platformCommission: number;
    netEarnings: number;
  };
}

export const FinancialOverview = ({ stats }: FinancialOverviewProps) => {
  const { t } = useTranslation("dashboard");
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("doctor.financialStats.overview.totalEarnings")}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalEarnings.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{t("doctor.financialStats.overview.allTimeRevenue")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("doctor.financialStats.overview.thisMonth")}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.earningsThisMonth.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">This week: ${stats.earningsThisWeek.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("doctor.financialStats.overview.unpaidEarnings")}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">${stats.unpaidEarnings.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Pending appointments</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("doctor.financialStats.overview.netEarnings")}</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${stats.netEarnings.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">After 15% platform fee</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm">{t("doctor.financialStats.overview.payoutInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Payouts Processed</p>
            <p className="text-2xl font-bold">{stats.payoutsProcessed}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Next Payout</p>
            <Badge variant="outline" className="mt-1">
              <CreditCard className="w-3 h-3 mr-1" />
              {stats.nextPayoutDate || 'TBD'}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Platform Commission</p>
            <p className="text-lg font-semibold text-destructive">${stats.platformCommission.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
