import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, User, Stethoscope, Building2, Pill, FlaskConical, Scan } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuth } from "@/contexts/AuthContext";
import { AuthIllustration } from "@/components/Visuals/illustrations";
import { normalizeRole, type AppRole } from "@/lib/rbac";

type NameFieldCopy = {
  label: string;
  placeholder: string;
};

const getNameFieldCopy = (t: any, role: AppRole | null): NameFieldCopy => {
  switch (role) {
    case "clinic_admin":
    case "admin":
      return {
        label: t("auth.signUp.practiceName", "Clinic name"),
        placeholder: t("auth.signUp.practiceNamePlaceholder", "Enter clinic name"),
      };
    case "lab_admin":
      return {
        label: t("auth.signUp.labName", "Lab name"),
        placeholder: t("auth.signUp.labNamePlaceholder", "Enter lab name"),
      };
    case "pharmacy_admin":
      return {
        label: t("auth.signUp.pharmacyName", "Pharmacy name"),
        placeholder: t("auth.signUp.pharmacyNamePlaceholder", "Enter pharmacy name"),
      };
    case "imaging_admin":
      return {
        label: t("auth.signUp.imagingName", "Imaging center name"),
        placeholder: t("auth.signUp.imagingNamePlaceholder", "Enter imaging center name"),
      };
    default:
      return {
        label: t("auth.signUp.fullName", "Full Name"),
        placeholder: t("auth.signUp.fullNamePlaceholder", "Enter your full name"),
      };
  }
};

const isBlockedReturnTo = (returnTo: string | null) => {
  if (!returnTo || !returnTo.startsWith("/")) return true;

  try {
    const u = new URL(returnTo, "http://local");
    const p = u.pathname;

    // Never bounce users back into registration flows after login
    const blockedPrefixes = ["/register-practice", "/lab/register", "/pharmacy/register", "/imaging/register", "/auth"];
    return blockedPrefixes.some((bp) => p === bp || p.startsWith(`${bp}/`));
  } catch {
    return true;
  }
};

const Auth = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const [searchParams] = useSearchParams();

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

  const { signIn, signUp, user, loading: authLoading, activeRole, bootstrapped } = useAuth();

  const mode = searchParams.get("mode");
  const inviteParam = searchParams.get("invite");

  const allowedSignupRoles = new Set(["patient", "doctor", "admin", "pharmacy_admin", "lab_admin", "imaging_admin"]);
  const roleFromQuery = searchParams.get("role");
  const initialSignUpRole = roleFromQuery && allowedSignupRoles.has(roleFromQuery) ? roleFromQuery : "patient";

  const normalizedSignupRole = useMemo(() => normalizeRole(signUpRole), [signUpRole]);
  const nameFieldCopy = useMemo(() => getNameFieldCopy(t, normalizedSignupRole), [t, normalizedSignupRole]);

  const withLang = (path: string) => {
    if (!lang) return path;
    if (!path.startsWith("/")) return `/${lang}/${path}`;
    if (path === "/") return `/${lang}`;
    if (path.startsWith(`/${lang}/`) || path === `/${lang}`) return path;
    return `/${lang}${path}`;
  };

  const rawReturnTo = searchParams.get("returnTo") || searchParams.get("redirect") || null;
  const safeReturnTo = useMemo(() => {
    if (!rawReturnTo || !rawReturnTo.startsWith("/")) return null;
    try {
      // Prevent open redirects
      const u = new URL(rawReturnTo, "http://local");
      const p = u.pathname + (u.search || "") + (u.hash || "");
      return withLang(p);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawReturnTo, lang]);

  const goAfterAuth = () => {
    const token = inviteParam || sessionStorage.getItem("pending_staff_invite_token");
    if (token) {
      sessionStorage.removeItem("pending_staff_invite_token");
      navigate(withLang(`/accept-invite/${token}`), { replace: true });
      return;
    }

    const target = !isBlockedReturnTo(safeReturnTo) && safeReturnTo ? safeReturnTo : withLang("/dashboard");
    navigate(target, { replace: true });
  };

  useEffect(() => {
    if (mode === "register" || mode === "signup") {
      setActiveTab("signup");
      return;
    }
    if (mode === "signin") {
      setActiveTab("signin");
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "register" || mode === "signup") {
      setSignUpRole(initialSignUpRole);
    }
  }, [mode, initialSignUpRole]);

  const hasAutoRedirected = useRef(false);
  useEffect(() => {
    console.log("[Auth page] redirect check: bootstrapped=", bootstrapped, "authLoading=", authLoading, "user=", !!user, "activeRole=", activeRole, "hasAutoRedirected=", hasAutoRedirected.current);
    if (!bootstrapped) return;
    if (authLoading) return;
    if (!user) return;
    if (hasAutoRedirected.current) return;
    hasAutoRedirected.current = true;
    console.log("[Auth page] REDIRECTING now, activeRole=", activeRole);
    goAfterAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapped, authLoading, user, activeRole]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn(signInEmail, signInPassword);
      if (result.error) {
        // Error already shown via toast in signIn
      }
      // Don't navigate here — let the useEffect handle redirect after bootstrap completes
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
      const result = await signUp(signUpEmail, signUpPassword, {
        fullName: signUpFullName,
        role: signUpRole,
      });

      if (result.error) return;

      // If email confirmation is enabled, the user is not signed in yet.
      if (result.needsEmailConfirmation) {
        setActiveTab("signin");
        return;
      }

      // Don't navigate here — let the useEffect handle redirect after bootstrap completes
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
      case "clinic_admin":
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
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col items-center justify-center">
          <AuthIllustration className="w-full max-w-md" />
          <div className="mt-6 text-center">
            <h1 className="text-3xl font-bold text-foreground">{t("auth.appTitle")}</h1>
            <p className="text-muted-foreground mt-2">{t("auth.subtitle")}</p>
          </div>
        </div>

        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">{t("auth.welcome")}</CardTitle>
            <CardDescription>{t("auth.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.tabs.signIn")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.tabs.signUp")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
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
                  <Button type="submit" className="w-full" disabled={loading || authLoading}>
                    {loading || authLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth.signIn.buttonLoading")}
                      </>
                    ) : (
                      t("auth.signIn.button")
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">{t("auth.signUp.role")}</Label>
                    <Select value={signUpRole} onValueChange={setSignUpRole}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("auth.signUp.rolePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient">
                          <div className="flex items-center gap-2">
                            {getRoleIcon("patient")}
                            <span>{t("auth.roles.patient")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="doctor">
                          <div className="flex items-center gap-2">
                            {getRoleIcon("doctor")}
                            <span>{t("auth.roles.doctor")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            {getRoleIcon("admin")}
                            <span>{t("auth.roles.practice")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="pharmacy_admin">
                          <div className="flex items-center gap-2">
                            {getRoleIcon("pharmacy_admin")}
                            <span>{t("auth.roles.pharmacy")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="lab_admin">
                          <div className="flex items-center gap-2">
                            {getRoleIcon("lab_admin")}
                            <span>{t("auth.roles.lab")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="imaging_admin">
                          <div className="flex items-center gap-2">
                            {getRoleIcon("imaging_admin")}
                            <span>{t("auth.roles.imaging")}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">{nameFieldCopy.label}</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder={nameFieldCopy.placeholder}
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
                  <Button type="submit" className="w-full" disabled={loading || authLoading}>
                    {loading || authLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth.signUp.buttonLoading")}
                      </>
                    ) : (
                      t("auth.signUp.button")
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">{t("auth.footer")}</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
