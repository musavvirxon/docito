// File: src/components/ui/calendar.tsx
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  holidayDates?: Date[];
  blockedDates?: Date[];
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  weekStartsOn,
  holidayDates = [],
  blockedDates = [],
  modifiers: externalModifiers,
  modifiersClassNames: externalModifiersClassNames,
  ...props
}: CalendarProps) {
  const modifiers = {
    ...(externalModifiers || {}),
    ...(holidayDates?.length ? { holiday: holidayDates } : {}),
    ...(blockedDates?.length ? { blocked: blockedDates } : {}),
  } as any;

  const modifiersClassNames = {
    ...(externalModifiersClassNames || {}),
    ...(holidayDates?.length
      ? { holiday: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium" }
      : {}),
    ...(blockedDates?.length
      ? { blocked: "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 line-through" }
      : {}),
  } as any;

  /**
   * ✅ IMPORTANT:
   * Your project likely has global CSS that breaks <table>/<tr>/<td> (e.g. display:block/flex).
   * We render DayPicker's "table" parts using DIVs in a strict 7-column grid.
   *
   * ✅ ALSO IMPORTANT:
   * DayPicker passes props/events/roles to these components.
   * We MUST forward ALL props (and refs) so day selection works.
   */

  const GridTable = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className: cn0, ...p }, ref) => (
      <div ref={ref} className={cn("rdp-grid-table w-full", cn0)} {...p} />
    ),
  );
  GridTable.displayName = "GridTable";

  const GridHeadRow = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className: cn0, ...p }, ref) => (
      <div ref={ref} className={cn("rdp-grid-head", cn0)} {...p} />
    ),
  );
  GridHeadRow.displayName = "GridHeadRow";

  const GridRow = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className: cn0, ...p }, ref) => (
      <div ref={ref} className={cn("rdp-grid-row", cn0)} {...p} />
    ),
  );
  GridRow.displayName = "GridRow";

  const GridHeadCell = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className: cn0, ...p }, ref) => (
      <div ref={ref} className={cn("rdp-grid-head-cell", cn0)} {...p} />
    ),
  );
  GridHeadCell.displayName = "GridHeadCell";

  const GridCell = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className: cn0, ...p }, ref) => (
      <div ref={ref} className={cn("rdp-grid-cell", cn0)} {...p} />
    ),
  );
  GridCell.displayName = "GridCell";

  return (
    <div className={cn("rdp-root", className)}>
      <style>{`
        .rdp-root .rdp-grid-table { display: flex; flex-direction: column; gap: .5rem; }
        .rdp-root .rdp-grid-head,
        .rdp-root .rdp-grid-row {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          gap: .25rem;
          width: 100%;
        }
        .rdp-root .rdp-grid-head-cell {
          height: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          white-space: nowrap;
        }
        .rdp-root .rdp-grid-cell {
          height: 2.5rem; /* a bit taller to show "rectangles" clearly */
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <DayPicker
        showOutsideDays={showOutsideDays}
        weekStartsOn={weekStartsOn ?? 1}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        classNames={{
          months: "flex flex-col space-y-4",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",

          table: "w-full",
          head_row: "",
          head_cell: "text-muted-foreground font-normal text-[0.8rem]",
          row: "",
          cell:
            "relative focus-within:relative focus-within:z-20",

          // ✅ Rectangles around day numbers via border + rounded-md
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-10 w-10 p-0 font-normal rounded-md border border-transparent aria-selected:opacity-100",
          ),
          day_range_end: "day-range-end",

          // Selected day: filled + strong rectangle
          day_selected:
            "bg-primary text-primary-foreground border-2 border-primary hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",

          // Today: outlined rectangle (no fill)
          day_today:
            "bg-transparent text-foreground border-2 border-primary/70",

          // Disabled (past) days: light fill + muted rectangle + not clickable
          day_disabled:
            "text-muted-foreground/60 border border-muted-foreground/20 bg-muted/40",

          // Outside month days: very faint rectangle
          day_outside:
            "day-outside text-muted-foreground/50 border border-muted-foreground/10 aria-selected:bg-accent/40 aria-selected:text-muted-foreground aria-selected:opacity-60",

          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Table: GridTable as any,
          HeadRow: GridHeadRow as any,
          Row: GridRow as any,
          HeadCell: GridHeadCell as any,
          Cell: GridCell as any,
          Chevron: ({ orientation }) =>
            orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
        }}
        {...props}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
