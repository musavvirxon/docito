// File: src/pages/AdminSettingsPage.tsx
// B5: Add BudgetDashboard under budgets section (full file replacement)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CompensationProfilesPanel from "@/components/staff/CompensationProfilesPanel";
import BudgetEditorPanel from "@/components/financial/BudgetEditorPanel";
import BudgetDashboard from "@/components/financial/BudgetDashboard";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type PracticeRow = {
  id: string;
  name: string;
};

export default function AdminSettingsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [practice, setPractice] = useState<PracticeRow | null>(null);

  // Clinic-first app
  const entityType: FinanceEntityType = "clinic";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!userResp?.user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("staff_members")
          .select("practice_id, practices:practice_id(id,name)")
          .eq("user_id", userResp.user.id)
          .maybeSingle();

        if (error) throw error;

        const p = (data as any)?.practices;
        if (!p?.id) {
          setPractice(null);
        } else {
          setPractice({ id: String(p.id), name: String(p.name || "Clinic") });
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load admin settings");
        setPractice(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin settings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">No clinic practice is linked to this account.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin settings · {practice.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configure clinic settings, staff compensation, and budgets.
        </CardContent>
      </Card>

      {/* Step 36 */}
      <CompensationProfilesPanel entityType={entityType} entityId={practice.id} />

      {/* B3 */}
      <BudgetEditorPanel entityType={entityType} entityId={practice.id} />

      {/* B5 */}
      <BudgetDashboard entityType={entityType} entityId={practice.id} />
    </div>
  );
}
