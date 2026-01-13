import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  CreateFacilityPatientModal,
  type FacilityType,
  type FacilityPatientRow,
} from "./CreateFacilityPatientModal";

export type SelectedPatient =
  | {
      kind: "registered";
      patient_id: string; // profiles.user_id
      full_name: string;
      email: string | null;
      phone: string | null;
    }
  | {
      kind: "walkin";
      facility_patient_id: string;
      full_name: string;
      email: string | null;
      phone: string;
    };

type RegisteredPatientRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export function FacilityPatientSelector({
  facilityType,
  facilityId,
  value,
  onChange,
}: {
  facilityType: FacilityType;
  facilityId: string;
  value: SelectedPatient | null;
  onChange: (p: SelectedPatient | null) => void;
}) {
  const [tab, setTab] = useState<"registered" | "walkin">("registered");

  // registered search
  const [rq, setRq] = useState("");
  const [rloading, setRloading] = useState(false);
  const [rresults, setRresults] = useState<SelectedPatient[]>([]);

  // walk-in search
  const [wq, setWq] = useState("");
  const [wloading, setWloading] = useState(false);
  const [wresults, setWresults] = useState<SelectedPatient[]>([]);

  const [createOpen, setCreateOpen] = useState(false);

  const canSearchRegistered = useMemo(() => rq.trim().length >= 2, [rq]);
  const canSearchWalkin = useMemo(() => wq.trim().length >= 2, [wq]);

  useEffect(() => {
    setRresults([]);
    setWresults([]);
  }, [facilityId, facilityType]);

  const searchRegistered = async () => {
    if (!canSearchRegistered) return;
    setRloading(true);
    try {
      const term = rq.trim();
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .eq("role", "patient")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;

      const mapped = (data ?? []).map((p: any) => {
        const row = p as RegisteredPatientRow;
        return {
          kind: "registered" as const,
          patient_id: row.user_id,
          full_name: row.full_name ?? "Unknown",
          email: row.email,
          phone: row.phone,
        };
      });

      setRresults(mapped);
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setRloading(false);
    }
  };

  const searchWalkin = async () => {
    if (!canSearchWalkin) return;
    setWloading(true);
    try {
      const term = wq.trim();
      const { data, error } = await supabase
        .from("facility_patients")
        .select("id, full_name, email, phone")
        .eq("facility_type", facilityType)
        .eq("facility_id", facilityId)
        .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;

      const mapped = (data ?? []).map((p: any) => ({
        kind: "walkin" as const,
        facility_patient_id: p.id,
        full_name: p.full_name,
        email: p.email ?? null,
        phone: p.phone,
      }));

      setWresults(mapped);
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setWloading(false);
    }
  };

  const pick = (p: SelectedPatient) => onChange(p);

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="registered">Registered</TabsTrigger>
          <TabsTrigger value="walkin">Walk-in</TabsTrigger>
        </TabsList>

        <TabsContent value="registered" className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 opacity-60" />
              <Input
                value={rq}
                onChange={(e) => setRq(e.target.value)}
                placeholder="Search by name / phone / email…"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchRegistered();
                  }
                }}
              />
            </div>
            <Button type="button" onClick={searchRegistered} disabled={!canSearchRegistered || rloading}>
              {rloading ? "..." : "Search"}
            </Button>
          </div>

          <div className="space-y-2">
            {rresults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {canSearchRegistered ? "No results yet. Try searching." : "Type at least 2 characters to search."}
              </p>
            ) : (
              rresults.map((p) => (
                <Card
                  key={(p as any).patient_id}
                  className={`p-3 cursor-pointer hover:bg-muted ${
                    value && value.kind === "registered" && value.patient_id === (p as any).patient_id
                      ? "border-primary"
                      : ""
                  }`}
                  onClick={() => pick(p)}
                >
                  <div className="font-medium">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[p.email, p.phone].filter(Boolean).join(" • ") || "—"}
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="walkin" className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 opacity-60" />
              <Input
                value={wq}
                onChange={(e) => setWq(e.target.value)}
                placeholder="Search walk-in by name / phone…"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchWalkin();
                  }
                }}
              />
            </div>
            <Button type="button" onClick={searchWalkin} disabled={!canSearchWalkin || wloading}>
              {wloading ? "..." : "Search"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {wresults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {canSearchWalkin ? "No results yet. Try searching." : "Type at least 2 characters to search."}
              </p>
            ) : (
              wresults.map((p) => (
                <Card
                  key={(p as any).facility_patient_id}
                  className={`p-3 cursor-pointer hover:bg-muted ${
                    value && value.kind === "walkin" && value.facility_patient_id === (p as any).facility_patient_id
                      ? "border-primary"
                      : ""
                  }`}
                  onClick={() => pick(p)}
                >
                  <div className="font-medium">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[p.email, p.phone].filter(Boolean).join(" • ") || "—"}
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CreateFacilityPatientModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        facilityType={facilityType}
        facilityId={facilityId}
        onCreated={(p: FacilityPatientRow) => {
          const selected: SelectedPatient = {
            kind: "walkin",
            facility_patient_id: p.id,
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
          };
          onChange(selected);
          setTab("walkin");
          // refresh list (nice UX)
          setWq(p.phone);
          setWresults([selected]);
        }}
      />
    </div>
  );
}
