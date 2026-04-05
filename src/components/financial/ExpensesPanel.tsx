// File: src/components/financial/ExpensesPanel.tsx

import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

type Props = {
  entityType: FinanceEntityType;
  entityId: string;
  locationId?: string | null;
};

export default function ExpensesPanel(_props: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Expenses</h3>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Manage expenses</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This panel will include: quick-add expense form, recurring bills (water/electricity/gas/heating),
            vendor/supply tracking, and category-level analytics.
          </p>
          <p>
            For now, record expenses using the <span className="font-medium">Transactions</span> tab (entry type:{" "}
            <span className="font-medium">expense</span>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
