import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Feature {
  name: string;
  access: boolean | string;
  prime: boolean | string;
  elite: boolean | string;
}

export const FeatureComparisonTable = () => {
  const patientFeatures: Feature[] = [
    { name: "Doctor Search & Booking", access: true, prime: true, elite: true },
    { name: "Medical Records Storage", access: "100 MB", prime: "10 GB", elite: "50 GB" },
    { name: "Appointment Reminders", access: true, prime: true, elite: true },
    { name: "Secure Messaging", access: true, prime: true, elite: true },
    { name: "Prescription View", access: false, prime: true, elite: true },
    { name: "Priority Booking", access: false, prime: true, elite: true },
    { name: "Health Timeline", access: false, prime: true, elite: true },
    { name: "Cloud Backup", access: false, prime: false, elite: true },
    { name: "Multi-device Sync", access: false, prime: false, elite: true },
    { name: "Dedicated Support", access: false, prime: false, elite: true },
    { name: "AI Features Early Access", access: false, prime: false, elite: true },
  ];

  const renderValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <Card className="max-w-7xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl text-center">
          Compare Patient Plans
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 font-semibold">Feature</th>
                <th className="text-center p-4 font-semibold">Access</th>
                <th className="text-center p-4 font-semibold">Prime</th>
                <th className="text-center p-4 font-semibold">Elite</th>
              </tr>
            </thead>
            <tbody>
              {patientFeatures.map((feature, index) => (
                <tr
                  key={index}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="p-4 text-sm">{feature.name}</td>
                  <td className="p-4 text-center">{renderValue(feature.access)}</td>
                  <td className="p-4 text-center">{renderValue(feature.prime)}</td>
                  <td className="p-4 text-center">{renderValue(feature.elite)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
