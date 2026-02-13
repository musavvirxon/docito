import { useMemo, useState } from "react";
import { DollarSign, ListChecks, Receipt, Wallet, Clock, PiggyBank, BarChart3 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import FinanceOverview from "@/components/financial/FinanceOverview";
import FinanceTransactions from "@/components/financial/FinanceTransactions";
import AttendancePanel from "@/components/financial/AttendancePanel";
import PayrollPanel from "@/components/financial/PayrollPanel";
import ExpensesPanel from "@/components/financial/ExpensesPanel";
import BudgetsPanel from "@/components/financial/BudgetsPanel";
import ReportsPanel from "@/components/financial/ReportsPanel";
import { useEnsureFinanceDefaults } from "@/hooks/useEnsureFinanceDefaults";

export type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

interface FinanceHubProps {
  entityType: FinanceEntityType;
  entityId: string;
}

const iconClass = "w-4 h-4";

export default function FinanceHub({ entityType, entityId }: FinanceHubProps) {
  const [tab, setTab] = useState<
    "overview" | "transactions" | "expenses" | "payroll" | "attendance" | "budgets" | "reports"
  >("overview");

  useEnsureFinanceDefaults({ entityType, entityId });

  const entityLabel = useMemo(() => {
    switch (entityType) {
      case "clinic":
        return "Clinic";
      case "lab":
        return "Lab";
      case "pharmacy":
        return "Pharmacy";
      case "imaging":
        return "Imaging";
      default:
        return "Entity";
    }
  }, [entityType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Finance</h2>
          <Badge variant="secondary">{entityLabel}</Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-2">
            <DollarSign className={iconClass} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <ListChecks className={iconClass} />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className={iconClass} />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <Wallet className={iconClass} />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className={iconClass} />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="budgets" className="gap-2">
            <PiggyBank className={iconClass} />
            Budgets
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className={iconClass} />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinanceOverview entityType={entityType} entityId={entityId} />
        </TabsContent>

        <TabsContent value="transactions">
          <FinanceTransactions entityType={entityType} entityId={entityId} />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesPanel entityType={entityType} entityId={entityId} />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollPanel entityType={entityType} entityId={entityId} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel entityType={entityType} entityId={entityId} />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetsPanel entityType={entityType} entityId={entityId} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsPanel entityType={entityType} entityId={entityId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
