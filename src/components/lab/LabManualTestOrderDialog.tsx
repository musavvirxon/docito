import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, TestTube, Search, X } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { FacilityPatientSelector, type SelectedPatient } from "@/components/patient/FacilityPatientSelector";

type TestCatalogRow = {
  id: string;
  test_code: string;
  name: string;
  category: string;
  sample_type: string | null;
  turnaround_hours: number | null;
  price: number | null;
  requires_fasting: boolean | null;
};

export function LabManualTestOrderDialog({
  open,
  onOpenChange,
  labCenterId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  labCenterId: string;
  onCreated?: () => void;
}) {
  const [patient, setPatient] = useState<SelectedPatient | null>(null);

  const [catalog, setCatalog] = useState<TestCatalogRow[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  const [priority, setPriority] = useState<string>("routine");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !labCenterId) return;
    const load = async () => {
      setLoadingCatalog(true);
      try {
        const { data, error } = await supabase
          .from("test_catalog")
          .select("id, test_code, name, category, sample_type, turnaround_hours, price, requires_fasting")
          .eq("lab_center_id", labCenterId)
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        setCatalog((data ?? []) as any);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load test catalog");
      } finally {
        setLoadingCatalog(false);
      }
    };
    load();
  }, [open, labCenterId]);

  const categories = useMemo(() => {
    return Array.from(new Set(catalog.map((t) => t.category))).filter(Boolean);
  }, [catalog]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return catalog.filter((t) => {
      const matchesSearch =
        !s ||
        t.name.toLowerCase().includes(s) ||
        (t.test_code || "").toLowerCase().includes(s);
      const matchesCat = category === "all" || t.category === category;
      return matchesSearch && matchesCat;
    });
  }, [catalog, search, category]);

  const selectedDetails = useMemo(() => {
    return catalog.filter((t) => selectedTests.includes(t.id));
  }, [catalog, selectedTests]);

  const totalPrice = useMemo(() => {
    return selectedDetails.reduce((sum, t) => sum + (t.price || 0), 0);
  }, [selectedDetails]);

  const toggleTest = (id: string) => {
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    setPatient(null);
    setSearch("");
    setCategory("all");
    setSelectedTests([]);
    setPriority("routine");
    setClinicalNotes("");
  };

  const createOrder = async () => {
    if (!labCenterId) return toast.error("Missing lab center");
    if (!patient) return toast.error("Select a patient");
    if (selectedTests.length === 0) return toast.error("Select at least 1 test");

    setSaving(true);
    try {
      // 1) create test_orders row
      const orderPayload: any = {
        lab_center_id: labCenterId,
        priority,
        clinical_notes: clinicalNotes || null,
        status: "pending",
        total_amount: totalPrice,
        payment_status: "pending",
      };

      if (patient.kind === "registered") {
        orderPayload.patient_id = patient.patient_id;
        orderPayload.patient_name = patient.full_name;
        orderPayload.patient_phone = patient.phone;
        orderPayload.patient_email = patient.email;
      } else {
        orderPayload.facility_patient_id = patient.facility_patient_id;
        orderPayload.patient_name = patient.full_name;
        orderPayload.patient_phone = patient.phone;
        orderPayload.patient_email = patient.email;
      }

      const { data: order, error: orderError } = await supabase
        .from("test_orders")
        .insert(orderPayload)
        .select("*")
        .single();

      if (orderError) throw orderError;

      // 2) create test_order_items
      const items = selectedTests.map((testId) => ({
        test_order_id: order.id,
        test_id: testId,
      }));

      const { error: itemsError } = await supabase.from("test_order_items").insert(items);
      if (itemsError) throw itemsError;

      toast.success("Manual test order created");
      onCreated?.();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            New walk-in / manual test order
          </DialogTitle>
          <DialogDescription>
            Create a lab order for a registered patient or a walk-in patient (no account required).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: patient + catalog */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient</CardTitle>
              </CardHeader>
              <CardContent>
                <FacilityPatientSelector
                  facilityType="lab"
                  facilityId={labCenterId}
                  value={patient}
                  onChange={setPatient}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Choose tests</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 mt-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 opacity-60" />
                    <Input
                      className="pl-9"
                      placeholder="Search tests..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-[360px]">
                  {loadingCatalog ? (
                    <div className="p-6 text-center text-muted-foreground">Loading tests…</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">No tests found</div>
                  ) : (
                    <div className="divide-y">
                      {filtered.map((t) => (
                        <div
                          key={t.id}
                          className={`p-4 hover:bg-muted/50 cursor-pointer ${
                            selectedTests.includes(t.id) ? "bg-primary/5" : ""
                          }`}
                          onClick={() => toggleTest(t.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox checked={selectedTests.includes(t.id)} onCheckedChange={() => toggleTest(t.id)} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{t.name}</span>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {t.test_code}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {t.category}
                                {t.sample_type ? ` • ${t.sample_type}` : ""}
                                {t.turnaround_hours ? ` • ${t.turnaround_hours}h` : ""}
                              </div>
                              {t.requires_fasting ? (
                                <Badge variant="secondary" className="mt-2 text-xs">
                                  Requires fasting
                                </Badge>
                              ) : null}
                            </div>
                            {typeof t.price === "number" ? <span className="font-medium">${t.price}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Selected tests ({selectedTests.length})</Label>
                  {selectedDetails.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">No tests selected</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {selectedDetails.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{t.name}</span>
                          <div className="flex items-center gap-2">
                            {typeof t.price === "number" ? <span className="text-muted-foreground">${t.price}</span> : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleTest(t.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Clinical notes (optional)</Label>
                  <Textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Reason, symptoms, special instructions..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Estimated total</span>
                  <span className="font-bold">${totalPrice.toFixed(2)}</span>
                </div>

                <Button onClick={createOrder} disabled={saving} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {saving ? "Creating..." : "Create order"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
