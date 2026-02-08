// File: src/components/financial/FinanceHub.tsx

import { useMemo, useState } from "react";
import { DollarSign, ListChecks, Receipt, Wallet, Clock, PiggyBank, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import FinanceOverview from "@/components/financial/FinanceOverview";
import FinancePlaceholder from "@/components/financial/FinancePlaceholder";

export type FinanceEntityType = "practice" | "lab" | "pharmacy" | "imaging_center";

interface FinanceHubProps {
  entityType: FinanceEntityType;
  entityId: string;
}

const iconClass = "w-4 h-4";

export default function FinanceHub({ entityType, entityId }: FinanceHubProps) {
  const [tab, setTab] = useState<
    "overview" | "transactions" | "expenses" | "payroll" | "attendance" | "budgets" | "reports"
  >("overview");

  const entityLabel = useMemo(() => {
    switch (entityType) {
      case "practice":
        return "Clinic";
      case "lab":
        return "Lab";
      case "pharmacy":
        return "Pharmacy";
      case "imaging_center":
        return "Imaging Center";
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
          <FinancePlaceholder
            title="Transactions"
            description="Create and manage income/expense ledger entries."
          />
        </TabsContent>

        <TabsContent value="expenses">
          <FinancePlaceholder
            title="Expenses"
            description="Track supplies, utilities, taxes, and operational costs."
          />
        </TabsContent>

        <TabsContent value="payroll">
          <FinancePlaceholder
            title="Payroll"
            description="Commissions, salaries, payouts, and payroll runs."
          />
        </TabsContent>

        <TabsContent value="attendance">
          <FinancePlaceholder
            title="Attendance"
            description="Clock-in/out tracking to support hourly wages."
          />
        </TabsContent>

        <TabsContent value="budgets">
          <FinancePlaceholder
            title="Budgets"
            description="Set monthly buckets and compare actual vs planned."
          />
        </TabsContent>

        <TabsContent value="reports">
          <FinancePlaceholder
            title="Reports"
            description="Profitability, payroll ratios, exports and insights."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
