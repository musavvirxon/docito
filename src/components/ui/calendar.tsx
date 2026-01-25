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
   * Some projects have global CSS that breaks <table>/<tr>/<td> (e.g. display:block/flex).
   * To make the calendar always render correctly, we override DayPicker's table parts
   * and render a DIV-based 7-column grid instead of using table semantics.
   */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridTable = ({ className: cn0, children }: any) => (
    <div className={cn("rdp-grid-table w-full", cn0)}>{children}</div>
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridHeadRow = ({ className: cn0, children }: any) => (
    <div className={cn("rdp-grid-head", cn0)}>{children}</div>
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridRow = ({ className: cn0, children }: any) => (
    <div className={cn("rdp-grid-row", cn0)}>{children}</div>
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridHeadCell = ({ className: cn0, children }: any) => (
    <div className={cn("rdp-grid-head-cell", cn0)}>{children}</div>
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridCell = ({ className: cn0, children }: any) => (
    <div className={cn("rdp-grid-cell", cn0)}>{children}</div>
  );

  return (
    <div className={cn("rdp-root", className)}>
      <style>{`
        .rdp-root .rdp-grid-table { display: flex; flex-direction: column; gap: .5rem; }
        .rdp-root .rdp-grid-head,
        .rdp-root .rdp-grid-row {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
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
          height: 2.25rem;
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

          // These are still used by DayPicker for class application (even with custom components)
          table: "w-full",
          head_row: "",
          head_cell: "text-muted-foreground font-normal text-[0.8rem]",
          row: "",
          cell:
            "relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          // ✅ Replace table layout with grid layout to guarantee 7-day alignment
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Table: GridTable as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          HeadRow: GridHeadRow as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Row: GridRow as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          HeadCell: GridHeadCell as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
