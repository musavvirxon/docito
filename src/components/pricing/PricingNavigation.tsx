import { Button } from "@/components/ui/button";
import { Users, Stethoscope, Building2 } from "lucide-react";

interface PricingNavigationProps {
  onNavigate: (section: string) => void;
}

export const PricingNavigation = ({ onNavigate }: PricingNavigationProps) => {
  const sections = [
    { id: "patients", label: "For Patients", icon: Users },
    { id: "doctors", label: "For Doctors", icon: Stethoscope },
    { id: "clinics", label: "For Clinics", icon: Building2 },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <Button
            key={section.id}
            variant="outline"
            size="lg"
            className="gap-2 hover:bg-primary/10 hover:border-primary"
            onClick={() => {
              const element = document.getElementById(section.id);
              element?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Icon className="w-5 h-5" />
            {section.label}
          </Button>
        );
      })}
    </div>
  );
};
