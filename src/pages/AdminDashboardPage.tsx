// src/pages/AdminDashboardPage.tsx
// File: src/pages/AdminDashboardPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TransactionsTable } from "@/components/admin/TransactionsTable";

import { Shield, CreditCard, Settings } from "lucide-react";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("transactions");

  const tabs = useMemo(
    () => [
      { id: "transactions", label: "Transactions", icon: <CreditCard className="h-4 w-4" /> },
      { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
    [],
  );

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Billing, verification, and platform operations</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-2">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <TransactionsTable />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <EmptyState
            title="Admin settings"
            description="Use the global Settings page for account + security settings."
            action={{ label: "Open Settings", onClick: () => navigate("/settings") }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
