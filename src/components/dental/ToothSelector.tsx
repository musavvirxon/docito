import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FDI Two-Digit Numbering — anatomical chart
 *
 * Permanent dentition (adults):
 *   Q1 (upper right): 18 17 16 15 14 13 12 11
 *   Q2 (upper left):  21 22 23 24 25 26 27 28
 *   Q4 (lower right): 48 47 46 45 44 43 42 41
 *   Q3 (lower left):  31 32 33 34 35 36 37 38
 *
 * Primary dentition (children):
 *   Q5 (upper right): 55 54 53 52 51
 *   Q6 (upper left):  61 62 63 64 65
 *   Q8 (lower right): 85 84 83 82 81
 *   Q7 (lower left):  71 72 73 74 75
 *
 * Layout mirrors how a dentist views the patient (patient's right is on chart's left).
 */

const PERM_UPPER_R = ["18", "17", "16", "15", "14", "13", "12", "11"];
const PERM_UPPER_L = ["21", "22", "23", "24", "25", "26", "27", "28"];
const PERM_LOWER_R = ["48", "47", "46", "45", "44", "43", "42", "41"];
const PERM_LOWER_L = ["31", "32", "33", "34", "35", "36", "37", "38"];

const PRIM_UPPER_R = ["55", "54", "53", "52", "51"];
const PRIM_UPPER_L = ["61", "62", "63", "64", "65"];
const PRIM_LOWER_R = ["85", "84", "83", "82", "81"];
const PRIM_LOWER_L = ["71", "72", "73", "74", "75"];

interface ToothSelectorProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
}

type Mode = "permanent" | "primary";

export const ToothSelector = ({ selectedTeeth, onChange }: ToothSelectorProps) => {
  const { t } = useTranslation("appointments");
  const [mode, setMode] = useState<Mode>("permanent");
  const dragging = useRef(false);
  const dragAdds = useRef(true);

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const rows = useMemo(() => {
    if (mode === "permanent") {
      return {
        upperR: PERM_UPPER_R,
        upperL: PERM_UPPER_L,
        lowerR: PERM_LOWER_R,
        lowerL: PERM_LOWER_L,
      };
    }
    return {
      upperR: PRIM_UPPER_R,
      upperL: PRIM_UPPER_L,
      lowerR: PRIM_LOWER_R,
      lowerL: PRIM_LOWER_L,
    };
  }, [mode]);

  const allTeeth = useMemo(
    () => [...rows.upperR, ...rows.upperL, ...rows.lowerR, ...rows.lowerL],
    [rows],
  );

  const setTooth = (tooth: string, selected: boolean) => {
    const has = selectedTeeth.includes(tooth);
    if (selected && !has) onChange([...selectedTeeth, tooth]);
    if (!selected && has) onChange(selectedTeeth.filter((x) => x !== tooth));
  };

  const toggleTooth = (tooth: string) => setTooth(tooth, !selectedTeeth.includes(tooth));

  const toggleGroup = (group: string[]) => {
    const allSelected = group.every((n) => selectedTeeth.includes(n));
    if (allSelected) {
      onChange(selectedTeeth.filter((n) => !group.includes(n)));
    } else {
      const set = new Set([...selectedTeeth, ...group]);
      onChange(Array.from(set));
    }
  };

  const Tooth = ({ n }: { n: string }) => {
    const selected = selectedTeeth.includes(n);
    return (
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          dragging.current = true;
          dragAdds.current = !selected;
          setTooth(n, !selected);
        }}
        onPointerEnter={() => {
          if (dragging.current) setTooth(n, dragAdds.current);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleTooth(n);
          }
        }}
        className={cn(
          "h-9 min-w-[2.25rem] px-1 rounded-md border text-xs font-semibold tabular-nums transition-colors select-none touch-none",
          selected
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background hover:bg-muted border-border"
        )}
        aria-pressed={selected}
      >
        {n}
      </button>
    );
  };

  const QuadrantButton = ({ group, label }: { group: string[]; label: string }) => (
    <button
      type="button"
      onClick={() => toggleGroup(group)}
      className="text-[10px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {label}
    </button>
  );

  const Row = ({
    left,
    right,
    label,
    leftLabel,
    rightLabel,
  }: {
    left: string[];
    right: string[];
    label: string;
    leftLabel: string;
    rightLabel: string;
  }) => (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground text-right">
        {label}
      </span>
      <div className="flex-1 flex items-center justify-center gap-1">
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            {right.map((n) => (
              <Tooth key={n} n={n} />
            ))}
          </div>
          <QuadrantButton group={right} label={rightLabel} />
        </div>
        <div className="mx-2 h-9 w-px bg-border" aria-hidden />
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            {left.map((n) => (
              <Tooth key={n} n={n} />
            ))}
          </div>
          <QuadrantButton group={left} label={leftLabel} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-xs">
          {(["permanent", "primary"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                mode === m
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "permanent"
                ? t("toothSelector.permanent", "Permanent (adult)")
                : t("toothSelector.primary", "Primary (child)")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Array.from(new Set([...selectedTeeth, ...allTeeth])))}
            className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {t("toothSelector.selectAll", "Select all")}
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {t("toothSelector.clear", "Clear")}
          </button>
          <span className="text-[10px] text-muted-foreground tabular-nums">R ◄── ──► L</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t("toothSelector.hint", "Click a tooth to toggle, or click and drag to select several.")}
      </p>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-3 space-y-3 overflow-x-auto">
        <Row
          label={t("toothSelector.upper", "Upper")}
          right={rows.upperR}
          left={rows.upperL}
          rightLabel={t("currentState.quadrants.q1")}
          leftLabel={t("currentState.quadrants.q2")}
        />
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0" />
          <div className="flex-1 border-t border-dashed border-border/70" />
        </div>
        <Row
          label={t("toothSelector.lower", "Lower")}
          right={rows.lowerR}
          left={rows.lowerL}
          rightLabel={t("currentState.quadrants.q4")}
          leftLabel={t("currentState.quadrants.q3")}
        />
      </div>

      {selectedTeeth.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("toothSelector.selectedCount", { count: selectedTeeth.length, defaultValue: "{{count}} selected" })}
          </span>
          {[...selectedTeeth].sort().map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTooth(n, false)}
              aria-label={t("toothSelector.removeTooth", { tooth: n, defaultValue: "Remove tooth {{tooth}}" })}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground hover:bg-primary/20 transition-colors"
            >
              {n}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
