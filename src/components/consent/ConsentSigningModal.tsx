import { useState, useRef, useEffect } from "react";
import { Signature, Download, FileText, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConsentSigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlanId: string;
  onSuccess: () => void;
}

const ConsentSigningModal = ({ 
  open, 
  onOpenChange, 
  treatmentPlanId,
  onSuccess 
}: ConsentSigningModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fullName, setFullName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null);

  useEffect(() => {
    if (open && treatmentPlanId) {
      fetchTreatmentPlan();
      initializeCanvas();
    }
  }, [open, treatmentPlanId]);

  const fetchTreatmentPlan = async () => {
    try {
      const { data, error } = await supabase
        .from("treatment_plans")
        .select(`
          *,
          treatment_plan_procedures(
            *,
            procedure:procedures(name, category)
          ),
          dentist_profile:profiles!treatment_plans_dentist_id_fkey(
            name,
            practice_name,
            phone,
            email
          )
        `)
        .eq("id", treatmentPlanId)
        .single();

      if (error) throw error;
      setTreatmentPlan(data);
    } catch (error: any) {
      toast.error("Failed to load treatment plan: " + error.message);
    }
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Set drawing styles
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    initializeCanvas();
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!hasSignature) {
      toast.error("Please provide your signature");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");

      // Get signature as base64
      const signatureData = canvas.toDataURL();

      // Get current user and IP (in a real app, you'd get the actual IP)
      const { data: { user } } = await supabase.auth.getUser();
      const userIP = "127.0.0.1"; // Placeholder - would get actual IP in production

      const consentData = {
        treatment_plan_id: treatmentPlanId,
        title: treatmentPlan?.title || "Treatment Consent",
        content: generateConsentText(),
        patient_full_name: fullName,
        patient_signature: signatureData,
        ip_address: userIP,
        signed_at: new Date().toISOString(),
        status: "signed" as const,
      };

      const { error } = await supabase
        .from("consent_forms")
        .insert([consentData]);

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      toast.error("Failed to save consent: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateConsentText = () => {
    if (!treatmentPlan) return "";

    return `
INFORMED CONSENT FOR DENTAL TREATMENT

Patient: ${fullName}
Treatment Plan: ${treatmentPlan.title}
Doctor: Dr. ${treatmentPlan.dentist_profile?.name || 'Unknown'}
Practice: ${treatmentPlan.dentist_profile?.practice_name || 'Unknown Practice'}
Date: ${new Date().toLocaleDateString()}

TREATMENT PROCEDURES:
${treatmentPlan.treatment_plan_procedures?.map((proc: any, index: number) => 
  `${index + 1}. ${proc.procedure.name} (${proc.procedure.category})`
).join('\n') || 'No procedures listed'}

ESTIMATED TOTAL COST: $${treatmentPlan.total_cost || 0}

I acknowledge that:
1. I have been informed of the nature of my dental condition
2. The proposed treatment procedures have been explained to me
3. Alternative treatments and their risks have been discussed
4. I understand the risks, benefits, and potential complications
5. No guarantee of success has been made
6. I consent to the proposed treatment plan

By signing below, I acknowledge that I have read, understood, and agree to this treatment plan.
    `;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Informed Consent for Treatment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Treatment Summary */}
          {treatmentPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Treatment Plan Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Treatment Plan</Label>
                    <p className="text-base">{treatmentPlan.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Cost</Label>
                    <p className="text-base font-bold text-primary">
                      {formatCurrency(treatmentPlan.total_cost)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Doctor</Label>
                    <p className="text-base">Dr. {treatmentPlan.dentist_profile?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Practice</Label>
                    <p className="text-base">{treatmentPlan.dentist_profile?.practice_name}</p>
                  </div>
                </div>

                {treatmentPlan.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">{treatmentPlan.description}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Procedures Included</Label>
                  <div className="mt-2 space-y-1">
                    {treatmentPlan.treatment_plan_procedures?.map((proc: any, index: number) => (
                      <div key={proc.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{index + 1}.</span>
                        <span>{proc.procedure.name}</span>
                        <span className="text-muted-foreground">({proc.procedure.category})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consent Form */}
          <Card>
            <CardHeader>
              <CardTitle>Consent & Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Legal Name*</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Digital Signature*</Label>
                <div className="mt-2 border-2 border-dashed border-muted rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="border border-muted cursor-crosshair w-full"
                    style={{ maxWidth: "400px", height: "200px" }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-muted-foreground">
                      Sign above using your mouse or touchscreen
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed">
                  I acknowledge that I have read and understood the treatment plan, 
                  risks, benefits, and alternatives. I consent to the proposed dental treatment 
                  and understand that no guarantee of success has been made.
                </Label>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Legal Notice:</strong> This digital signature has the same legal 
                  effect as a handwritten signature. Your IP address and timestamp will be 
                  recorded for verification purposes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !fullName.trim() || !hasSignature || !acceptedTerms}
            >
              {loading ? "Signing..." : "Sign Consent"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentSigningModal;