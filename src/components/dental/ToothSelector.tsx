import { useMemo, useState } from "react";
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
  const [mode, setMode] = useState<Mode>("permanent");

  const toggleTooth = (tooth: string) => {
    if (selectedTeeth.includes(tooth)) {
      onChange(selectedTeeth.filter((t) => t !== tooth));
    } else {
      onChange([...selectedTeeth, tooth]);
    }
  };

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

  const Tooth = ({ n }: { n: string }) => {
    const selected = selectedTeeth.includes(n);
    return (
      <button
        type="button"
        onClick={() => toggleTooth(n)}
        className={cn(
          "h-9 min-w-[2.25rem] px-1 rounded-md border text-xs font-semibold tabular-nums transition-colors",
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

  const Row = ({ left, right, label }: { left: string[]; right: string[]; label: string }) => (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground text-right">
        {label}
      </span>
      <div className="flex-1 flex items-center justify-center gap-1">
        <div className="flex gap-1">
          {right.map((n) => (
            <Tooth key={n} n={n} />
          ))}
        </div>
        <div className="mx-2 h-9 w-px bg-border" aria-hidden />
        <div className="flex gap-1">
          {left.map((n) => (
            <Tooth key={n} n={n} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-xs">
          {(["permanent", "primary"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1 rounded-md font-medium capitalize transition-colors",
                mode === m
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "permanent" ? "Permanent (adult)" : "Primary (child)"}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          R ◄── ──► L
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-3 space-y-2 overflow-x-auto">
        <Row label="Upper" right={rows.upperR} left={rows.upperL} />
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0" />
          <div className="flex-1 border-t border-dashed border-border/70" />
        </div>
        <Row label="Lower" right={rows.lowerR} left={rows.lowerL} />
      </div>

      {selectedTeeth.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selectedTeeth.sort().join(", ")}</span>
        </p>
      )}
    </div>
  );
};
