// File: src/components/ui/calendar.tsx
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, Matcher } from "react-day-picker";

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
    ...(((externalModifiers as Record<string, Matcher | Matcher[]>) || {}) as Record<string, Matcher | Matcher[]>),
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
   * IMPORTANT:
   * Your old Calendar styles were using `flex` on <tr>/<th>/<td> which can break weekday alignment
   * (especially with global CSS resets).
   *
   * This version keeps semantic table layout (stable 7 columns) + adds rectangle styling for day numbers.
   */

  return (
    <div className={cn("calendar-root", className)}>
      <style>{`
        /* Hard guard against global CSS breaking table layout */
        .calendar-root table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
        .calendar-root thead tr,
        .calendar-root tbody tr { display: table-row !important; }
        .calendar-root th,
        .calendar-root td { display: table-cell !important; vertical-align: middle !important; }
      `}</style>

      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3")}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        classNames={{
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

          // ✅ stable weekday alignment
          table: "w-full",
          head_row: "",
          head_cell:
            "text-muted-foreground rounded-md font-normal text-[0.8rem] text-center py-1",
          row: "",
          cell: "p-0 text-center",

          // ✅ rectangles around numbers
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-10 w-10 p-0 font-normal rounded-md border border-muted-foreground/20 aria-selected:opacity-100"
          ),

          // Selected day: filled rectangle
          day_selected:
            "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",

          // Today: outlined rectangle (no fill)
          day_today: "bg-transparent text-foreground border-primary/70",

          // Outside month: faint rectangle
          day_outside:
            "day-outside text-muted-foreground opacity-50 border-muted-foreground/10 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",

          // Disabled: muted + still a rectangle
          day_disabled: "text-muted-foreground opacity-60 bg-muted/40 border-muted-foreground/15",

          day_range_end: "day-range-end",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
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
