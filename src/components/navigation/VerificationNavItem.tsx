// Path: src/components/navigation/VerificationNavItem.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";

export default function VerificationNavItem({
  entityType,
  verificationStatus,
  disabled,
}: {
  entityType: EntityType;
  verificationStatus?: string | null;
  disabled?: boolean;
}) {
  const navigate = useNavigate();

  const status = (verificationStatus || "draft").toLowerCase();

  const label = useMemo(() => {
    if (status === "approved" || status === "verified") return "Verified";
    if (status === "submitted" || status === "pending") return "Pending Verification";
    if (status === "rejected") return "Rejected";
    return "Verification (Draft)";
  }, [status]);

  const variant = useMemo(() => {
    if (status === "approved" || status === "verified") return "default";
    if (status === "submitted" || status === "pending") return "secondary";
    if (status === "rejected") return "destructive";
    return "outline";
  }, [status]);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={() => navigate(`/verification/${entityType}`)}
      className="gap-2"
      type="button"
    >
      <Badge variant={variant as any}>{label}</Badge>
    </Button>
  );
}
