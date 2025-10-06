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
          container: "bg-green-500 text-white hover:bg-green-600 border-2 border-green-600 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
          badge: "bg-green-700 text-white border-green-800 font-medium",
          icon: CalendarPlus,
          iconBg: "bg-green-600"
        };
      case "booked":
        return {
          container: "bg-blue-500 text-white border-2 border-blue-600 shadow-md",
          badge: "bg-blue-700 text-white border-blue-800 font-medium",
          icon: Clock,
          iconBg: "bg-blue-600"
        };
      case "blocked":
        return {
          container: "bg-red-500 text-white border-2 border-red-600 shadow-md",
          badge: "bg-red-700 text-white border-red-800 font-medium",
          icon: Ban,
          iconBg: "bg-red-600"
        };
      case "break":
        return {
          container: "bg-orange-500 text-white border-2 border-orange-600 shadow-md",
          badge: "bg-orange-700 text-white border-orange-800 font-medium",
          icon: Coffee,
          iconBg: "bg-orange-600"
        };
      default:
        return {
          container: "bg-gray-300 text-gray-700 border-2 border-gray-400",
          badge: "bg-gray-400 text-gray-700 border-gray-500",
          icon: Clock,
          iconBg: "bg-gray-400"
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
          <StatusIcon className="h-4 w-4 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-white opacity-90" />
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
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-green-600 text-white"
              >
                <CalendarPlus className="h-4 w-4 text-white" />
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
