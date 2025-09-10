import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, FileText, Shield, Building2, Users } from "lucide-react";

const ProcessingPractice = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    { icon: FileText, label: "Validating practice information", duration: 2000 },
    { icon: Shield, label: "Setting up security protocols", duration: 1500 },
    { icon: Building2, label: "Creating practice profile", duration: 1800 },
    { icon: Users, label: "Preparing admin dashboard", duration: 1200 },
  ];

  useEffect(() => {
    const processSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, steps[i].duration));
      }
      setIsComplete(true);
      setTimeout(() => {
        navigate("/admin-dashboard");
      }, 2000);
    };

    processSteps();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {isComplete ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isComplete ? "Setup Complete!" : "Setting Up Your Practice"}
            </h1>
            <p className="text-muted-foreground">
              {isComplete 
                ? "Redirecting to your admin dashboard..." 
                : "Please wait while we configure your account"
              }
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === index;
              const isCompleted = currentStep > index || isComplete;
              
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                    isActive 
                      ? "bg-primary/10 border border-primary/20" 
                      : isCompleted 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-muted/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? "bg-green-500 text-white" 
                      : isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isCompleted ? "text-green-700" : isActive ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {isComplete && (
            <div className="mt-6">
              <Button 
                onClick={() => navigate("/admin-dashboard")} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              This process usually takes 30-60 seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessingPractice;