import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw, FileText } from "lucide-react";
import { useFinancialStats } from "@/hooks/useFinancialStats";
import { FinancialOverview } from "./FinancialOverview";
import { FinancialChart } from "./FinancialChart";
import { FinancialServices } from "./FinancialServices";
import { FinancialPayouts } from "./FinancialPayouts";
import { FinancialPending } from "./FinancialPending";
import { FinancialInsights } from "./FinancialInsights";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const DoctorFinancialStatsSection = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const [datePreset, setDatePreset] = useState<'7days' | '30days' | '90days' | 'custom'>('30days');

  const { 
    stats, 
    earningsHistory,
    serviceEarnings,
    patientEarnings,
    pendingPayments,
    payoutRecords,
    insights,
    loading,
    error,
    refreshData
  } = useFinancialStats(dateRange.from, dateRange.to);

  const handleDatePresetChange = (preset: '7days' | '30days' | '90days') => {
    setDatePreset(preset);
    const to = new Date();
    const from = subDays(to, preset === '7days' ? 7 : preset === '30days' ? 30 : 90);
    setDateRange({ from, to });
  };

  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    // Generate export data
    const exportData = {
      summary: stats,
      earnings: earningsHistory,
      services: serviceEarnings,
      pending: pendingPayments,
      payouts: payoutRecords,
      insights: insights,
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      }
    };

    if (format === 'csv') {
      // CSV export
      const csvRows = [
        ['Date', 'Earnings', 'Appointments'],
        ...earningsHistory.map(e => [e.date, e.earnings, e.appointments])
      ];
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('CSV exported successfully');
    } else {
      toast.info(`${format.toUpperCase()} export will be available soon`);
    }
  };

  const handleRefresh = () => {
    refreshData();
    toast.success('Financial data refreshed');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading financial data: {error}</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Financial Stats</h2>
          <p className="text-muted-foreground">Track your earnings and financial performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 border rounded-md p-1">
            <Button 
              variant={datePreset === '7days' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => handleDatePresetChange('7days')}
            >
              7 Days
            </Button>
            <Button 
              variant={datePreset === '30days' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => handleDatePresetChange('30days')}
            >
              30 Days
            </Button>
            <Button 
              variant={datePreset === '90days' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => handleDatePresetChange('90days')}
            >
              90 Days
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <FileText className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <FinancialOverview stats={stats} />

      {/* Tabs */}
      <Tabs defaultValue="chart" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chart">Earnings Chart</TabsTrigger>
          <TabsTrigger value="services">By Service</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="space-y-6">
          <FinancialChart earningsHistory={earningsHistory} />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <FinancialServices serviceEarnings={serviceEarnings} />
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <FinancialPayouts payoutRecords={payoutRecords} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <FinancialPending pendingPayments={pendingPayments} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <FinancialInsights insights={insights} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
