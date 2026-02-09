// File: src/components/financial/FinanceCategorySelect.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Tag } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type CategoryRow = {
  id: string;
  name: string;
  color: string | null;
};

export default function FinanceCategorySelect(props: {
  entityType: FinanceEntityType;
  entityId: string;
  label?: string;
  value: string; // "all" or category id
  onChange: (value: string) => void;
  includeAll?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const {
    entityType,
    entityId,
    label = "Category",
    value,
    onChange,
    includeAll = true,
    disabled = false,
    placeholder = includeAll ? "All categories" : "Select category",
  } = props;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CategoryRow[]>([]);

  const canLoad = useMemo(() => Boolean(entityId && entityType), [entityId, entityType]);

  useEffect(() => {
    const run = async () => {
      if (!canLoad) {
        setRows([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("finance_categories")
          .select("id,name,color")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("name", { ascending: true });

        if (error) throw error;
        setRows((data || []) as any[]);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [canLoad, entityType, entityId]);

  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>

      <Select value={value} onValueChange={onChange} disabled={disabled || !canLoad || loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAll ? <SelectItem value="all">All categories</SelectItem> : null}

          {rows.length === 0 ? (
            <SelectItem value="__none__" disabled>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                "No categories yet"
              )}
            </SelectItem>
          ) : (
            rows.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
