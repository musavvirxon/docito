import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PERMANENT_TEETH, PRIMARY_TEETH } from "./types";
import { CreateChargeFromProcedureDialog } from "@/components/patient/CreateChargeFromProcedureDialog";

export type DentitionType = "permanent" | "primary";

export interface ToothChartProcedure {
  id: string;
  tooth_numbers?: number[] | null;
  status: string;
  cost?: number | null;
  procedure?: {
    name?: string | null;
    category?: string | null;
    default_cost?: number | null;
    price?: number | null;
  } | null;
}

interface Props {
  planId: string;
  dentitionType: DentitionType;
  procedures: ToothChartProcedure[];
  readOnly?: boolean;
  onChanged?: () => void;
}

/** 6 chart buckets + fallback, mapped from free-text procedure categories. */
const CATEGORY_BUCKETS: { key: string; token: string; match: string[] }[] = [
  { key: "restorative", token: "--dtc-1", match: ["restor", "filling", "composite", "bond"] },
  { key: "extraction", token: "--dtc-2", match: ["extract", "surg", "implant"] },
  { key: "endodontic", token: "--dtc-3", match: ["endo", "root", "pulp"] },
  { key: "prosthetic", token: "--dtc-4", match: ["prosth", "crown", "bridge", "denture", "veneer"] },
  { key: "preventive", token: "--dtc-5", match: ["prevent", "hygien", "seal", "fluor", "scal", "clean", "perio"] },
  { key: "orthodontic", token: "--dtc-6", match: ["ortho", "brace", "align"] },
];

const OTHER_TOKEN = "--dtc-7";

export function bucketForCategory(category?: string | null): { key: string; token: string } {
  const c = String(category ?? "").toLowerCase();
  const hit = CATEGORY_BUCKETS.find((b) => b.match.some((m) => c.includes(m)));
  return hit ? { key: hit.key, token: hit.token } : { key: "other", token: OTHER_TOKEN };
}

const PROC_STATUSES = ["planned", "in_progress", "completed"];

/** Gentle arch offset (px) for a tooth by its index inside a row. */
const archOffset = (index: number, total: number) => {
  const mid = (total - 1) / 2;
  const norm = Math.abs(index - mid) / mid;
  return Math.round(norm * norm * 14);
};

