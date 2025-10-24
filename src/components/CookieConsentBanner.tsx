import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Cookie, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsentBanner() {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkCookieConsent();
  }, [user]);

  const checkCookieConsent = async () => {
    // Check localStorage for non-authenticated users
    const localConsent = localStorage.getItem('cookie-consent');
    if (localConsent) {
      setShowBanner(false);
      return;
    }

    // Check database for authenticated users
    if (user) {
      const { data } = await supabase
        .from('cookie_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPreferences({
          essential: data.essential,
          analytics: data.analytics,
          marketing: data.marketing,
        });
        setShowBanner(false);
      } else {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  };

  const savePreferences = async (prefs: CookiePreferences) => {
    setSaving(true);
    try {
      if (user) {
        // Save to database for authenticated users
        const { error } = await supabase
          .from('cookie_preferences')
          .upsert({
            user_id: user.id,
            essential: prefs.essential,
            analytics: prefs.analytics,
            marketing: prefs.marketing,
          });

        if (error) throw error;
      } else {
        // Save to localStorage for non-authenticated users
        localStorage.setItem('cookie-consent', JSON.stringify(prefs));
      }

      setShowBanner(false);
      setShowSettings(false);
      toast.success('Cookie preferences saved');
    } catch (error) {
      console.error('Error saving cookie preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    savePreferences(allAccepted);
  };

  const handleAcceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(essentialOnly);
    savePreferences(essentialOnly);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-4">
        <Card className="max-w-4xl mx-auto border-primary/20 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 mt-1">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">We Value Your Privacy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We use cookies to enhance your browsing experience, provide personalized content, 
                  and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleAcceptAll} disabled={saving}>
                    Accept All
                  </Button>
                  <Button variant="outline" onClick={handleAcceptEssential} disabled={saving}>
                    Essential Only
                  </Button>
                  <Button variant="ghost" onClick={() => setShowSettings(true)}>
                    Customize
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie Settings</DialogTitle>
            <DialogDescription>
              Customize your cookie preferences below. Essential cookies are required for the platform to function.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Essential Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Required for login and core functionality
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Analytics Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Help us improve the platform
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Marketing Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Personalized content and ads
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveCustom} disabled={saving} className="flex-1">
              Save Preferences
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
