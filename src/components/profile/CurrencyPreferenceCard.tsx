import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Loader2 } from "lucide-react";
import { useCurrencyContext, SUPPORTED_CURRENCIES } from "@/contexts/CurrencyContext";
import type { CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";

export default function CurrencyPreferenceCard() {
  const { t } = useTranslation("profileMenu");
  const { currency, setCurrency, format } = useCurrencyContext();
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: string) => {
    if (next === currency) return;
    setSaving(true);
    try {
      await setCurrency(next as CurrencyCode);
      toast.success(t("profile.currency.saved", "Currency preference updated"));
    } catch (e: any) {
      toast.error(e?.message || t("profile.currency.failed", "Could not update currency"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          {t("profile.currency.title", "Currency")}
        </CardTitle>
        <CardDescription>
          {t(
            "profile.currency.description",
            "Choose the currency used to display all amounts across treatment plans, appointments, billing and finance analytics.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("profile.currency.label", "Display currency")}</Label>
          <Select value={currency} onValueChange={handleChange} disabled={saving}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="font-medium">{c.code}</span>
                  <span className="text-muted-foreground ml-2">{c.symbol} · {c.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {saving && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("profile.currency.saving", "Saving…")}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground mb-1">
            {t("profile.currency.preview", "Preview")}
          </p>
          <p className="text-2xl font-semibold tracking-tight">{format(1234.56)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              "profile.currency.note",
              "Source amounts in other currencies are converted automatically using daily ECB exchange rates.",
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
