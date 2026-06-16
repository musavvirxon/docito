// Path: src/pages/BillingPage.tsx
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useBilling, type EntityType } from "@/hooks/useBilling";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ExternalLink, RefreshCw, CheckCircle2, XCircle, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { downloadInvoicePdf } from "@/lib/api/invoice-api";
import { toast } from "sonner";

function badgeVariant(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "trialing") return "default";
  if (s === "past_due") return "destructive";
  if (s === "canceled" || s === "unpaid") return "secondary";
  return "outline";
}

export default function BillingPage() {
  const { t } = useTranslation('common');
  const { permissions } = useStaffContext();
  const [sp] = useSearchParams();

  const entityType = (permissions?.staffType || "clinic") as EntityType;
  const entityId = (permissions as any)?.entity_id || null;

  const { loading, error, plans, invoices, summary, actions } = useBilling({
    entityType,
    entityId,
  });

  const banner = useMemo(() => {
    if (sp.get("success") === "1") return { icon: CheckCircle2, text: t('billing.paymentSuccess') };
    if (sp.get("canceled") === "1") return { icon: XCircle, text: t('billing.paymentCanceled') };
    return null;
  }, [sp, t]);

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      await downloadInvoicePdf(invoiceId, `invoice-${invoiceId.slice(0, 8)}`);
    } catch (e: any) {
      toast.error(e?.message || t('billing.downloadFailed'));
    }
  };

  return (
    <div className="space-y-6">
      {banner && (
        <Card>
          <CardContent className="py-4 flex items-center gap-2">
            <banner.icon className="h-4 w-4" />
            <div className="text-sm">{banner.text}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('billing.title')}
              </CardTitle>
              <CardDescription>{t('billing.manageDescription')}</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={actions.refetch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('billing.refresh')}
              </Button>
              <Button onClick={actions.openPortal} disabled={loading}>
                {t('billing.openPortal')}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={badgeVariant(summary.status) as any}>{summary.status}</Badge>
            <span className="font-medium">{summary.planName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {summary.planPrice}/{summary.interval}
            </span>
            {summary.nextInvoiceAmount && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {t('billing.nextInvoice')}: {summary.nextInvoiceAmount}
                  {summary.nextInvoiceDueAt ? ` ${t('billing.due').toLowerCase()} ${new Date(summary.nextInvoiceDueAt).toLocaleDateString()}` : ""}
                </span>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="text-sm font-medium">{t('billing.plans')}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {plans.map((p) => (
                    <Card key={p.id}>
                      <CardHeader className="space-y-1">
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        <CardDescription>{p.description || ""}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-2xl font-bold">
                          {(p.amount_cents / 100).toLocaleString(undefined, {
                            style: "currency",
                            currency: p.currency.toUpperCase(),
                          })}
                          <span className="text-sm text-muted-foreground font-normal">/{p.interval}</span>
                        </div>
                        <Button className="w-full" onClick={() => actions.startCheckout(p.code)}>
                          {t('billing.choose', { name: p.name })}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">{t('billing.invoices')}</div>
                {invoices.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('billing.noInvoices')}</div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{inv.status}</Badge>
                            <div className="font-medium">
                              {(inv.amount_due_cents / 100).toLocaleString(undefined, {
                                style: "currency",
                                currency: inv.currency.toUpperCase(),
                              })}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('billing.created')} {new Date(inv.created_at).toLocaleString()}
                            {inv.due_at ? ` • ${t('billing.due')} ${new Date(inv.due_at).toLocaleDateString()}` : ""}
                            {inv.paid_at ? ` • ${t('billing.paid')} ${new Date(inv.paid_at).toLocaleDateString()}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          {inv.hosted_invoice_url && (
                            <Button variant="outline" size="sm" onClick={() => window.open(inv.hosted_invoice_url!, "_blank")}>
                              {t('billing.view')} <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(inv.id)}>
                            {t('billing.pdf')} <Download className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
