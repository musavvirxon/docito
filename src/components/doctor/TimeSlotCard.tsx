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
          container: "bg-success text-white hover:bg-success/90 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
          badge: "bg-white/20 text-white border-white/30 font-medium",
          icon: CalendarPlus,
          iconBg: "bg-white/20"
        };
      case "booked":
        return {
          container: "bg-primary text-white shadow-md",
          badge: "bg-white/20 text-white border-white/30 font-medium",
          icon: Clock,
          iconBg: "bg-white/20"
        };
      case "blocked":
        return {
          container: "bg-destructive text-white shadow-md",
          badge: "bg-white/20 text-white border-white/30 font-medium",
          icon: Ban,
          iconBg: "bg-white/20"
        };
      case "break":
        return {
          container: "bg-amber-500 text-white shadow-md",
          badge: "bg-white/20 text-white border-white/30 font-medium",
          icon: Coffee,
          iconBg: "bg-white/20"
        };
      default:
        return {
          container: "bg-muted text-foreground",
          badge: "bg-background text-muted-foreground border-border",
          icon: Clock,
          iconBg: "bg-background"
        };
    }
  };

  const statusStyle = getStatusStyle(slot.status);
  const StatusIcon = statusStyle.icon;

  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl flex items-center justify-between group transition-all duration-200",
        statusStyle.container
      )}
      onClick={() => {
        if (slot.status === "available") {
          onBookAppointment(slot.time);
        }
      }}
      title={slot.reason}
    >
      {/* Subtle gradient overlay for available slots */}
      {slot.status === "available" && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
            <Clock className="h-3.5 w-3.5 opacity-70" />
            {slot.time} - {slot.endTime}
          </div>
          
          {slot.patient && (
            <div className="text-sm mt-1.5 space-y-0.5">
              <div className="font-medium opacity-90">{slot.patient}</div>
              {slot.service && (
                <div className="opacity-70 text-xs flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                  {slot.service}
                </div>
              )}
            </div>
          )}
          
          {slot.reason && !slot.patient && (
            <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-current opacity-40" />
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
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 text-white"
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
