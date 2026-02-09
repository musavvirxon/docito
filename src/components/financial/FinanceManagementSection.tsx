// File: src/components/financial/FinanceManagementSection.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FinanceEntriesExportCard from "@/components/financial/FinanceEntriesExportCard";
import RecurringRulesPanel from "@/components/financial/RecurringRulesPanel";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

export default function FinanceManagementSection(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Finances</h2>
        <p className="text-sm text-muted-foreground">
          Manage income, expenses, and payroll automation. Export ledgers for accounting and auditing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceEntriesExportCard entityType={entityType} entityId={entityId} defaultDays={90} />
        <RecurringRulesPanel entityType={entityType} entityId={entityId} />
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">What’s next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Next steps will add full ledger management: categories, manual entries, payroll payout runs, and analytics
            breakdowns (supplies, utilities, taxes, etc.).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
