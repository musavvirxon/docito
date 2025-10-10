import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, Calendar, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FinancialInsightsProps {
  insights: {
    refundRate: number;
    mostProfitableService: any;
    busiestDays: any[];
    revenuePerHour: number;
    totalHours: number;
  };
}

export const FinancialInsights = ({ insights }: FinancialInsightsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4" />
            Most Profitable Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.mostProfitableService ? (
            <>
              <p className="text-lg font-semibold">{insights.mostProfitableService.serviceName}</p>
              <p className="text-2xl font-bold text-green-600">
                ${insights.mostProfitableService.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {insights.mostProfitableService.bookings} bookings
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Revenue Per Hour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${insights.revenuePerHour.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            Based on {insights.totalHours.toFixed(1)} hours worked
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Cancellation Refund Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold">{insights.refundRate.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">
                {insights.refundRate < 10 ? 'Excellent' : insights.refundRate < 20 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
            <Progress value={insights.refundRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Busiest Days (Revenue)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.busiestDays.length > 0 ? (
            <div className="space-y-2">
              {insights.busiestDays.map((day, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{day.date}</span>
                  <span className="font-semibold text-green-600">
                    ${day.earnings.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
