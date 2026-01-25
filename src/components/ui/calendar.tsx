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
  weekStartsOn,
  holidayDates = [],
  blockedDates = [],
  modifiers: externalModifiers,
  modifiersClassNames: externalModifiersClassNames,
  ...props
}: CalendarProps) {
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

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn ?? 1}
      className={cn("p-3", className)}
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

        // ✅ Keep native table semantics and force 7 equal columns (fixes vertical stacking)
        table: "w-full border-collapse table-fixed",
        head_row: "",
        head_cell:
          "text-muted-foreground font-normal text-[0.8rem] text-center p-0 h-9 w-[14.285%] align-middle",
        row: "",
        cell: "text-center p-0 h-9 w-[14.285%] align-middle",

        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 mx-auto",
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
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
