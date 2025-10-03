import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPlus, Clock, MoreVertical } from "lucide-react";

interface TimeSlot {
  id: string;
  time: string;
  patient?: string;
  service?: string;
  status: "available" | "booked" | "blocked";
  reason?: string;
}

interface TimeSlotCardProps {
  slot: TimeSlot;
  onBlockTime: (time: string) => void;
  onBookAppointment: (time: string) => void;
  onSetAvailability: (time: string) => void;
}

const TimeSlotCard = ({ slot, onBlockTime, onBookAppointment, onSetAvailability }: TimeSlotCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "booked":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "blocked":
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
      default:
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer";
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor(slot.status)} flex justify-between items-center transition-all`}>
      <div className="flex-1">
        <div className="font-medium">{slot.time}</div>
        {slot.patient && (
          <div className="text-sm mt-1">
            <div>{slot.patient}</div>
            <div className="text-muted-foreground">{slot.service}</div>
          </div>
        )}
        {slot.reason && (
          <div className="text-sm text-muted-foreground mt-1">{slot.reason}</div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={getStatusColor(slot.status)}>
          {slot.status}
        </Badge>
        
        {slot.status === "available" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onBookAppointment(slot.time)}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book Appointment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBlockTime(slot.time)}>
                <Clock className="mr-2 h-4 w-4" />
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
