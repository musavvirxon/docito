// Path: src/pages/Settings.tsx

import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import Header from "@/components/Header";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <SettingsPanel open={true} onOpenChange={() => {}} />
      </div>
    </div>
  );
};

export default Settings;
