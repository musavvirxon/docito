import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface Feature {
  name: string;
  access: boolean | string;
  prime: boolean | string;
  elite: boolean | string;
}
export const FeatureComparisonTable = () => {
  const patientFeatures: Feature[] = [{
    name: "Doctor Search & Booking",
    access: true,
    prime: true,
    elite: true
  }, {
    name: "Medical Records Storage",
    access: "100 MB",
    prime: "10 GB",
    elite: "50 GB"
  }, {
    name: "Appointment Reminders",
    access: true,
    prime: true,
    elite: true
  }, {
    name: "Secure Messaging",
    access: true,
    prime: true,
    elite: true
  }, {
    name: "Prescription View",
    access: false,
    prime: true,
    elite: true
  }, {
    name: "Priority Booking",
    access: false,
    prime: true,
    elite: true
  }, {
    name: "Health Timeline",
    access: false,
    prime: true,
    elite: true
  }, {
    name: "Cloud Backup",
    access: false,
    prime: false,
    elite: true
  }, {
    name: "Multi-device Sync",
    access: false,
    prime: false,
    elite: true
  }, {
    name: "Dedicated Support",
    access: false,
    prime: false,
    elite: true
  }, {
    name: "AI Features Early Access",
    access: false,
    prime: false,
    elite: true
  }];
  const renderValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? <Check className="w-5 h-5 text-primary mx-auto" /> : <X className="w-5 h-5 text-muted-foreground mx-auto" />;
    }
    return <span className="text-sm font-medium">{value}</span>;
  };
  return <Card className="max-w-7xl mx-auto">
      
      
    </Card>;
};