import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarkAsPaidDialog, MarkAsPaidContext } from "@/components/doctor/MarkAsPaidDialog";

export interface PendingPayment {
  appointmentId: string;
  patientName: string;
  patientId?: string | null;
  serviceName: string;
  amount: number;
  date: string;
  status: string;
  doctorId?: string | null;
  practiceId?: string | null;
}

interface FinancialPendingProps {
  pendingPayments: PendingPayment[];
  onPaymentRecorded?: () => void;
}

export const FinancialPending = ({ pendingPayments, onPaymentRecorded }: FinancialPendingProps) => {
  const { t } = useTranslation("dashboard");
  const totalPending = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [context, setContext] = useState<MarkAsPaidContext | null>(null);

  const openDialog = (payment: PendingPayment) => {
    if (!payment.patientId) return;
    setContext({
      appointmentId: payment.appointmentId,
      patientId: payment.patientId,
      doctorId: payment.doctorId,
      practiceId: payment.practiceId,
      patientName: payment.patientName,
      serviceName: payment.serviceName,
      defaultAmount: payment.amount,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("doctor.financialStats.pending.title")}</CardTitle>
          <Badge variant="outline" className="text-lg">
            {t("doctor.financialStats.pending.total")}: ${totalPending.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("doctor.financialStats.pending.patientName")}</TableHead>
              <TableHead>{t("doctor.financialStats.pending.service")}</TableHead>
              <TableHead>{t("doctor.financialStats.pending.amount")}</TableHead>
              <TableHead>{t("doctor.financialStats.pending.date")}</TableHead>
              <TableHead>{t("doctor.financialStats.pending.status")}</TableHead>
              <TableHead>{t("doctor.financialStats.pending.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingPayments.length > 0 ? (
              pendingPayments.map((payment) => (
                <TableRow key={payment.appointmentId}>
                  <TableCell className="font-medium">{payment.patientName}</TableCell>
                  <TableCell>{payment.serviceName}</TableCell>
                  <TableCell className="font-semibold">${payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{payment.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!payment.patientId}
                      onClick={() => openDialog(payment)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {t("doctor.financialStats.pending.markPaid")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("doctor.financialStats.pending.noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <MarkAsPaidDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        context={context}
        onSuccess={onPaymentRecorded}
      />
    </Card>
  );
};
