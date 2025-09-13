import { CheckCircle, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingStep {
  id: string;
  title: string;
  completed: boolean;
  current: boolean;
}

interface BookingProgressIndicatorProps {
  steps: BookingStep[];
  className?: string;
}

export const BookingProgressIndicator = ({ steps, className }: BookingProgressIndicatorProps) => {
  return (
    <div className={cn("py-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                  step.completed && "bg-green-100 border-green-500 text-green-700",
                  step.current && !step.completed && "bg-primary border-primary text-primary-foreground",
                  !step.completed && !step.current && "bg-background border-muted-foreground text-muted-foreground"
                )}
                aria-label={`Step ${index + 1}: ${step.title}`}
              >
                {step.completed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : step.current ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              
              <span
                className={cn(
                  "text-xs mt-1 text-center max-w-[4rem] leading-tight",
                  step.completed && "text-green-700",
                  step.current && !step.completed && "text-primary font-medium",
                  !step.completed && !step.current && "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-all duration-200",
                  step.completed ? "bg-green-500" : "bg-muted"
                )}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};