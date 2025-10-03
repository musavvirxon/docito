import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDate?: Date;
  prefilledTime?: string;
  onSuccess?: () => void;
}

const BlockTimeModal = ({ isOpen, onClose, prefilledDate, prefilledTime, onSuccess }: BlockTimeModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate || new Date());
  const [startTime, setStartTime] = useState(prefilledTime || "");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [blockType, setBlockType] = useState("personal");

  const [loading, setLoading] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctorId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (data) setDoctorId(data.id);
      }
    };
    
    if (isOpen) {
      fetchDoctorId();
      if (prefilledDate) setSelectedDate(prefilledDate);
      if (prefilledTime) setStartTime(prefilledTime);
    }
  }, [isOpen, prefilledDate, prefilledTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!doctorId) {
      toast.error("Doctor profile not found");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setLoading(true);

    try {
      // Check for conflicts with existing appointments
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', format(selectedDate, 'yyyy-MM-dd'))
        .neq('status', 'canceled')
        .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`);

      if (conflicts && conflicts.length > 0) {
        toast.error("Cannot block time - conflicts with existing appointment(s)");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('blocked_times')
        .insert({
          doctor_id: doctorId,
          blocked_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          block_type: blockType,
          reason: reason || null
        });

      if (error) throw error;

      toast.success("Time blocked successfully");
      onSuccess?.();
      onClose();
      
      // Reset form
      setSelectedDate(new Date());
      setStartTime("");
      setEndTime("");
      setReason("");
      setBlockType("personal");
    } catch (error: any) {
      console.error('Error blocking time:', error);
      toast.error(error.message || "Failed to block time");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Block Time</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="blockType">Block Type</Label>
                <Select value={blockType} onValueChange={setBlockType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Time</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you blocking this time?"
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Blocking..." : "Block Time"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeModal;