import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPlus, Clock, Coffee, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: string;
  endTime: string;
  status: "available" | "booked" | "blocked" | "break" | "outside-hours";
  patient?: string;
  service?: string;
  reason?: string;
}

interface TimeSlotCardProps {
  slot: TimeSlot;
  onBlockTime: (time: string) => void;
  onBookAppointment: (time: string) => void;
}

const TimeSlotCard = ({ slot, onBlockTime, onBookAppointment }: TimeSlotCardProps) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "available":
        return {
          container: "bg-success/5 border-success/20 hover:bg-success/10 hover:border-success/40 hover:shadow-lg hover:shadow-success/5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5",
          badge: "bg-success/15 text-success border-success/30 font-medium",
          icon: CalendarPlus,
          iconBg: "bg-success/15"
        };
      case "booked":
        return {
          container: "bg-primary/5 border-primary/20 shadow-sm",
          badge: "bg-primary/15 text-primary border-primary/30 font-medium",
          icon: Clock,
          iconBg: "bg-primary/15"
        };
      case "blocked":
        return {
          container: "bg-destructive/5 border-destructive/20",
          badge: "bg-destructive/15 text-destructive border-destructive/30 font-medium",
          icon: Ban,
          iconBg: "bg-destructive/15"
        };
      case "break":
        return {
          container: "bg-amber-500/5 border-amber-500/20",
          badge: "bg-amber-500/15 text-amber-600 border-amber-500/30 font-medium",
          icon: Coffee,
          iconBg: "bg-amber-500/15"
        };
      default:
        return {
          container: "bg-muted/50 border-border/50",
          badge: "bg-muted text-muted-foreground border-border",
          icon: Clock,
          iconBg: "bg-muted"
        };
    }
  };

  const statusStyle = getStatusStyle(slot.status);
  const StatusIcon = statusStyle.icon;

  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl border-2 flex items-center justify-between group transition-all duration-200",
        statusStyle.container
      )}
      onClick={() => {
        if (slot.status === "available") {
          onBookAppointment(slot.time);
        }
      }}
      title={slot.reason}
    >
      {/* Gradient overlay for available slots */}
      {slot.status === "available" && (
        <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/5 to-success/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
      
      <div className="flex items-center gap-3 flex-1 relative z-10">
        <div className={cn(
          "p-2.5 rounded-xl shadow-sm transition-all duration-200",
          statusStyle.iconBg,
          slot.status === "available" && "group-hover:scale-110 group-hover:shadow-md"
        )}>
          <StatusIcon className="h-4 w-4" />
        </div>
        
        <div className="flex-1">
          <div className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {slot.time} - {slot.endTime}
          </div>
          
          {slot.patient && (
            <div className="text-sm mt-1.5 space-y-0.5">
              <div className="font-medium text-foreground">{slot.patient}</div>
              {slot.service && (
                <div className="text-muted-foreground text-xs flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {slot.service}
                </div>
              )}
            </div>
          )}
          
          {slot.reason && !slot.patient && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              {slot.reason}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 relative z-10">
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs px-2.5 py-1 rounded-full shadow-sm capitalize",
            statusStyle.badge
          )}
        >
          {slot.status === "available" && "✓ "}
          {slot.status}
        </Badge>
        
        {slot.status === "available" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-success/20 hover:text-success"
              >
                <CalendarPlus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onBookAppointment(slot.time);
                }}
                className="cursor-pointer"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book Appointment
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onBlockTime(slot.time);
                }}
                className="cursor-pointer"
              >
                <Ban className="mr-2 h-4 w-4" />
                Block Time
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default TimeSlotCard;
