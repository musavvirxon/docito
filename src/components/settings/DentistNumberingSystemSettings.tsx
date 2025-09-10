import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

type ToothNumberingSystem = "international_fdi" | "universal" | "palmer";

interface DentistSettings {
  id: string;
  default_tooth_numbering: ToothNumberingSystem;
  practice_name?: string;
  practice_email?: string;
  practice_phone?: string;
  practice_address?: string;
}

const DentistNumberingSystemSettings = () => {
  const [settings, setSettings] = useState<DentistSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<ToothNumberingSystem>("international_fdi");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to access settings");
        return;
      }

      const { data, error } = await supabase
        .from("dentist_settings")
        .select("*")
        .eq("dentist_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
        setSelectedSystem(data.default_tooth_numbering);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          dentist_id: user.id,
          default_tooth_numbering: "international_fdi" as ToothNumberingSystem,
        };

        const { data: newSettings, error: createError } = await supabase
          .from("dentist_settings")
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) throw createError;
        
        setSettings(newSettings);
        setSelectedSystem(newSettings.default_tooth_numbering);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("dentist_settings")
        .update({
          default_tooth_numbering: selectedSystem,
          updated_at: new Date().toISOString()
        })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({
        ...settings,
        default_tooth_numbering: selectedSystem
      });

      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getSystemDescription = (system: ToothNumberingSystem) => {
    switch (system) {
      case "international_fdi":
        return "FDI World Dental Federation notation (11-18, 21-28, 31-38, 41-48)";
      case "universal":
        return "American Dental Association notation (1-32 for permanent teeth)";
      case "palmer":
        return "Palmer notation using quadrant symbols (1-8 with quadrant indicators)";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
            <span>Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tooth Numbering System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="numbering-system">Default Tooth Numbering System</Label>
            <Select value={selectedSystem} onValueChange={(value: ToothNumberingSystem) => setSelectedSystem(value)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select numbering system" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="international_fdi">
                  FDI (International)
                </SelectItem>
                <SelectItem value="universal">
                  Universal (American)
                </SelectItem>
                <SelectItem value="palmer">
                  Palmer Notation
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {getSystemDescription(selectedSystem)}
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">System Examples:</h4>
            <div className="space-y-1 text-sm">
              <div><strong>FDI:</strong> Upper right first molar = 16</div>
              <div><strong>Universal:</strong> Upper right first molar = 3</div>
              <div><strong>Palmer:</strong> Upper right first molar = 6⁺ (6 upper right)</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving || selectedSystem === settings?.default_tooth_numbering}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DentistNumberingSystemSettings;