import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, DollarSign, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { useRealTime } from "@/contexts/RealTimeContext";
import { ProcedureConsentModal } from "@/components/consent/ProcedureConsentModal";
import { toast } from "sonner";

export const RealTimeProcedureNotification = () => {
  const { notifications, markAsRead } = useRealTime();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [consentModalOpen, setConsentModalOpen] = useState(false);

  // Filter for procedure prescription notifications
  const procedureNotifications = notifications.filter(
    n => n.notification_type === 'procedure_prescribed'
  );

  const handleViewConsent = (notification: any) => {
    setSelectedNotification(notification);
    setConsentModalOpen(true);
  };

  const handleConsentComplete = () => {
    if (selectedNotification) {
      markAsRead(selectedNotification.id);
      setSelectedNotification(null);
    }
    setConsentModalOpen(false);
  };

  const handleDismissNotification = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (procedureNotifications.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {procedureNotifications.map((notification) => {
          const data = notification.data;
          
          return (
            <Card key={notification.id} className="border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    {notification.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissNotification(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your doctor has prescribed a new procedure that requires your review and consent.
                  </AlertDescription>
                </Alert>

                <div className="bg-white p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{data.procedureName}</h3>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      New Prescription
                    </Badge>
                  </div>

                  {data.procedureDescription && (
                    <p className="text-muted-foreground">{data.procedureDescription}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {data.estimatedCost && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span>Estimated Cost: {formatCurrency(data.estimatedCost)}</span>
                      </div>
                    )}

                    {data.consentRequired && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Consent Required</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {data.consentRequired ? (
                      <Button 
                        onClick={() => handleViewConsent(notification)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Review & Sign Consent
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => {
                          toast.success('Procedure accepted');
                          handleDismissNotification(notification.id);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Procedure
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        toast.info('Procedure declined');
                        handleDismissNotification(notification.id);
                      }}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Prescribed on {new Date(notification.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedNotification && (
        <ProcedureConsentModal
          open={consentModalOpen}
          onOpenChange={setConsentModalOpen}
          notification={selectedNotification}
          onComplete={handleConsentComplete}
        />
      )}
    </>
  );
};