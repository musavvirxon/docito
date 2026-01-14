import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  User,
  Stethoscope,
  Building2,
  Pill,
  FlaskConical,
  Scan,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthIllustration } from "@/components/Visuals/illustrations";
import { DASHBOARD_ROUTES, getDashboardRoute } from "@/lib/rbac";

const Auth = () => {
  const { t } = useTranslation("auth");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");

  // Sign In Form
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpRole, setSignUpRole] = useState<string>("patient");

  const { signIn, signUp, user, profile, activeRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnToParam = searchParams.get("returnTo");
  const safeReturnTo = returnToParam && returnToParam.startsWith("/") ? returnToParam : null;

  const getDashboardPath = () => {
    // Prefer activeRole picked by AuthContext (it already resolves priority correctly)
    const byActive = DASHBOARD_ROUTES[activeRole];
    if (byActive) return byActive;

    // Fallback based on roles array
    const roles = profile?.roles || [];
    return getDashboardRoute(roles);
  };

  useEffect(() => {
    if (user && profile) {
      const pendingInviteToken = sessionStorage.getItem("pending_staff_invite_token");
      if (pendingInviteToken) {
        sessionStorage.removeItem("pending_staff_invite_token");
        navigate(`/accept-invite/${pendingInviteToken}`);
        return;
      }

      // Use returnTo if provided, otherwise go to correct role dashboard
      navigate(safeReturnTo || getDashboardPath());
    }
  }, [user, profile, activeRole, navigate, safeReturnTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(signInEmail, signInPassword);
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(signUpEmail, signUpPassword, {
        fullName: signUpFullName,
        role: signUpRole,
      });
    } catch (error) {
      console.error("Sign up error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "doctor":
        return <Stethoscope className="w-5 h-5" />;
      case "admin":
        return <Building2 className="w-5 h-5" />;
      case "pharmacy_admin":
        return <Pill className="w-5 h-5" />;
      case "lab_admin":
        return <FlaskConical className="w-5 h-5" />;
      case "imaging_admin":
        return <Scan className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <AuthIllustration
            variant={activeTab === "signin" ? "signin" : "signup"}
            className="w-40 h-40"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {t("auth.appTitle")}
          </h1>
          <p className="text-muted-foreground">{t("auth.appSubtitle")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t("auth.tabs.signIn")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth.tabs.signUp")}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>{t("auth.signIn.title")}</CardTitle>
                <CardDescription>{t("auth.signIn.description")}</CardDescription>
              </CardHeader>

              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t("auth.signIn.email")}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t("auth.signIn.emailPlaceholder")}
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t("auth.signIn.password")}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t("auth.signIn.passwordPlaceholder")}
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>

                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("auth.signIn.buttonLoading")}
                      </>
                    ) : (
                      t("auth.signIn.button")
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>{t("auth.signUp.title")}</CardTitle>
                <CardDescription>{t("auth.signUp.description")}</CardDescription>
              </CardHeader>

              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t("auth.signUp.fullName")}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t("auth.signUp.fullNamePlaceholder")}
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t("auth.signUp.email")}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t("auth.signUp.emailPlaceholder")}
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t("auth.signUp.password")}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t("auth.signUp.passwordPlaceholder")}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-role">{t("auth.signUp.accountType")}</Label>
                    <Select value={signUpRole} onValueChange={setSignUpRole}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(signUpRole)}
                          <SelectValue placeholder={t("auth.signUp.accountTypePlaceholder")} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {t("auth.signUp.roles.patient", "Patient")}
                          </div>
                        </SelectItem>
                        <SelectItem value="doctor">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4" />
                            {t("auth.signUp.roles.doctor", "Doctor")}
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {t("auth.signUp.roles.admin", "Clinic Admin")}
                          </div>
                        </SelectItem>
                        <SelectItem value="pharmacy_admin">
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4" />
                            {t("auth.signUp.roles.pharmacyAdmin", "Pharmacy Admin")}
                          </div>
                        </SelectItem>
                        <SelectItem value="lab_admin">
                          <div className="flex items-center gap-2">
                            <FlaskConical className="w-4 h-4" />
                            {t("auth.signUp.roles.labAdmin", "Lab Admin")}
                          </div>
                        </SelectItem>
                        <SelectItem value="imaging_admin">
                          <div className="flex items-center gap-2">
                            <Scan className="w-4 h-4" />
                            {t("auth.signUp.roles.imagingAdmin", "Imaging Center Admin")}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("auth.signUp.buttonLoading")}
                      </>
                    ) : (
                      t("auth.signUp.button")
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">{t("auth.footer.terms")}</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
