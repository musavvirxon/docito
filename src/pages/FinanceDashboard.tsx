import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useAccessScope, type EntityType } from "@/hooks/useAccessScope";
import { useActiveEntityScope } from "@/hooks/useActiveEntityScope";

import Header from "@/components/Header";
import { DashboardShell, type SidebarItem } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Landmark, ListOrdered, Wallet, Package, Users, BarChart3, ArrowUpRight, Repeat } from "lucide-react";

import FinanceLedgerPanel from "@/components/financial/FinanceLedgerPanel";
import IncomeEntriesPanel from "@/components/financial/IncomeEntriesPanel";
import ExpensesEntriesPanel from "@/components/financial/ExpensesEntriesPanel";
import PayrollEntriesPanel from "@/components/financial/PayrollEntriesPanel";
import FinanceAnalyticsPanel from "@/components/financial/FinanceAnalyticsPanel";
import BudgetsPanel from "@/components/financial/BudgetsPanel";
import SuppliesPanel from "@/components/financial/SuppliesPanel";
import RecurringRulesPanel from "@/components/financial/RecurringRulesPanel";
import { useTranslation } from "react-i18next";

type FinanceTab =
  | "overview"
  | "ledger"
  | "income"
  | "budgets"
  | "expenses"
  | "supplies"
  | "recurring"
  | "payroll"
  | "analytics";

const TYPE_KEY = "docito.activeEntity.financeType";

function labelForType(t: string) {
  const v = String(t || "").toLowerCase();
  if (v === "clinic") return "Clinic";
  if (v === "lab") return "Lab";
  if (v === "imaging") return "Imaging";
  if (v === "pharmacy") return "Pharmacy";
  return v || "Unknown";
}

