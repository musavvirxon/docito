// File: src/components/ui/calendar.tsx
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, Matcher } from "react-day-picker";
import "react-day-picker/dist/style.css";

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
  holidayDates = [],
  blockedDates = [],
  modifiers: externalModifiers,
  modifiersClassNames: externalModifiersClassNames,
  ...props
}: CalendarProps) {
  // Build modifiers for holidays and blocked dates
  const modifiers: Record<string, Matcher | Matcher[]> = {
    ...(((externalModifiers as Record<string, Matcher | Matcher[]>) || {}) as Record<
      string,
      Matcher | Matcher[]
    >),
  };

  const modifiersClassNames: Record<string, string> = {
    ...(externalModifiersClassNames || {}),
  };

  if (holidayDates.length > 0) {
    modifiers.holiday = holidayDates;
    modifiersClassNames.holiday =
      "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium";
  }

  if (blockedDates.length > 0) {
    modifiers.blocked = blockedDates;
    modifiersClassNames.blocked =
      "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 line-through";
  }

  /**
   * Fix: calendar showing only Sundays
   * Root cause is DayPicker v9 layout relying on its CSS + correct classNames for grid structure.
   * This component enforces a stable 7-column grid regardless of surrounding styles.
   */
  return (
    <div className={cn("calendar-root", className)}>
      <style>{`
        /* Hard guard: ensure 7-column layout even if global styles interfere */
        .calendar-root .rdp-month_grid { width: 100% !important; }
        .calendar-root .rdp-weekdays { display: grid !important; grid-template-columns: repeat(7, minmax(0, 1fr)) !important; }
        .calendar-root .rdp-week { display: grid !important; grid-template-columns: repeat(7, minmax(0, 1fr)) !important; }
        .calendar-root .rdp-weekday { text-align: center !important; }
        .calendar-root .rdp-day { display: flex !important; justify-content: center !important; }
      `}</style>

      <DayPicker
        showOutsideDays={showOutsideDays}
        className="p-3"
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        classNames={{
          // Layout
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",

          // DayPicker v9 grid keys
          month_grid: "w-full",
          weekdays: "grid grid-cols-7",
          weekday: "text-muted-foreground rounded-md font-normal text-[0.8rem] text-center py-1",
          week: "grid grid-cols-7",

          // Day cell + button
          day: "p-0 text-center",
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-10 w-10 p-0 font-normal rounded-md border border-muted-foreground/20 aria-selected:opacity-100"
          ),

          // States
          day_selected:
            "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-transparent text-foreground border-primary/70",
          day_outside:
            "text-muted-foreground opacity-50 border-muted-foreground/10 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-60 bg-muted/40 border-muted-foreground/15",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_range_end: "day-range-end",
          day_hidden: "invisible",

          // Back-compat keys (safe to provide; ignored if unused)
          table: "w-full",
          head_row: "",
          head_cell: "text-muted-foreground rounded-md font-normal text-[0.8rem] text-center py-1",
          row: "",
          cell: "p-0 text-center",

          ...classNames,
        }}
        components={{
          Chevron: ({ orientation }) =>
            orientation === "left" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ),
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
