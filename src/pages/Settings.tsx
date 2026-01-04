import { SettingsPanel } from "@/components/dashboard/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <SettingsPanel open={true} onOpenChange={() => {}} />
      </div>
    </div>
  );
}
