import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Clock, DollarSign, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useProcedurePrescription } from "@/hooks/useProcedurePrescription";
import { toast } from "sonner";

interface ProcedureConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: any;
  onComplete: () => void;
}

export const ProcedureConsentModal = ({
  open,
  onOpenChange,
  notification,
  onComplete,
}: ProcedureConsentModalProps) => {
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { updateConsentStatus } = useProcedurePrescription();

  const data = notification.data;

  const handleAccept = async () => {
    if (!consentAgreed) {
      toast.error('Please agree to the consent terms before proceeding');
      return;
    }

    setIsProcessing(true);
    
    try {
      const signature = `Digital signature: ${new Date().toISOString()}`;
      const result = await updateConsentStatus(
        data.appointmentProcedureId,
        'accepted',
        signature
      );

      if (result.success) {
        toast.success('Procedure consent accepted successfully');
        onComplete();
      }
    } catch (error) {
      console.error('Error accepting consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    
    try {
      const result = await updateConsentStatus(
        data.appointmentProcedureId,
        'declined'
      );

      if (result.success) {
        toast.info('Procedure consent declined');
        onComplete();
      }
    } catch (error) {
      console.error('Error declining consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const defaultConsentText = `
INFORMED CONSENT FOR MEDICAL PROCEDURE

I understand that I am being recommended for the following procedure: ${data.procedureName}

DESCRIPTION OF THE PROCEDURE:
${data.procedureDescription || 'A medical procedure as prescribed by your healthcare provider.'}

RISKS AND BENEFITS:
All medical procedures carry some risk. Your doctor has determined that the benefits of this procedure outweigh the potential risks for your specific condition. Common risks may include but are not limited to:
- Discomfort or pain during or after the procedure
- Bleeding or infection
- Allergic reaction to medications or materials used
- Need for additional treatment

ALTERNATIVES:
Alternative treatments may be available. Discuss these options with your healthcare provider if you have questions.

FINANCIAL RESPONSIBILITY:
${data.estimatedCost ? `The estimated cost for this procedure is ${formatCurrency(data.estimatedCost)}.` : 'Costs will be discussed with your healthcare provider.'} 
You are responsible for any applicable co-payments, deductibles, or non-covered services.

CONSENT:
By signing below, I acknowledge that:
- I have read and understand this consent form
- My questions have been answered to my satisfaction
- I understand the risks, benefits, and alternatives
- I consent to the procedure described above

Patient Electronic Signature: ________________________________
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informed Consent - {data.procedureName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Procedure Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Procedure Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{data.procedureName}</h3>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  Requires Consent
                </Badge>
              </div>

              {data.procedureDescription && (
                <p className="text-muted-foreground">{data.procedureDescription}</p>
              )}

              {data.estimatedCost && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>Estimated Cost: {formatCurrency(data.estimatedCost)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consent Document */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Informed Consent Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {data.consentTemplate || defaultConsentText}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Consent Agreement */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="consent-agreement"
                  checked={consentAgreed}
                  onCheckedChange={(checked) => setConsentAgreed(checked === true)}
                  className="mt-1"
                />
                <div className="space-y-2">
                  <label 
                    htmlFor="consent-agreement" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I have read and agree to the terms of this procedure
                  </label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you are providing your electronic signature and consent 
                    for the procedure described above. This constitutes a legally binding agreement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            IP Address and timestamp will be recorded for legal purposes
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDecline}
              disabled={isProcessing}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Decline Procedure
            </Button>
            
            <Button 
              onClick={handleAccept}
              disabled={!consentAgreed || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Accept & Sign Consent'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};