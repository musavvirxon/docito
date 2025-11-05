import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface EarningsHistory {
  date: string;
  earnings: number;
  appointments: number;
}

interface FinancialChartProps {
  earningsHistory: EarningsHistory[];
}

export const FinancialChart = ({ earningsHistory }: FinancialChartProps) => {
  const { t } = useTranslation("dashboard");
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const hasData = earningsHistory.length > 0;
  const displayData = hasData ? earningsHistory : [
    { date: 'No Data', earnings: 0, appointments: 0 }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("doctor.financialStats.chart.title")}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              {t("doctor.financialStats.chart.line")}
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              {t("doctor.financialStats.chart.bar")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t("doctor.financialStats.chart.noData")}</p>
            <p className="text-xs mt-1">{t("doctor.financialStats.chart.noDataDesc")}</p>
          </div>
        )}
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'line' ? (
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value: number) => hasData ? `$${value.toLocaleString()}` : '0'}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="earnings" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name={t("doctor.financialStats.chart.earningsLabel")}
                dot={hasData}
              />
            </LineChart>
          ) : (
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value: number) => hasData ? `$${value.toLocaleString()}` : '0'}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="earnings" fill="hsl(var(--primary))" name={t("doctor.financialStats.chart.earningsLabel")} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
