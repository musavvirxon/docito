// File: src/components/financial/FinanceManagementSection.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FinanceEntriesExportCard from "@/components/financial/FinanceEntriesExportCard";
import RecurringRulesPanel from "@/components/financial/RecurringRulesPanel";
import FinanceCategoriesManager from "@/components/financial/FinanceCategoriesManager";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

export default function FinanceManagementSection(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Finances</h2>
        <p className="text-sm text-muted-foreground">
          Manage income, expenses, payroll automation, and exports. Categories power clean reporting and analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceEntriesExportCard entityType={entityType} entityId={entityId} defaultDays={90} />
        <RecurringRulesPanel entityType={entityType} entityId={entityId} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <FinanceCategoriesManager entityType={entityType} entityId={entityId} />
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">What’s next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Next we’ll add: manual ledger entry creation, payroll runs (fixed salary + hourly + commission), and analytics
            dashboards (category breakdowns, profit & loss, cashflow).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
