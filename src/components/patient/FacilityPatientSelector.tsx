import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus } from "lucide-react";
import { CreateFacilityPatientModal, FacilityType } from "./CreateFacilityPatientModal";

export function FacilityPatientSelector({
  facilityType,
  facilityId,
  value,
  onChange,
}: {
  facilityType: FacilityType;
  facilityId: string;
  value?: any; // selected patient row
  onChange: (row: any) => void;
}) {
  const sb = supabase as any; // ✅ key fix

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchPatients = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("facility_patients")
        .select("*")
        .eq("facility_type", facilityType)
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facilityType, facilityId]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return patients;
    return patients.filter((p) => {
      const hay = `${p.full_name || ""} ${p.phone || ""} ${p.email || ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [patients, search]);

  return (
    <>
      <div className="space-y-1">
        <Label>Patient *</Label>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="flex-1 justify-start" onClick={() => setOpen(true)}>
            {value?.full_name ? (
              <span className="truncate">{value.full_name}</span>
            ) : (
              <span className="text-muted-foreground">Select or create patient</span>
            )}
          </Button>

          {value?.phone ? <Badge variant="outline">{value.phone}</Badge> : null}

          <Button type="button" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select patient</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email" />
            </div>
            <Button variant="outline" onClick={fetchPatients} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          <ScrollArea className="h-[420px] border rounded-md mt-3">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No patients found</div>
            ) : (
              <div className="divide-y">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left p-4 hover:bg-muted/50"
                    onClick={() => {
                      onChange(p);
                      setOpen(false);
                    }}
                  >
                    <div className="font-medium">{p.full_name || "Unnamed"}</div>
                    <div className="text-sm text-muted-foreground flex gap-3 flex-wrap mt-1">
                      <span className="font-mono">{p.phone || "—"}</span>
                      <span className="truncate">{p.email || "—"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <CreateFacilityPatientModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        facilityType={facilityType}
        facilityId={facilityId}
        onCreated={(row) => {
          // auto-select new patient
          onChange(row);
          // refresh list if selector dialog is open
          if (open) fetchPatients();
        }}
      />
    </>
  );
}
