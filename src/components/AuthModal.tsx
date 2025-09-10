import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: "patient" | "doctor" | "practice";
  mode?: "signin" | "signup";
}

const AuthModal = ({ isOpen, onClose, userType = "patient", mode = "signin" }: AuthModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            user_type: userType,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const SignUpForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSignUp(email, password, firstName, lastName);
    };

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Sign Up"}
        </Button>
      </form>
    );
  };

  const SignInForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSignIn(email, password);
    };

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="signin-email" className="text-sm text-muted-foreground">Email Address</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-12 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            required
          />
        </div>
        <div>
          <Label htmlFor="signin-password" className="text-sm text-muted-foreground">Password</Label>
          <Input
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-12 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            required
          />
        </div>
        <Button 
          type="submit" 
          className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md" 
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>
      </form>
    );
  };

  const getTitle = () => {
    const action = mode === "signin" ? "Sign In" : "Registration";
    switch (userType) {
      case "doctor":
        return mode === "signin" ? "Doctor Sign In" : "Doctor Registration";
      case "practice":
        return mode === "signin" ? "Private Practice Sign In" : "Private Practice Registration";
      default:
        return mode === "signin" ? "Sign In" : "Patient Registration";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-muted/95 backdrop-blur-sm">
        <div className="relative bg-background rounded-lg m-4 p-6">
          
          {mode === "signin" ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground">{getTitle()}</h2>
              </div>
              <SignInForm />
              <div className="flex items-center justify-center space-x-4">
                <button className="w-12 h-12 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <span className="text-xl font-bold">G</span>
                </button>
                <button className="w-12 h-12 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <span className="text-xl font-bold">f</span>
                </button>
                <button className="w-12 h-12 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <span className="text-xl font-bold">■</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground">{getTitle()}</h2>
              </div>
              <SignUpForm />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;