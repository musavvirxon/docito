import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useSimpleForm } from "@/hooks/useSimpleForm";
import { useQuickNavigate } from "@/hooks/useQuickNavigate";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SignUp = () => {
  const { toast } = useToast();
  const { quickNavigate, navigateToPatientDashboard, isDevMode } = useQuickNavigate();
  
  const {
    formData,
    updateField,
    fillDummyData,
    isLoading,
    setIsLoading,
    handleSubmit,
    canFillDummy
  } = useSimpleForm({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: ""
  }, 'patient');

  const handleSignUp = async (data: typeof formData) => {
    // Check for URL parameter to preserve redirect after signup
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    
    let emailRedirectTo = `${window.location.origin}/`;
    
    // If there's a returnTo parameter, include it in the email redirect
    if (returnTo) {
      // Validate returnTo URL to prevent open redirects
      const validPaths = ['/book-appointment/', '/doctor/', '/search-results', '/patient-dashboard'];
      const isValidPath = validPaths.some(path => returnTo.startsWith(path));
      
      if (isValidPath) {
        emailRedirectTo = `${window.location.origin}${returnTo}`;
      }
    }
    
    const submitData = {
      email: data.email || 'temp@example.com',
      password: data.password || 'temppassword123',
      options: {
        emailRedirectTo,
        data: {
          first_name: data.firstName || '',
          last_name: data.lastName || '',
          date_of_birth: data.dateOfBirth || '',
          sex: data.sex || '',
          user_type: 'patient',
        }
      }
    };

    const { error } = await supabase.auth.signUp(submitData);
    if (error) throw error;

    // Store the redirect URL for after email confirmation
    if (returnTo) {
      const validPaths = ['/book-appointment/', '/doctor/', '/search-results', '/patient-dashboard'];
      const isValidPath = validPaths.some(path => returnTo.startsWith(path));
      
      if (isValidPath) {
        localStorage.setItem('postSignupRedirect', returnTo);
      }
    }
    
    // Store pending doctor data if it exists (legacy flow)
    const pendingDoctor = localStorage.getItem('pendingDoctorVisit');
    if (pendingDoctor && !returnTo) {
      try {
        const doctorData = JSON.parse(pendingDoctor);
        localStorage.setItem('postSignupRedirect', `/book-appointment/${doctorData.id}`);
        localStorage.removeItem('pendingDoctorVisit');
      } catch (error) {
        console.error('Error parsing pending doctor data:', error);
      }
    }

    toast({
      title: "Account created successfully!",
      description: "Please check your email and click the confirmation link to complete your registration.",
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(handleSignUp, { skipValidation: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <div className="bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                <span className="text-foreground font-bold text-lg">Z</span>
              </div>
              <span className="text-xl font-semibold text-foreground">Zocdoc</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {isDevMode && (
            <Alert className="mb-6 bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                🚧 Development Mode: All fields are optional for quick testing
              </AlertDescription>
            </Alert>
          )}
          
          <h1 className="text-3xl font-semibold text-center mb-8 text-foreground">
            Create an account
          </h1>

          {canFillDummy && (
            <div className="mb-6 text-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={fillDummyData}
                className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
              >
                🎭 Fill Dummy Data
              </Button>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email {!isDevMode && "(Optional)"}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="mt-1 h-12"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password {!isDevMode && "(Optional)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="mt-1 h-12"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                  Legal first name {!isDevMode && "(Optional)"}
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className="mt-1 h-12"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                  Legal last name {!isDevMode && "(Optional)"}
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className="mt-1 h-12"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">
                Date of birth {!isDevMode && "(Optional)"}
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                className="mt-1 h-12"
                placeholder="mm/dd/yyyy"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Sex {!isDevMode && "(Optional)"}</Label>
              <RadioGroup 
                value={formData.sex} 
                onValueChange={(value) => updateField('sex', value)} 
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="text-sm text-foreground cursor-pointer">
                    Male
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="text-sm text-foreground cursor-pointer">
                    Female
                  </Label>
                </div>
              </RadioGroup>
              <Link 
                to="#" 
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Add more sex & gender info (optional)
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-foreground font-medium text-base rounded-md"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;