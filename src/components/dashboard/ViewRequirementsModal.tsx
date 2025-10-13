import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FileText } from "lucide-react";

interface ViewRequirementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const verificationRequirements = [
  {
    category: "Business Documentation",
    items: [
      "Valid Business License or Operating Permit",
      "Tax Registration Certificate (Tax ID/VAT Number)",
      "Business Registration Certificate",
      "Proof of Business Address (utility bill or lease agreement)"
    ]
  },
  {
    category: "Professional Credentials",
    items: [
      "Medical/Dental Practice License",
      "Professional Liability Insurance Certificate",
      "DEA Registration (if applicable)",
      "Board Certification Documents"
    ]
  },
  {
    category: "Compliance Requirements",
    items: [
      "HIPAA Compliance Documentation",
      "OSHA Compliance Certificate (if applicable)",
      "Background Check Results for Practice Owner",
      "Facility Inspection Certificate (if applicable)"
    ]
  },
  {
    category: "Practice Information",
    items: [
      "Complete Practice Profile with accurate information",
      "Operating Hours and Availability",
      "Services and Specialties Offered",
      "Staff Credentials (for all providers)"
    ]
  }
];

const verificationProcess = [
  "Submit all required documents through the verification portal",
  "Our verification team reviews documents within 2-3 business days",
  "You'll receive email notification of approval or if additional information is needed",
  "Once approved, your practice will be visible to patients in search results",
  "Maintain updated credentials and re-verify annually"
];

export function ViewRequirementsModal({ open, onOpenChange }: ViewRequirementsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verification Requirements</DialogTitle>
          <DialogDescription>
            Complete guide to practice verification and documentation requirements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Required Documents by Category
            </h3>
            <div className="space-y-4">
              {verificationRequirements.map((req, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">{req.category}</h4>
                    <ul className="space-y-1.5">
                      {req.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Verification Process
            </h3>
            <Card>
              <CardContent className="p-4">
                <ol className="space-y-2">
                  {verificationProcess.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Important Notes:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All documents must be current and valid</li>
              <li>• Documents should be clear, legible scans or photos</li>
              <li>• Accepted formats: PDF, JPG, PNG (max 5MB per file)</li>
              <li>• Keep copies of all submitted documents for your records</li>
              <li>• Verification typically takes 2-3 business days</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}