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
          container: "bg-success/10 border-success/30 hover:bg-success/20 hover:border-success/50 cursor-pointer transition-all",
          badge: "bg-success/20 text-success border-success/30",
          icon: CalendarPlus
        };
      case "booked":
        return {
          container: "bg-primary/10 border-primary/30",
          badge: "bg-primary/20 text-primary border-primary/30",
          icon: Clock
        };
      case "blocked":
        return {
          container: "bg-destructive/10 border-destructive/30",
          badge: "bg-destructive/20 text-destructive border-destructive/30",
          icon: Ban
        };
      case "break":
        return {
          container: "bg-warning/10 border-warning/30",
          badge: "bg-warning/20 text-warning border-warning/30",
          icon: Coffee
        };
      default:
        return {
          container: "bg-muted border-border",
          badge: "bg-muted text-muted-foreground border-border",
          icon: Clock
        };
    }
  };

  const statusStyle = getStatusStyle(slot.status);
  const StatusIcon = statusStyle.icon;

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border-2 flex items-center justify-between group",
        statusStyle.container
      )}
      onClick={() => {
        if (slot.status === "available") {
          onBookAppointment(slot.time);
        }
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={cn(
          "p-2 rounded-full",
          slot.status === "available" && "bg-success/20",
          slot.status === "booked" && "bg-primary/20",
          slot.status === "blocked" && "bg-destructive/20",
          slot.status === "break" && "bg-warning/20"
        )}>
          <StatusIcon className="h-4 w-4" />
        </div>
        
        <div className="flex-1">
          <div className="font-semibold text-sm">
            {slot.time} - {slot.endTime}
          </div>
          
          {slot.patient && (
            <div className="text-sm mt-1">
              <div className="font-medium">{slot.patient}</div>
              {slot.service && (
                <div className="text-muted-foreground text-xs">{slot.service}</div>
              )}
            </div>
          )}
          
          {slot.reason && !slot.patient && (
            <div className="text-sm text-muted-foreground mt-1">{slot.reason}</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("text-xs", statusStyle.badge)}>
          {slot.status}
        </Badge>
        
        {slot.status === "available" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <CalendarPlus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onBookAppointment(slot.time);
              }}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book Appointment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onBlockTime(slot.time);
              }}>
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
