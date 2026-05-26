// File: src/components/clinic/ClinicServicesManager.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ClinicService = {
  id: string;
  practice_id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price_cents: number;
  currency: string;
  deposit_required: boolean;
  deposit_cents: number;
  deposit_type: string;
  is_active: boolean;
  category: string | null;
};

interface Props {
  practiceId: string;
}

type FormState = {
  id?: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: string;
  currency: string;
  price: string;
  deposit_required: boolean;
  deposit_type: "fixed" | "percent";
  deposit_value: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  category: "",
  description: "",
  duration_minutes: "30",
  currency: "USD",
  price: "",
  deposit_required: false,
  deposit_type: "fixed",
  deposit_value: "",
  is_active: true,
});

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "TRY", "RUB", "UZS", "JPY", "KRW"];

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseMoney(value: string): number {
  const n = Number((value || "").replace(/,/g, "."));
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export default function ClinicServicesManager({ practiceId }: Props) {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!practiceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_services")
      .select("*")
      .eq("practice_id", practiceId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message || "Failed to load services");
    } else {
      setServices((data || []) as ClinicService[]);
    }
    setLoading(false);
  }, [practiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (svc: ClinicService) => {
    setForm({
      id: svc.id,
      name: svc.name,
      category: svc.category || "",
      description: svc.description || "",
      duration_minutes: String(svc.duration_minutes ?? 30),
      currency: svc.currency,
      price: centsToInput(svc.price_cents),
      deposit_required: svc.deposit_required,
      deposit_type: (svc.deposit_type === "percent" ? "percent" : "fixed") as "fixed" | "percent",
      deposit_value:
        svc.deposit_type === "percent"
          ? String(svc.deposit_cents) // stored as percentage * 1 in cents column convention? keep simple
          : centsToInput(svc.deposit_cents),
      is_active: svc.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    setSaving(true);
    try {
      const price_cents = parseMoney(form.price);
      let deposit_cents = 0;
      if (form.deposit_required) {
        if (form.deposit_type === "percent") {
          const pct = Math.min(100, Math.max(0, Number(form.deposit_value) || 0));
          deposit_cents = Math.round(pct); // store percent as integer 0-100 in deposit_cents
        } else {
          deposit_cents = parseMoney(form.deposit_value);
        }
      }

      const payload = {
        practice_id: practiceId,
        name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        duration_minutes: Number(form.duration_minutes) || 30,
        currency: form.currency,
        price_cents,
        deposit_required: form.deposit_required,
        deposit_type: form.deposit_type,
        deposit_cents,
        is_active: form.is_active,
      };

      if (form.id) {
        const { error } = await supabase
          .from("clinic_services")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast.success("Service updated");
      } else {
        const { error } = await supabase.from("clinic_services").insert(payload);
        if (error) throw error;
        toast.success("Service added");
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (svc: ClinicService, next: boolean) => {
    const { error } = await supabase
      .from("clinic_services")
      .update({ is_active: next })
      .eq("id", svc.id);
    if (error) {
      toast.error(error.message || "Failed to update");
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: next } : s)));
  };

  const handleDelete = async (svc: ClinicService) => {
    if (!confirm(`Delete service "${svc.name}"?`)) return;
    const { error } = await supabase.from("clinic_services").delete().eq("id", svc.id);
    if (error) {
      toast.error(error.message || "Failed to delete");
      return;
    }
    toast.success("Service deleted");
    setServices((prev) => prev.filter((s) => s.id !== svc.id));
  };

  const depositLabel = (svc: ClinicService) => {
    if (!svc.deposit_required) return "—";
    if (svc.deposit_type === "percent") return `${svc.deposit_cents}%`;
    return formatMoney(svc.deposit_cents, svc.currency);
  };

  const empty = useMemo(() => !loading && services.length === 0, [loading, services]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Services & Pricing</CardTitle>
          <CardDescription>
            Manage the services your clinic offers, their pricing, and deposit requirements.
          </CardDescription>
        </div>
        <Button onClick={openCreate} className="gap-2 self-start md:self-auto">
          <Plus className="h-4 w-4" /> Add service
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : empty ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No services yet. Add your first service to start accepting bookings with the right
            pricing and deposit rules.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((svc) => (
                  <TableRow key={svc.id}>
                    <TableCell className="font-medium">
                      {svc.name}
                      {svc.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {svc.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {svc.category ? <Badge variant="secondary">{svc.category}</Badge> : "—"}
                    </TableCell>
                    <TableCell>{svc.duration_minutes ?? 30} min</TableCell>
                    <TableCell>{formatMoney(svc.price_cents, svc.currency)}</TableCell>
                    <TableCell>{depositLabel(svc)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={svc.is_active}
                        onCheckedChange={(v) => handleToggleActive(svc, v)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(svc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(svc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit service" : "Add service"}</DialogTitle>
            <DialogDescription>
              Define the service, its price, and whether patients must pay a deposit to book.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Teeth whitening"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Cosmetic"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_minutes: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Deposit required</Label>
                  <p className="text-xs text-muted-foreground">
                    Require patients to pay a deposit to confirm a booking.
                  </p>
                </div>
                <Switch
                  checked={form.deposit_required}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, deposit_required: v }))}
                />
              </div>
              {form.deposit_required && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={form.deposit_type}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, deposit_type: v as "fixed" | "percent" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                        <SelectItem value="percent">Percent of price</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      {form.deposit_type === "percent" ? "Percent (0–100)" : "Amount"}
                    </Label>
                    <Input
                      type="number"
                      step={form.deposit_type === "percent" ? "1" : "0.01"}
                      min={0}
                      max={form.deposit_type === "percent" ? 100 : undefined}
                      value={form.deposit_value}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, deposit_value: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="text-sm">Active</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
