// File: src/components/financial/FinanceManagementSection.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FinanceEntriesExportCard from "@/components/financial/FinanceEntriesExportCard";
import RecurringRulesPanel from "@/components/financial/RecurringRulesPanel";
import FinanceCategoriesManager from "@/components/financial/FinanceCategoriesManager";
import FinanceLedgerManager from "@/components/financial/FinanceLedgerManager";
import CompensationManager from "@/components/financial/CompensationManager";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

export default function FinanceManagementSection(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Finances</h2>
        <p className="text-sm text-muted-foreground">
          Manage income, expenses, payroll, compensation profiles, and exports.
        </p>
      </div>

      <CompensationManager entityType={entityType} entityId={entityId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceEntriesExportCard entityType={entityType} entityId={entityId} defaultDays={90} />
        <RecurringRulesPanel entityType={entityType} entityId={entityId} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <FinanceCategoriesManager entityType={entityType} entityId={entityId} />
        <FinanceLedgerManager entityType={entityType} entityId={entityId} />
      </div>
    </div>
  );
}
