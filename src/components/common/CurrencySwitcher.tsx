import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Coins } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrencyContext, SUPPORTED_CURRENCIES } from "@/contexts/CurrencyContext";
import type { CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";

/**
 * Compact header currency switcher — changes the display currency used across
 * every money value in the app (finance, billing, services, analytics).
 */
export default function CurrencySwitcher({ className = "" }: { className?: string }) {
  const { t } = useTranslation("profileMenu");
  const { currency, setCurrency } = useCurrencyContext();
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
    <Select value={currency} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger
        className={`h-9 w-[92px] rounded-xl border-border/60 bg-background/60 px-2 text-sm ${className}`}
        aria-label={t("profile.currency.label", "Display currency")}
      >
        <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {SUPPORTED_CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="font-medium">{c.code}</span>
            <span className="text-muted-foreground ml-2">{c.symbol} · {c.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