const TreatmentPlanToothChart = ({ planId, dentitionType, procedures, readOnly, onChanged }: Props) => {
  const { t } = useTranslation("dashboard");
  const [busy, setBusy] = useState(false);
  const [dentition, setDentition] = useState<DentitionType>(dentitionType);
  const [chargeProc, setChargeProc] = useState<ToothChartProcedure | null>(null);

  const set = dentition === "primary" ? PRIMARY_TEETH : PERMANENT_TEETH;
  const upper = [...set.upperRight, ...set.upperLeft];
  const lower = [...set.lowerRight, ...set.lowerLeft].sort((a, b) => b - a);

  const byTooth = useMemo(() => {
    const map = new Map<number, ToothChartProcedure[]>();
    for (const p of procedures) {
      for (const n of p.tooth_numbers ?? []) {
        map.set(n, [...(map.get(n) ?? []), p]);
      }
    }
    return map;
  }, [procedures]);

  const usedBuckets = useMemo(() => {
    const keys = new Set<string>();
    for (const list of byTooth.values()) {
      for (const p of list) keys.add(bucketForCategory(p.procedure?.category).key);
    }
    return keys;
  }, [byTooth]);

  const changeDentition = async (next: DentitionType) => {
    setDentition(next);
    const { error } = await (supabase as any)
      .from("treatment_plans")
      .update({ dentition_type: next })
      .eq("id", planId);
    if (error) toast.error(error.message);
    else onChanged?.();
  };

  const toggleTooth = async (proc: ToothChartProcedure, tooth: number) => {
    if (readOnly) return;
    setBusy(true);
    const current = proc.tooth_numbers ?? [];
    const next = current.includes(tooth)
      ? current.filter((n) => n !== tooth)
      : [...current, tooth].sort((a, b) => a - b);
    const { error } = await supabase
      .from("treatment_plan_procedures")
      .update({ tooth_numbers: next })
      .eq("id", proc.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else onChanged?.();
  };

  const changeStatus = async (proc: ToothChartProcedure, status: string) => {
    if (readOnly) return;
    setBusy(true);
    const { error } = await supabase
      .from("treatment_plan_procedures")
      .update({ status })
      .eq("id", proc.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged?.();
    if (status === "completed") setChargeProc(proc);
  };

  const renderTooth = (n: number, index: number, total: number, row: "upper" | "lower") => {
    const assigned = byTooth.get(n) ?? [];
    const first = assigned[0];
    const token = first ? bucketForCategory(first.procedure?.category).token : null;
    const offset = archOffset(index, total) * (row === "upper" ? 1 : -1);

    // Procedure labels rendered directly above (upper arch) / below (lower arch)
    // the tooth instead of a separate table.
    const labels = (
      <div
        className={`flex w-14 flex-col items-center gap-0.5 sm:w-16 ${
          row === "upper" ? "justify-end" : "justify-start"
        }`}
        style={{ minHeight: "2.6rem" }}
      >
        {assigned.slice(0, 2).map((p) => {
          const bt = bucketForCategory(p.procedure?.category).token;
          return (
            <span
              key={p.id}
              title={`${p.procedure?.name ?? ""} — ${t(`doctor.toothChart.statuses.${p.status}`, p.status)}`}
              className="w-full truncate rounded-md border px-1 py-[1px] text-center text-[9px] font-medium leading-tight"
              style={{
                backgroundColor: `hsl(var(${bt}) / 0.16)`,
                borderColor: `hsl(var(${bt}))`,
                color: `hsl(var(${bt}))`,
                opacity: p.status === "completed" ? 0.65 : 1,
              }}
            >
              {p.procedure?.name || t("doctor.toothChart.procedure", "Procedure")}
            </span>
          );
        })}
        {assigned.length > 2 && (
          <span className="text-[9px] font-semibold text-muted-foreground">+{assigned.length - 2}</span>
        )}
      </div>
    );

    const chipButton = (
      <button
        type="button"
        disabled={readOnly && assigned.length === 0}
        style={{
          backgroundColor: token ? `hsl(var(${token}) / 0.18)` : undefined,
          borderColor: token ? `hsl(var(${token}))` : undefined,
          color: token ? `hsl(var(${token}))` : undefined,
        }}
        className="relative h-9 w-9 shrink-0 rounded-xl border border-border bg-background text-xs font-semibold transition-colors hover:border-primary disabled:cursor-default sm:h-10 sm:w-10"
        aria-label={`${t("doctor.toothChart.tooth", "Tooth")} ${n}`}
      >
        {n}
        {assigned.length > 1 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {assigned.length}
          </span>
        )}
      </button>
    );

    const chip = (
      <div
        className="flex flex-col items-center"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {row === "upper" && labels}
        {chipButton}
        {row === "lower" && labels}
      </div>
    );

    if (readOnly && assigned.length === 0) return <div key={n}>{chip}</div>;


    return (
      <Popover key={n}>
        <PopoverTrigger asChild>{chip}</PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="center">
          <p className="mb-2 text-sm font-semibold">
            {t("doctor.toothChart.tooth", "Tooth")} {n}
          </p>
          {procedures.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("doctor.toothChart.noProcedures", "Add a procedure to this plan first.")}
            </p>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {procedures.map((p) => {
                const checked = (p.tooth_numbers ?? []).includes(n);
                if (readOnly && !checked) return null;
                return (
                  <div key={p.id} className="space-y-1.5 rounded-lg border border-border/60 p-2">
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={readOnly || busy}
                        onCheckedChange={() => toggleTooth(p, n)}
                        className="mt-0.5"
                      />
                      <span>{p.procedure?.name || t("doctor.toothChart.procedure", "Procedure")}</span>
                    </label>
                    {checked && (
                      <Select
                        value={PROC_STATUSES.includes(p.status) ? p.status : "planned"}
                        disabled={readOnly || busy}
                        onValueChange={(v) => changeStatus(p, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROC_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {t(`doctor.toothChart.statuses.${s}`, s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const generalProcedures = useMemo(
    () => procedures.filter((p) => !(p.tooth_numbers ?? []).length),
    [procedures],
  );


  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base">
          {t("doctor.toothChart.title", "Tooth chart")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            {t("doctor.toothChart.fdi", "FDI / ISO-3950")}
          </span>
        </CardTitle>
        {!readOnly && (
          <div className="flex rounded-xl border border-border p-0.5">
            {(["permanent", "primary"] as DentitionType[]).map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={dentition === d ? "default" : "ghost"}
                className="h-7 rounded-lg px-3 text-xs"
                onClick={() => changeDentition(d)}
              >
                {t(`doctor.toothChart.dentition.${d}`, d)}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-[2rem] border border-border/60 bg-muted/20 px-3 py-6">
          <div className="mx-auto w-max space-y-6">
            <div className="flex items-end gap-1.5">
              {upper.map((n, i) => (
                <div key={n} className={i === upper.length / 2 ? "ml-4" : undefined}>
                  {renderTooth(n, i, upper.length, "upper")}
                </div>
              ))}
            </div>
            <div className="flex items-start gap-1.5">
              {lower.map((n, i) => (
                <div key={n} className={i === lower.length / 2 ? "ml-4" : undefined}>
                  {renderTooth(n, i, lower.length, "lower")}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {[...CATEGORY_BUCKETS, { key: "other", token: OTHER_TOKEN, match: [] }].map((b) => (
            <span
              key={b.key}
              className={`flex items-center gap-1.5 text-xs ${
                usedBuckets.has(b.key) ? "text-foreground" : "text-muted-foreground/60"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full border"
                style={{ backgroundColor: `hsl(var(${b.token}) / 0.25)`, borderColor: `hsl(var(${b.token}))` }}
              />
              {t(`doctor.toothChart.categories.${b.key}`, b.key)}
            </span>
          ))}
        </div>

        {byTooth.size === 0 && generalProcedures.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {readOnly
              ? t("doctor.toothChart.emptyReadOnly", "No teeth assigned in this plan yet.")
              : t("doctor.toothChart.empty", "Click a tooth to assign a procedure.")}
          </p>
        )}

        {generalProcedures.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("doctor.toothChart.general", "Full-mouth / general procedures")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {generalProcedures.map((p) => {
                const bt = bucketForCategory(p.procedure?.category).token;
                return (
                  <span
                    key={p.id}
                    className="rounded-md border px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `hsl(var(${bt}) / 0.16)`,
                      borderColor: `hsl(var(${bt}))`,
                      color: `hsl(var(${bt}))`,
                    }}
                  >
                    {p.procedure?.name || t("doctor.toothChart.procedure", "Procedure")}
                    <span className="ml-1 opacity-70">
                      · {String(t(`doctor.toothChart.statuses.${p.status}`, p.status))}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default TreatmentPlanToothChart;
