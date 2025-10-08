import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Clock, Ban, CheckCircle2 } from 'lucide-react';
import { useTimeSlots } from "@/hooks/useTimeSlots";

interface TimeSlot {
  time: string;
  status: 'available' | 'booked' | 'blocked' | 'break' | 'outside-hours';
  reason?: string;
}

interface SlotSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  actionType: 'block' | 'book' | 'unblock';
  onSlotSelected: (date: Date, time: string, slot: TimeSlot) => void;
}

export function SlotSelectionModal({
  isOpen,
  onClose,
  doctorId,
  actionType,
  onSlotSelected
}: SlotSelectionModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  
  // Fetch slots for the selected date
  const { timeSlots, loading } = useTimeSlots({
    doctorId,
    selectedDate,
    procedureDuration: 30,
    bufferTime: 15
  });
  
  // Filter slots based on action type
  const filteredSlots = timeSlots.filter(slot => {
    if (actionType === 'block' || actionType === 'book') {
      return slot.status === 'available';
    } else if (actionType === 'unblock') {
      return slot.status === 'blocked';
    }
    return true;
  });
  
  const getActionTitle = () => {
    switch (actionType) {
      case 'block': return 'Block Time Slots';
      case 'book': return 'Book Appointment';
      case 'unblock': return 'Unblock Time Slots';
      default: return 'Select Time Slots';
    }
  };
  
  const getActionDescription = () => {
    switch (actionType) {
      case 'block': return 'Select an available slot to block';
      case 'book': return 'Select an available slot to book appointment';
      case 'unblock': return 'Select a blocked slot to make available again';
      default: return '';
    }
  };
  
  const handleContinue = () => {
    const slot = timeSlots.find(s => s.time === selectedTime);
    if (slot && selectedTime) {
      onSlotSelected(selectedDate, selectedTime, slot);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-2xl">{getActionTitle()}</DialogTitle>
          <p className="text-muted-foreground">{getActionDescription()}</p>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Date Selector */}
          <div>
            <h3 className="font-medium mb-3">Select Date</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setSelectedTime(""); // Reset selected time when date changes
                }
              }}
              className="rounded-md border"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>
          
          {/* Slots Grid */}
          <div>
            <h3 className="font-medium mb-3">
              {loading ? 'Loading slots...' : filteredSlots.length > 0 
                ? `Available Slots (${filteredSlots.length})`
                : 'No slots available'}
            </h3>
            
            <div className="grid grid-cols-2 gap-2 max-h-[450px] overflow-y-auto pr-2">
              {filteredSlots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                
                return (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                      }
                      ${slot.status === 'blocked' ? 'bg-destructive/5' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium text-sm">{slot.time}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    
                    {slot.status === 'blocked' && (
                      <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                        <Ban className="w-3 h-3" />
                        <span>Blocked</span>
                      </div>
                    )}
                    
                    {slot.reason && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {slot.reason}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            
            {filteredSlots.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-2">No {actionType === 'unblock' ? 'blocked' : 'available'} slots for this date</p>
                <p className="text-sm">Try selecting a different date</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedTime}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
