import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TouchOptimizedCalendarProps {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const TouchOptimizedCalendar = ({
  selected,
  onSelect,
  disabled,
  className,
  minDate = new Date(),
  maxDate = addDays(new Date(), 30)
}: TouchOptimizedCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleDateSelect = (date: Date) => {
    if (disabled?.(date)) return;
    onSelect?.(date);
  };

  const isDateDisabled = (date: Date) => {
    if (disabled?.(date)) return true;
    if (date < minDate || date > maxDate) return true;
    return false;
  };

  // Add swipe gesture support
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = Math.abs(touchStart.y - touch.clientY);
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > 50 && deltaY < 100) {
      if (deltaX > 0) {
        nextMonth();
      } else {
        previousMonth();
      }
    }
    
    setTouchStart(null);
  };

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  return (
    <div 
      className={cn("p-4 bg-background rounded-lg border touch-manipulation", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={previousMonth}
          className="touch-manipulation h-10 w-10"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          className="touch-manipulation h-10 w-10"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentDay = isToday(day);
          const disabled = isDateDisabled(day);
          
          return (
            <Button
              key={day.toISOString()}
              variant="ghost"
              onClick={() => handleDateSelect(day)}
              disabled={disabled}
              className={cn(
                "h-12 w-full touch-manipulation text-sm font-medium transition-all duration-200",
                "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                isCurrentDay && !isSelected && "bg-accent text-accent-foreground",
                disabled && "opacity-40 cursor-not-allowed",
                !isSameMonth(day, currentMonth) && "opacity-30"
              )}
              aria-label={format(day, "EEEE, MMMM do, yyyy")}
              aria-pressed={isSelected}
            >
              {format(day, "d")}
            </Button>
          );
        })}
      </div>

      {/* Swipe hint */}
      <p className="text-xs text-muted-foreground text-center mt-3">
        Swipe left or right to change months
      </p>
    </div>
  );
};