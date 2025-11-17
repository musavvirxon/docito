import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BillingToggleProps {
  period: "monthly" | "yearly";
  onToggle: (period: "monthly" | "yearly") => void;
}

export const BillingToggle = ({ period, onToggle }: BillingToggleProps) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <Label 
        htmlFor="billing-toggle" 
        className={`text-lg font-medium transition-colors ${
          period === "monthly" ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Monthly
      </Label>
      <Switch
        id="billing-toggle"
        checked={period === "yearly"}
        onCheckedChange={(checked) => onToggle(checked ? "yearly" : "monthly")}
      />
      <Label 
        htmlFor="billing-toggle" 
        className={`text-lg font-medium transition-colors ${
          period === "yearly" ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Yearly
        <span className="ml-2 text-sm text-primary">(Save 10%)</span>
      </Label>
    </div>
  );
};
