import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PayoutRecord {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  paymentMethod: string;
  referenceId: string;
}

interface FinancialPayoutsProps {
  payoutRecords: PayoutRecord[];
}

export const FinancialPayouts = ({ payoutRecords }: FinancialPayoutsProps) => {
  const { t } = useTranslation("dashboard");
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'pending':
        return 'secondary' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("doctor.financialStats.payouts.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("doctor.financialStats.payouts.referenceId")}</TableHead>
              <TableHead>{t("doctor.financialStats.payouts.amount")}</TableHead>
              <TableHead>{t("doctor.financialStats.payouts.status")}</TableHead>
              <TableHead>{t("doctor.financialStats.payouts.date")}</TableHead>
              <TableHead>{t("doctor.financialStats.payouts.paymentMethod")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payoutRecords.length > 0 ? (
              payoutRecords.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-mono text-sm">{payout.referenceId}</TableCell>
                  <TableCell className="font-semibold">${payout.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(payout.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(payout.status)}
                      {payout.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(payout.date).toLocaleDateString()}</TableCell>
                  <TableCell>{payout.paymentMethod}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("doctor.financialStats.payouts.noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
