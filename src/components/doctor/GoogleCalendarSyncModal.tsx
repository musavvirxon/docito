import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
}

const GoogleCalendarSyncModal = ({ isOpen, onClose, doctorId }: GoogleCalendarSyncModalProps) => {
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSyncStatus();
    }
  }, [isOpen, doctorId]);

  const fetchSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('google_calendar_sync')
        .select('*')
        .eq('doctor_id', doctorId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setSyncStatus(data);
      setSyncEnabled(data?.sync_enabled || false);
    } catch (error: any) {
      console.error('Error fetching sync status:', error);
    }
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      // In production, this would initiate OAuth flow
      // For now, we'll show a message
      toast.info("Google Calendar integration coming soon! This feature requires OAuth setup.");
      
      // Placeholder for actual OAuth implementation
      // You would typically:
      // 1. Redirect to Google OAuth consent screen
      // 2. Get authorization code
      // 3. Exchange for access token
      // 4. Store tokens in google_calendar_sync table
      
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      toast.error("Failed to connect Google Calendar");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (!syncStatus) {
        toast.error("Please connect your Google Calendar first");
        return;
      }

      const { error } = await supabase
        .from('google_calendar_sync')
        .update({ sync_enabled: enabled })
        .eq('doctor_id', doctorId);

      if (error) throw error;

      setSyncEnabled(enabled);
      toast.success(enabled ? "Sync enabled" : "Sync disabled");
    } catch (error: any) {
      console.error('Error toggling sync:', error);
      toast.error("Failed to update sync settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      if (!syncStatus || !syncEnabled) {
        toast.error("Sync is not enabled");
        return;
      }

      // In production, this would trigger a sync operation
      toast.info("Manual sync triggered. This feature requires backend implementation.");
      
      // Update last sync time
      const { error } = await supabase
        .from('google_calendar_sync')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('doctor_id', doctorId);

      if (error) throw error;
      
      await fetchSyncStatus();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast.error("Failed to sync calendar");
    } finally {
      setLoading(false);
    }
  };

  const isConnected = syncStatus && syncStatus.access_token;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {isConnected ? "Connected" : "Not Connected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isConnected 
                        ? `Last synced: ${syncStatus?.last_sync_at ? new Date(syncStatus.last_sync_at).toLocaleString() : 'Never'}`
                        : "Connect to sync your appointments"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connect Button */}
          {!isConnected && (
            <Button 
              onClick={handleConnectGoogle} 
              className="w-full"
              disabled={loading}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          )}

          {/* Sync Controls */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sync-toggle">Automatic Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Sync appointments automatically
                  </p>
                </div>
                <Switch
                  id="sync-toggle"
                  checked={syncEnabled}
                  onCheckedChange={handleToggleSync}
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={handleSyncNow} 
                variant="outline" 
                className="w-full"
                disabled={loading || !syncEnabled}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <p className="font-medium mb-2">What gets synced:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>New appointments</li>
              <li>Appointment updates</li>
              <li>Cancellations</li>
              <li>Blocked time slots</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={loading}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleCalendarSyncModal;
