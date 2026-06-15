import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: "patient" | "doctor" | "practice";
  mode?: "signin" | "signup";
}

const AuthModal = ({ isOpen, onClose, userType = "patient", mode = "signin" }: AuthModalProps) => {
  const { t } = useTranslation("common");
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
        title: t("authModal.toasts.signUpSuccessTitle"),
        description: t("authModal.toasts.signUpSuccessDesc"),
      });
      onClose();
    } catch (error: any) {
      toast({
        title: t("authModal.toasts.signUpFailedTitle"),
        description: t("authModal.toasts.signUpFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast({
        title: t("authModal.toasts.signInSuccessTitle"),
        description: t("authModal.toasts.signInSuccessDesc"),
      });
      onClose();
    } catch (error: any) {
      toast({
        title: t("authModal.toasts.signInFailedTitle"),
        description: t("authModal.toasts.signInFailedDesc"),
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
            <Label htmlFor="firstName">{t("authModal.fields.firstName")}</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="lastName">{t("authModal.fields.lastName")}</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="email">{t("authModal.fields.email")}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">{t("authModal.fields.password")}</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("authModal.actions.creating") : t("authModal.actions.signUp")}
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
          <Label htmlFor="signin-email" className="text-sm text-muted-foreground">{t("authModal.fields.emailAddress")}</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-12 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <div>
          <Label htmlFor="signin-password" className="text-sm text-muted-foreground">{t("authModal.fields.password")}</Label>
          <Input
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-12 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <Button
          type="submit"
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md"
          disabled={isLoading}
        >
          {isLoading ? t("authModal.actions.signingIn") : t("authModal.actions.signIn")}
        </Button>
      </form>
    );
  };

  const getTitle = () => {
    if (mode === "signin") {
      if (userType === "doctor") return t("authModal.titles.doctorSignIn");
      if (userType === "practice") return t("authModal.titles.practiceSignIn");
      return t("authModal.titles.signIn");
    }
    if (userType === "doctor") return t("authModal.titles.doctorRegistration");
    if (userType === "practice") return t("authModal.titles.practiceRegistration");
    return t("authModal.titles.patientRegistration");
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
