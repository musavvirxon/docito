// File: src/components/financial/FinanceCategoriesManager.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Loader2, Plus, RefreshCcw, Tag, Trash2, Save } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type CategoryRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  color: string | null;
  created_at?: string;
  updated_at?: string;
};

function normalizeHex(input: string) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (s.startsWith("#")) return s;
  return `#${s}`;
}

function isHexColor(input: string) {
  const s = normalizeHex(input);
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function FinanceCategoriesManager(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("");

  const canLoad = useMemo(() => Boolean(entityId && entityType), [entityId, entityType]);
  const canCreate = useMemo(() => {
    if (!canLoad) return false;
    if (!newName.trim()) return false;
    if (newColor.trim() && !isHexColor(newColor)) return false;
    return true;
  }, [canLoad, newName, newColor]);

  const fetchCategories = async () => {
    if (!canLoad) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("id,entity_type,entity_id,name,color,created_at,updated_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("name", { ascending: true });

      if (error) throw error;
      setRows((data || []) as any[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load categories");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const createCategory = async () => {
    if (!canCreate) return;

    try {
      setSavingId("__new__");
      const color = newColor.trim() ? normalizeHex(newColor.trim()) : null;

      const { error } = await supabase.from("finance_categories").insert({
        entity_type: entityType,
        entity_id: entityId,
        name: newName.trim(),
        color,
      });

      if (error) throw error;

      toast.success("Category created");
      setNewName("");
      setNewColor("");
      await fetchCategories();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create category");
    } finally {
      setSavingId(null);
    }
  };

  const updateCategory = async (id: string, name: string, color: string) => {
    const nextName = name.trim();
    const nextColor = color.trim() ? normalizeHex(color.trim()) : null;

    if (!nextName) {
      toast.error("Category name is required");
      return;
    }
    if (color.trim() && !isHexColor(color)) {
      toast.error("Color must be a 6-digit hex value (e.g. #0da2e7)");
      return;
    }

    setSavingId(id);
    try {
      const { error } = await supabase.from("finance_categories").update({ name: nextName, color: nextColor }).eq("id", id);
      if (error) throw error;

      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name: nextName, color: nextColor } : r)));
      toast.success("Category updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update category");
    } finally {
      setSavingId(null);
    }
  };

  const deleteCategory = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("finance_categories").delete().eq("id", id);
      if (error) throw error;

      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Category deleted");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="rounded-xl border-muted">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          Categories
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Create categories like Supplies, Taxes, Utilities, Salaries, and Commissions. Use them for filtering and analytics.
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="space-y-1 md:col-span-7">
            <Label>Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Supplies" />
          </div>

          <div className="space-y-1 md:col-span-3">
            <Label>Color (optional)</Label>
            <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="#0da2e7" />
          </div>

          <div className="md:col-span-2 flex items-end">
            <Button
              onClick={() => void createCategory()}
              disabled={!canCreate || savingId === "__new__"}
              className="gap-2 w-full"
            >
              {savingId === "__new__" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Your categories</div>
          <Button variant="outline" size="sm" onClick={() => void fetchCategories()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No categories yet. Add one above.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <CategoryRowEditor
                key={r.id}
                row={r}
                saving={savingId === r.id}
                deleting={deletingId === r.id}
                onSave={(name, color) => void updateCategory(r.id, name, color)}
                onDelete={() => void deleteCategory(r.id)}
              />
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Tip: set a consistent naming convention so reports are clean (e.g., “Utilities: Electricity”, “Utilities: Water”).
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryRowEditor(props: {
  row: CategoryRow;
  saving: boolean;
  deleting: boolean;
  onSave: (name: string, color: string) => void;
  onDelete: () => void;
}) {
  const { row, saving, deleting, onSave, onDelete } = props;

  const [name, setName] = useState(row.name || "");
  const [color, setColor] = useState(row.color || "");

  useEffect(() => {
    setName(row.name || "");
    setColor(row.color || "");
  }, [row.id, row.name, row.color]);

  const dirty = useMemo(() => {
    const a = (row.name || "").trim();
    const b = name.trim();
    const ac = (row.color || "").trim();
    const bc = color.trim();
    return a !== b || ac !== bc;
  }, [row.name, row.color, name, color]);

  return (
    <div className="p-3 rounded-xl border bg-muted/30">
      <div className="grid gap-3 md:grid-cols-12 items-end">
        <div className="space-y-1 md:col-span-7">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1 md:col-span-3">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex items-center gap-2">
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#0da2e7" />
            <div
              className="h-9 w-9 rounded-md border"
              style={{ background: isHexColor(color) ? normalizeHex(color) : "transparent" }}
              title={isHexColor(color) ? normalizeHex(color) : "Invalid color"}
            />
          </div>
        </div>

        <div className="md:col-span-2 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onSave(name, color)}
            disabled={!dirty || saving || deleting}
            className="gap-2 w-full"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            disabled={saving || deleting}
            className="gap-2 w-full"
            title="Delete category"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
