import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { computeAccess, redirectFor, type AccessInput } from "@/lib/subscriptionAccess";

export function useAccessStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["access-status", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_access_status");
      if (error) throw error;
      return computeAccess(data as AccessInput);
    },
  });
}

/** Redirects locked doctor/facility accounts away from dashboards and shows the trial reminder. */
export default function SubscriptionGate() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useAccessStatus();
  const [dismissed, setDismissed] = useState(false);
  const langMatch = location.pathname.match(/^\/([a-z]{2})(\/|$)/);
  const prefix = langMatch ? `/${langMatch[1]}` : "";

  useEffect(() => {
    if (!data) return;
    const target = redirectFor(data.state, location.pathname);
    if (target) navigate(prefix + target, { replace: true });
  }, [data, location.pathname, navigate, prefix]);

  const params = new URLSearchParams(location.search);
  const lockMessage = params.get("trial") === "expired" ? t("subscription.trialExpired")
    : params.get("payment") === "due" ? t("subscription.paymentDue") : null;

  const showReminder = data?.state === "trial_reminder" && !dismissed && /dashboard/.test(location.pathname);
  if (!lockMessage && !showReminder) return null;

  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,640px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-lg">
      <p className="flex-1 text-sm">
        {lockMessage ?? t("subscription.trialDaysLeft", { count: data?.daysLeft ?? 0 })}
      </p>
      {showReminder && (
        <>
          <Button asChild size="sm"><Link to={`${prefix}/pricing`}>{t("subscription.choosePlan")}</Link></Button>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setDismissed(true)}><X className="h-4 w-4" /></Button>
        </>
      )}
    </div>
  );
}
