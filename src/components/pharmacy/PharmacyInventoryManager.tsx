// File: src/components/pharmacy/PharmacyInventoryManager.tsx
// FULL FILE REPLACEMENT

import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { format, differenceInCalendarDays } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

import { usePharmacyInventory, InventoryItem } from "@/hooks/usePharmacyInventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  RefreshCw,
  DollarSign,
  Snowflake,
  ShieldAlert,
  Archive,
  Eye,
  Minus,
  TrendingUp,
  CalendarClock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  pharmacyId: string;
}

type StockFilter = "all" | "low" | "out" | "expiring" | "controlled" | "refrigerated";
type SortBy = "name" | "qty_desc" | "qty_asc" | "value_desc" | "expiry_asc" | "risk";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function money(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function humanize(v?: string | null): string {
  return String(v || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PharmacyInventoryManager({ pharmacyId }: Props) {
  const { t } = useTranslation("pharmacyAdminDashboard");
  const {
    inventory,
    loading,
    lowStockItems,
    expiringItems,
    addInventoryItem,
    updateInventoryItem,
    adjustQuantity,
    deleteInventoryItem,
    fetchInventory,
  } = usePharmacyInventory(pharmacyId);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("risk");
  const [quickAdjustingId, setQuickAdjustingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    medication_name: "",
    medication_code: "",
    ndc_code: "",
    manufacturer: "",
    quantity_on_hand: 0,
    reorder_level: 10,
    unit_cost: 0,
    unit_price: 0,
    expiry_date: "",
    batch_number: "",
    storage_location: "",
    requires_refrigeration: false,
    is_controlled_substance: false,
    controlled_substance_schedule: "",
  });

  const derived = useMemo(() => {
    const now = new Date();

    const rows = inventory.map((item) => {
      const availableQty = Math.max(0, toNumber(item.quantity_on_hand) - toNumber(item.quantity_reserved));
      const onHandQty = toNumber(item.quantity_on_hand);
      const reservedQty = toNumber(item.quantity_reserved);
      const reorderLevel = toNumber(item.reorder_level);
      const unitCost = toNumber(item.unit_cost);
      const unitPrice = toNumber(item.unit_price);
      const costValue = onHandQty * unitCost;
      const retailValue = onHandQty * unitPrice;
      const marginValue = onHandQty * Math.max(0, unitPrice - unitCost);

      const expiry = safeDate(item.expiry_date || null);
      const daysToExpiry = expiry ? differenceInCalendarDays(expiry, now) : null;

      const isLowStock = availableQty <= reorderLevel && onHandQty > 0;
      const isOutOfStock = onHandQty <= 0;
      const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30;
      const isExpired = daysToExpiry !== null && daysToExpiry < 0;

      let riskScore = 0;
      if (isOutOfStock) riskScore += 100;
      if (isLowStock) riskScore += 50;
      if (isExpired) riskScore += 40;
      else if (isExpiringSoon) riskScore += Math.max(5, 30 - Math.max(0, daysToExpiry || 0));
      if (item.is_controlled_substance) riskScore += 5;
      if (item.requires_refrigeration) riskScore += 3;

      return {
        ...item,
        availableQty,
        onHandQty,
        reservedQty,
        reorderLevel,
        unitCost,
        unitPrice,
        costValue,
        retailValue,
        marginValue,
        expiry,
        daysToExpiry,
        isLowStock,
        isOutOfStock,
        isExpiringSoon,
        isExpired,
        riskScore,
      };
    });

    const manufacturers = Array.from(
      new Set(rows.map((r) => (r.manufacturer || "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    const totals = rows.reduce(
      (acc, r) => {
        acc.skus += 1;
        acc.onHandUnits += r.onHandQty;
        acc.availableUnits += r.availableQty;
        acc.reservedUnits += r.reservedQty;
        acc.costValue += r.costValue;
        acc.retailValue += r.retailValue;
        acc.marginValue += r.marginValue;

        if (r.isLowStock) acc.lowStock += 1;
        if (r.isOutOfStock) acc.outOfStock += 1;
        if (r.isExpiringSoon) acc.expiringSoon += 1;
        if (r.isExpired) acc.expired += 1;
        if (r.requires_refrigeration) acc.refrigerated += 1;
        if (r.is_controlled_substance) acc.controlled += 1;

        return acc;
      },
      {
        skus: 0,
        onHandUnits: 0,
        availableUnits: 0,
        reservedUnits: 0,
        costValue: 0,
        retailValue: 0,
        marginValue: 0,
        lowStock: 0,
        outOfStock: 0,
        expiringSoon: 0,
        expired: 0,
        refrigerated: 0,
        controlled: 0,
      },
    );

    const stockHealthPie = [
      { name: "Healthy", value: Math.max(0, rows.length - totals.lowStock - totals.outOfStock) },
      { name: "Low Stock", value: totals.lowStock },
      { name: "Out of Stock", value: totals.outOfStock },
      { name: "Expiring Soon", value: totals.expiringSoon },
    ].filter((x) => x.value > 0);

    const topValueItems = [...rows]
      .sort((a, b) => b.retailValue - a.retailValue)
      .slice(0, 8)
      .map((r) => ({
        name: r.medication_name.length > 18 ? `${r.medication_name.slice(0, 18)}…` : r.medication_name,
        value: Number(r.retailValue.toFixed(2)),
      }));

    const manufacturerCounts = rows.reduce<Record<string, number>>((acc, r) => {
      const key = r.manufacturer || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const manufacturerBar = Object.entries(manufacturerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({
        name: name.length > 16 ? `${name.slice(0, 16)}…` : name,
        value,
      }));

    const expiryBuckets = [
      { key: "Expired", label: "Expired", count: 0 },
      { key: "0-7d", label: "0–7d", count: 0 },
      { key: "8-30d", label: "8–30d", count: 0 },
      { key: "31-90d", label: "31–90d", count: 0 },
      { key: "90d+", label: "90d+", count: 0 },
      { key: "No expiry", label: "No expiry", count: 0 },
    ];

    rows.forEach((r) => {
      const d = r.daysToExpiry;
      if (d === null) {
        expiryBuckets.find((b) => b.key === "No expiry")!.count += 1;
      } else if (d < 0) {
        expiryBuckets.find((b) => b.key === "Expired")!.count += 1;
      } else if (d <= 7) {
        expiryBuckets.find((b) => b.key === "0-7d")!.count += 1;
      } else if (d <= 30) {
        expiryBuckets.find((b) => b.key === "8-30d")!.count += 1;
      } else if (d <= 90) {
        expiryBuckets.find((b) => b.key === "31-90d")!.count += 1;
      } else {
        expiryBuckets.find((b) => b.key === "90d+")!.count += 1;
      }
    });

    const expiryTrend = [...rows]
      .filter((r) => r.expiry && r.daysToExpiry !== null && r.daysToExpiry! >= 0)
      .sort((a, b) => (a.expiry!.getTime() - b.expiry!.getTime()))
      .slice(0, 15)
      .map((r) => ({
        date: format(r.expiry!, "MMM d"),
        count: 1,
        qty: r.onHandQty,
      }));

    return {
      rows,
      manufacturers,
      totals,
      stockHealthPie,
      topValueItems,
      manufacturerBar,
      expiryBuckets,
      expiryTrend,
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = derived.rows.filter((item) => {
      const hay = [
        item.medication_name,
        item.medication_code || "",
        item.ndc_code || "",
        item.manufacturer || "",
        item.batch_number || "",
        item.storage_location || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || hay.includes(q);
      const matchesManufacturer =
        manufacturerFilter === "all" || (item.manufacturer || "Unknown") === manufacturerFilter;

      let matchesStockFilter = true;
      switch (stockFilter) {
        case "low":
          matchesStockFilter = item.isLowStock;
          break;
        case "out":
          matchesStockFilter = item.isOutOfStock;
          break;
        case "expiring":
          matchesStockFilter = item.isExpiringSoon || item.isExpired;
          break;
        case "controlled":
          matchesStockFilter = item.is_controlled_substance;
          break;
        case "refrigerated":
          matchesStockFilter = item.requires_refrigeration;
          break;
        default:
          matchesStockFilter = true;
      }

      return matchesSearch && matchesManufacturer && matchesStockFilter;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.medication_name.localeCompare(b.medication_name);
        case "qty_desc":
          return b.onHandQty - a.onHandQty;
        case "qty_asc":
          return a.onHandQty - b.onHandQty;
        case "value_desc":
          return b.retailValue - a.retailValue;
        case "expiry_asc": {
          const aTime = a.expiry ? a.expiry.getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.expiry ? b.expiry.getTime() : Number.POSITIVE_INFINITY;
          return aTime - bTime;
        }
        case "risk":
        default:
          return b.riskScore - a.riskScore || a.medication_name.localeCompare(b.medication_name);
      }
    });
  }, [derived.rows, manufacturerFilter, searchTerm, sortBy, stockFilter]);

  const resetForm = () => {
    setFormData({
      medication_name: "",
      medication_code: "",
      ndc_code: "",
      manufacturer: "",
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_cost: 0,
      unit_price: 0,
      expiry_date: "",
      batch_number: "",
      storage_location: "",
      requires_refrigeration: false,
      is_controlled_substance: false,
      controlled_substance_schedule: "",
    });
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    if (!formData.medication_name.trim()) {
      toast.error("Medication name is required");
      return;
    }

    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, formData);
      } else {
        await addInventoryItem(formData);
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch {
      // handled in hook
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      medication_name: item.medication_name,
      medication_code: item.medication_code || "",
      ndc_code: item.ndc_code || "",
      manufacturer: item.manufacturer || "",
      quantity_on_hand: item.quantity_on_hand,
      reorder_level: item.reorder_level,
      unit_cost: toNumber(item.unit_cost),
      unit_price: toNumber(item.unit_price),
      expiry_date: item.expiry_date || "",
      batch_number: item.batch_number || "",
      storage_location: item.storage_location || "",
      requires_refrigeration: item.requires_refrigeration,
      is_controlled_substance: item.is_controlled_substance,
      controlled_substance_schedule: item.controlled_substance_schedule || "",
    });
    setEditingItem(item);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this inventory item?")) {
      await deleteInventoryItem(id);
      if (selectedItem?.id === id) {
        setIsDetailsOpen(false);
        setSelectedItem(null);
      }
    }
  };

  const handleQuickAdjust = async (id: string, delta: number) => {
    setQuickAdjustingId(id);
    try {
      await adjustQuantity(id, delta);
    } finally {
      setQuickAdjustingId(null);
    }
  };

  const openDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Inventory Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Inventory control, stock health monitoring, and pharmacy supply analytics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchInventory()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}</DialogTitle>
                  <DialogDescription>
                    {editingItem
                      ? "Update medication stock, pricing, and storage details"
                      : "Add a medication/product to your pharmacy inventory"}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Medication Name *</Label>
                      <Input
                        value={formData.medication_name}
                        onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                        placeholder="Amoxicillin 500mg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Medication Code</Label>
                      <Input
                        value={formData.medication_code}
                        onChange={(e) => setFormData({ ...formData, medication_code: e.target.value })}
                        placeholder="AMX-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>NDC Code</Label>
                      <Input
                        value={formData.ndc_code}
                        onChange={(e) => setFormData({ ...formData, ndc_code: e.target.value })}
                        placeholder="12345-6789-01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Manufacturer</Label>
                      <Input
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        placeholder="Pfizer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity On Hand *</Label>
                      <Input
                        type="number"
                        value={formData.quantity_on_hand}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity_on_hand: parseInt(e.target.value || "0", 10) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reorder Level</Label>
                      <Input
                        type="number"
                        value={formData.reorder_level}
                        onChange={(e) =>
                          setFormData({ ...formData, reorder_level: parseInt(e.target.value || "0", 10) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit Cost ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.unit_cost}
                        onChange={(e) =>
                          setFormData({ ...formData, unit_cost: parseFloat(e.target.value || "0") || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={(e) =>
                          setFormData({ ...formData, unit_price: parseFloat(e.target.value || "0") || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input
                        value={formData.batch_number}
                        onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                        placeholder="BATCH-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Storage Location</Label>
                      <Input
                        value={formData.storage_location}
                        onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                        placeholder="Shelf A-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <Label>Requires Refrigeration</Label>
                    <Switch
                      checked={formData.requires_refrigeration}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requires_refrigeration: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <Label>Controlled Substance</Label>
                    <Switch
                      checked={formData.is_controlled_substance}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_controlled_substance: checked })
                      }
                    />
                  </div>

                  {formData.is_controlled_substance && (
                    <div className="space-y-2">
                      <Label>DEA Schedule</Label>
                      <Select
                        value={formData.controlled_substance_schedule}
                        onValueChange={(value) =>
                          setFormData({ ...formData, controlled_substance_schedule: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="II">Schedule II</SelectItem>
                          <SelectItem value="III">Schedule III</SelectItem>
                          <SelectItem value="IV">Schedule IV</SelectItem>
                          <SelectItem value="V">Schedule V</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>{editingItem ? "Update Item" : "Add Item"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">SKUs</p>
                  <p className="text-2xl font-bold">{derived.totals.skus}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {derived.totals.onHandUnits.toLocaleString()} units on hand
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Archive className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={derived.totals.lowStock + derived.totals.outOfStock > 0 ? "border-yellow-500/30" : undefined}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Risk</p>
                  <p className="text-2xl font-bold">
                    {derived.totals.lowStock + derived.totals.outOfStock}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {derived.totals.lowStock} low • {derived.totals.outOfStock} out
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Retail Value</p>
                  <p className="text-2xl font-bold">{money(derived.totals.retailValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cost basis {money(derived.totals.costValue)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={derived.totals.expiringSoon + derived.totals.expired > 0 ? "border-orange-500/30" : undefined}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Expiry Risk</p>
                  <p className="text-2xl font-bold">{derived.totals.expiringSoon + derived.totals.expired}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {derived.totals.expiringSoon} soon • {derived.totals.expired} expired
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <CalendarClock className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Potential Gross Margin</p>
                  <p className="text-xl font-bold">{money(derived.totals.marginValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Available / Reserved</p>
                  <p className="text-xl font-bold">
                    {derived.totals.availableUnits.toLocaleString()} / {derived.totals.reservedUnits.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Controlled Substances</p>
                  <p className="text-xl font-bold">{derived.totals.controlled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Snowflake className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Refrigerated Items</p>
                  <p className="text-xl font-bold">{derived.totals.refrigerated}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Health</CardTitle>
              <CardDescription>Healthy vs risk categories</CardDescription>
            </CardHeader>
            <CardContent>
              {derived.stockHealthPie.length === 0 ? (
                <div className="text-sm text-muted-foreground">No inventory data yet.</div>
              ) : (
                <>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={derived.stockHealthPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                          {derived.stockHealthPie.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 mt-2">
                    {derived.stockHealthPie.map((row, i) => (
                      <div key={row.name} className="flex items-center justify-between text-sm gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="truncate text-muted-foreground">{row.name}</span>
                        </div>
                        <span className="font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Top Inventory by Retail Value</CardTitle>
              <CardDescription>Highest-value items currently on hand</CardDescription>
            </CardHeader>
            <CardContent>
              {derived.topValueItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No valuation data available.</div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={derived.topValueItems}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [money(toNumber(v)), "Retail Value"]} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Expiry Distribution</CardTitle>
              <CardDescription>Expiry buckets for stock monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={derived.expiryBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [toNumber(v), "Items"]} />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manufacturer Coverage</CardTitle>
              <CardDescription>Top manufacturers by SKU count</CardDescription>
            </CardHeader>
            <CardContent>
              {derived.manufacturerBar.length === 0 ? (
                <div className="text-sm text-muted-foreground">No manufacturer data available.</div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={derived.manufacturerBar}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [toNumber(v), "SKUs"]} />
                      <Legend />
                      <Line type="monotone" dataKey="value" name="SKUs" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters + table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Inventory Ledger
            </CardTitle>
            <CardDescription>
              Search, filter, and manage stock levels with quick adjustments
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
              <div className="relative lg:col-span-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search medication, code, NDC, batch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="lg:col-span-3">
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Stock filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All inventory</SelectItem>
                    <SelectItem value="low">Low stock</SelectItem>
                    <SelectItem value="out">Out of stock</SelectItem>
                    <SelectItem value="expiring">Expiring / expired</SelectItem>
                    <SelectItem value="controlled">Controlled substance</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-3">
                <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All manufacturers</SelectItem>
                    {derived.manufacturers.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk">Sort: Risk</SelectItem>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="qty_desc">Sort: Qty High→Low</SelectItem>
                    <SelectItem value="qty_asc">Sort: Qty Low→High</SelectItem>
                    <SelectItem value="value_desc">Sort: Value</SelectItem>
                    <SelectItem value="expiry_asc">Sort: Expiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">Low stock: {lowStockItems.length}</Badge>
              <Badge variant="outline">Expiring ≤30d: {expiringItems.length}</Badge>
              <Badge variant="outline">Showing: {filteredInventory.length}</Badge>
              {stockFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setStockFilter("all")}>
                  Clear stock filter
                </Button>
              )}
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medication</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {inventory.length === 0 ? "No inventory items yet" : "No items match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => (
                      <TableRow key={item.id} className={item.isOutOfStock || item.isLowStock ? "bg-yellow-500/5" : undefined}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{item.medication_name}</p>
                            <div className="text-xs text-muted-foreground">
                              {item.medication_code || "—"} {item.ndc_code ? `• NDC ${item.ndc_code}` : ""}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div>{item.manufacturer || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.storage_location || "No location"}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium">
                              {item.onHandQty.toLocaleString()} on hand
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.availableQty.toLocaleString()} available • {item.reservedQty.toLocaleString()} reserved
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Reorder at {item.reorderLevel.toLocaleString()}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div>Cost {money(item.unitCost)}</div>
                            <div className="text-muted-foreground">Price {money(item.unitPrice)}</div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium">{money(item.retailValue)}</div>
                            <div className="text-xs text-muted-foreground">
                              Cost {money(item.costValue)}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {item.expiry ? (
                            <div className="space-y-1 text-sm">
                              <div className={item.isExpired ? "text-destructive font-medium" : item.isExpiringSoon ? "text-orange-600 font-medium" : ""}>
                                {format(item.expiry, "yyyy-MM-dd")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.daysToExpiry! < 0
                                  ? `${Math.abs(item.daysToExpiry!)} day(s) ago`
                                  : `${item.daysToExpiry} day(s)`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.isOutOfStock && <Badge variant="destructive" className="text-xs">Out</Badge>}
                            {!item.isOutOfStock && item.isLowStock && (
                              <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-700 bg-yellow-500/10">
                                Low
                              </Badge>
                            )}
                            {item.isExpired && (
                              <Badge variant="destructive" className="text-xs">Expired</Badge>
                            )}
                            {!item.isExpired && item.isExpiringSoon && (
                              <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-700 bg-orange-500/10">
                                Expiring
                              </Badge>
                            )}
                            {item.is_controlled_substance && (
                              <Badge variant="secondary" className="text-xs">
                                C-{item.controlled_substance_schedule || "?"}
                              </Badge>
                            )}
                            {item.requires_refrigeration && (
                              <Badge variant="outline" className="text-xs">❄️ Cold</Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetails(item)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={quickAdjustingId === item.id || item.onHandQty <= 0}
                              onClick={() => handleQuickAdjust(item.id, -1)}
                              title="Decrease by 1"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={quickAdjustingId === item.id}
                              onClick={() => handleQuickAdjust(item.id, +1)}
                              title="Increase by 1"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>

                            <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Inventory totals: {derived.totals.skus} SKU(s), {derived.totals.onHandUnits.toLocaleString()} on-hand units,{" "}
              {money(derived.totals.retailValue)} estimated retail value.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Inventory Item Details</DialogTitle>
            <DialogDescription>
              {selectedItem ? `${selectedItem.medication_name} • ${selectedItem.id}` : "Inventory item"}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (() => {
            const onHand = toNumber(selectedItem.quantity_on_hand);
            const reserved = toNumber(selectedItem.quantity_reserved);
            const available = Math.max(0, onHand - reserved);
            const reorder = toNumber(selectedItem.reorder_level);
            const unitCost = toNumber(selectedItem.unit_cost);
            const unitPrice = toNumber(selectedItem.unit_price);
            const expiry = safeDate(selectedItem.expiry_date || null);
            const days = expiry ? differenceInCalendarDays(expiry, new Date()) : null;
            const low = available <= reorder && onHand > 0;
            const out = onHand <= 0;
            const expired = days !== null && days < 0;
            const expiring = days !== null && days <= 30;

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  {out && <Badge variant="destructive">Out of stock</Badge>}
                  {!out && low && (
                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-700 bg-yellow-500/10">
                      Low stock
                    </Badge>
                  )}
                  {expired && <Badge variant="destructive">Expired</Badge>}
                  {!expired && expiring && (
                    <Badge variant="outline" className="border-orange-500/30 text-orange-700 bg-orange-500/10">
                      Expiring soon
                    </Badge>
                  )}
                  {selectedItem.is_controlled_substance && (
                    <Badge variant="secondary">
                      Controlled {selectedItem.controlled_substance_schedule ? `(${selectedItem.controlled_substance_schedule})` : ""}
                    </Badge>
                  )}
                  {selectedItem.requires_refrigeration && <Badge variant="outline">Refrigerated</Badge>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="font-medium">Medication Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Medication</span>
                        <span className="font-medium">{selectedItem.medication_name}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Code</span>
                        <span>{selectedItem.medication_code || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">NDC</span>
                        <span>{selectedItem.ndc_code || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Manufacturer</span>
                        <span>{selectedItem.manufacturer || "Unknown"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Batch</span>
                        <span>{selectedItem.batch_number || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="font-medium">Storage & Compliance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          Storage Location
                        </span>
                        <span>{selectedItem.storage_location || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Refrigeration</span>
                        <span>{selectedItem.requires_refrigeration ? "Required" : "No"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Controlled Substance</span>
                        <span>
                          {selectedItem.is_controlled_substance
                            ? `Yes${selectedItem.controlled_substance_schedule ? ` (${selectedItem.controlled_substance_schedule})` : ""}`
                            : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Expiry Date</span>
                        <span>{expiry ? format(expiry, "yyyy-MM-dd") : "—"}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Expiry Window</span>
                        <span>
                          {days === null ? "No expiry" : days < 0 ? `${Math.abs(days)} day(s) overdue` : `${days} day(s) left`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-4">Stock & Valuation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">On Hand</span>
                      <span className="font-medium">{onHand.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Reserved</span>
                      <span className="font-medium">{reserved.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Available</span>
                      <span className="font-medium">{available.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Reorder Level</span>
                      <span className="font-medium">{reorder.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Unit Cost</span>
                      <span className="font-medium">{money(unitCost)}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Unit Price</span>
                      <span className="font-medium">{money(unitPrice)}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Cost Value</span>
                      <span className="font-medium">{money(onHand * unitCost)}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Retail Value</span>
                      <span className="font-medium">{money(onHand * unitPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            {selectedItem && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleQuickAdjust(selectedItem.id, -1)}
                  disabled={quickAdjustingId === selectedItem.id || toNumber(selectedItem.quantity_on_hand) <= 0}
                >
                  <Minus className="h-4 w-4 mr-1" />
                  -1
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickAdjust(selectedItem.id, +1)}
                  disabled={quickAdjustingId === selectedItem.id}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  +1
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleEdit(selectedItem);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
