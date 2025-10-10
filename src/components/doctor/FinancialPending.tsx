import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PendingPayment {
  appointmentId: string;
  patientName: string;
  serviceName: string;
  amount: number;
  date: string;
  status: string;
}

interface FinancialPendingProps {
  pendingPayments: PendingPayment[];
}

export const FinancialPending = ({ pendingPayments }: FinancialPendingProps) => {
  const totalPending = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const handleMarkAsPaid = (appointmentId: string) => {
    toast.success('Payment marked as received');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pending Payments</CardTitle>
          <Badge variant="outline" className="text-lg">
            Total: ${totalPending.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
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
                      onClick={() => handleMarkAsPaid(payment.appointmentId)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Paid
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No pending payments
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