export default function FinanceDashboard() {
  const { t } = useTranslation('dashboard');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();
  const { loading: scopeLoading, error: scopeError, scopes, primary, refetch } = useAccessScope();

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const s of scopes || []) {
      const et = String(s.entity_type || "").toLowerCase();
      if (et === "clinic" || et === "lab" || et === "imaging" || et === "pharmacy") set.add(et);
    }
    return Array.from(set) as EntityType[];
  }, [scopes]);

  const defaultType = useMemo((): EntityType => {
    try {
      const saved = (localStorage.getItem(TYPE_KEY) || "").toLowerCase();
      if (saved && (["clinic", "lab", "imaging", "pharmacy"] as string[]).includes(saved)) {
        return saved as EntityType;
      }
    } catch {
      // ignore
    }

    const p = String(primary?.entity_type || "").toLowerCase();
    if ((["clinic", "lab", "imaging", "pharmacy"] as string[]).includes(p)) return p as EntityType;

    return (availableTypes[0] as EntityType) || "clinic";
  }, [availableTypes, primary?.entity_type]);

  const [entityType, setEntityType] = useState<EntityType>(defaultType);

  useEffect(() => {
    setEntityType(defaultType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultType]);

  useEffect(() => {
    try {
      localStorage.setItem(TYPE_KEY, entityType);
    } catch {
      // ignore
    }
  }, [entityType]);

  const { loading, error, scopes: entityScopes, activeEntityId, setActiveEntityId, activeScope } =
    useActiveEntityScope(entityType);

  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = String(params.get("tab") || "").toLowerCase();
    const ok: FinanceTab[] = ["overview", "ledger", "income", "budgets", "expenses", "supplies", "recurring", "payroll", "analytics"];
    if (ok.includes(tab as any)) setActiveTab(tab as FinanceTab);
  }, [location.search]);

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <Landmark className="h-5 w-5" /> },
      { id: "ledger", label: "Ledger", icon: <ListOrdered className="h-5 w-5" /> },
      { id: "income", label: "Income", icon: <ArrowUpRight className="h-5 w-5" /> },
      { id: "budgets", label: "Budgets", icon: <Wallet className="h-5 w-5" /> },
      { id: "expenses", label: "Expenses", icon: <Wallet className="h-5 w-5" /> },
      { id: "supplies", label: "Supplies", icon: <Package className="h-5 w-5" /> },
      { id: "recurring", label: "Recurring", icon: <Repeat className="h-5 w-5" /> },
      { id: "payroll", label: "Payroll", icon: <Users className="h-5 w-5" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
    ],
    [],
  );

  const isLoading = authLoading || scopeLoading || loading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <EmptyState
            icon={<Landmark className="h-12 w-12" />}
            title="Sign in required"
            description="Please sign in to access Finance."
            action={
              <button onClick={() => navigate("/auth")} className="text-primary underline">
                Sign In
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (scopeError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <EmptyState
            icon={<Landmark className="h-12 w-12" />}
            title="Failed to load access scope"
            description={scopeError}
            action={
              <button
                onClick={() => {
                  try {
                    void refetch();
                  } catch {
                    // ignore
                  }
                }}
                className="text-primary underline"
              >
                Retry
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (!availableTypes.length) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <EmptyState
            icon={<Landmark className="h-12 w-12" />}
            title="No organization access"
            description="You don't have access to any clinic, lab, imaging center, or pharmacy yet."
          />
        </div>
      </div>
    );
  }

  const entityId = activeEntityId || "";
  const entityName = activeScope?.entity_name || null;
  const statusLabel = (activeScope?.entity_status || "active") as any;

  const onChangeTab = (id: string) => {
    setActiveTab(id as FinanceTab);

    const params = new URLSearchParams(location.search);
    params.set("tab", String(id));
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true },
    );
  };

  const onRefresh = async () => {
    try {
      await refetch();
      toast.success("Refreshed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to refresh");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <DashboardShell
          role={activeRole as any}
          entityName={entityName || undefined}
          entityStatus={statusLabel}
          sidebarItems={sidebarItems}
          activeItem={activeTab}
          onItemChange={onChangeTab}
        >
          <PageHeader
            title="Finance"
            description="Manage income, expenses, payroll, supplies, recurring rules, and analytics from one place."
            actions={
              <>
                <div className="hidden md:flex items-center gap-2">
                  <Select
                    value={entityType}
                    onValueChange={(v) => {
                      const next = v as EntityType;
                      if (!availableTypes.includes(next)) return;
                      setEntityType(next);
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {labelForType(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={entityId || ""}
                    onValueChange={(v) => {
                      if (!v) return;
                      setActiveEntityId(v);
                    }}
                    disabled={!entityScopes.length}
                  >
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {entityScopes.map((s) => (
                        <SelectItem key={s.entity_id} value={s.entity_id}>
                          {s.entity_name || s.entity_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => void onRefresh()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </>
            }
          />

          {/* Mobile switcher */}
          <div className="md:hidden mb-6 grid gap-2">
            <div className="grid gap-2 grid-cols-1">
              <Select
                value={entityType}
                onValueChange={(v) => {
                  const next = v as EntityType;
                  if (!availableTypes.includes(next)) return;
                  setEntityType(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Entity type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelForType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={entityId || ""}
                onValueChange={(v) => {
                  if (!v) return;
                  setActiveEntityId(v);
                }}
                disabled={!entityScopes.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {entityScopes.map((s) => (
                    <SelectItem key={s.entity_id} value={s.entity_id}>
                      {s.entity_name || s.entity_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={() => void onRefresh()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Content */}
          {activeTab === "overview" ? (
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-base">Finance overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>
                  Selected: <span className="text-foreground font-medium">{labelForType(entityType)}</span>{" "}
                  {entityName ? <span className="text-foreground font-medium">· {entityName}</span> : null}
                </div>
                <div>Use Recurring to automate utilities/taxes and post them into the ledger.</div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "ledger" ? (
            entityId ? (
              <FinanceLedgerPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Ledger</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to view the ledger.</CardContent>
              </Card>
            )
          ) : null}

          {activeTab === "income" ? (
            entityId ? (
              <IncomeEntriesPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Income</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to manage income.</CardContent>
              </Card>
            )
          ) : null}

          {activeTab === "budgets" ? (
            entityId ? (
              <BudgetsPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Budgets</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to manage budgets.</CardContent>
              </Card>
            )
          ) : null}

          {activeTab === "expenses" ? (
            entityId ? (
              <ExpensesEntriesPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Expenses</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to manage expenses.</CardContent>
              </Card>
            )
          ) : null}

          {activeTab === "supplies" ? (
            entityId ? (
              <SuppliesPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Supplies</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to manage supplies.</CardContent>
              </Card>
            )
          ) : null}

          {activeTab === "recurring" ? (
            entityId ? (
              <RecurringRulesPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Recurring</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to manage recurring rules.</CardContent>
              </Card>
            )
          ) : null}

          {activeTab === "payroll" ? (
            entityId ? (
              <PayrollEntriesPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Payroll</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to manage payroll.</CardContent>
              </Card>
            )
          ) : null}

          {activeTab === "analytics" ? (
            entityId ? (
              <FinanceAnalyticsPanel entityType={entityType as any} entityId={entityId} />
            ) : (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Analytics</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Select an organization to view analytics.</CardContent>
              </Card>
            )
          ) : null}

          {(error || scopeError) && <div className="mt-6 text-sm text-destructive">{error || scopeError}</div>}
        </DashboardShell>
      </div>
    </div>
  );
}
