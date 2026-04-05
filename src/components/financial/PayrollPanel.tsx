// File: src/components/financial/PayrollPanel.tsx

import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

type Props = {
  entityType: FinanceEntityType;
  entityId: string;
  locationId?: string | null;
};

export default function PayrollPanel(_props: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Payroll</h3>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Payroll runs & payouts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This panel will include: staff compensation profiles (commission % and fixed salaries), payout schedules
            (monthly/weekly/daily/per-visit), payroll run generation, approvals, and posting payroll entries into finance.
          </p>
          <p>
            Next steps will connect payroll runs and export to the <span className="font-medium">Reports</span> tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
