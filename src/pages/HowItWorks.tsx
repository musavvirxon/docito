import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/SEOHead";
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernFooter from "@/components/home/ModernFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorks() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title={t("howItWorks.title", "How it works")}
        description={t(
          "howItWorks.description",
          "Learn how MedicalBook helps patients find doctors and book appointments."
        )}
      />

      <ModernNavbar />

      <main className="flex-1">
        <section className="container mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t("howItWorks.heading", "How it works")}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {t(
              "howItWorks.subheading",
              "A simple flow for patients, doctors, labs, pharmacies, and imaging centers."
            )}
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("howItWorks.step1.title", "1. Search")}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {t(
                  "howItWorks.step1.body",
                  "Find doctors, clinics, labs, pharmacies, and services by specialty, location, and availability."
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("howItWorks.step2.title", "2. Book")}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {t(
                  "howItWorks.step2.body",
                  "Choose a time slot and submit your booking request. Get confirmations and reminders."
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("howItWorks.step3.title", "3. Manage")}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {t(
                  "howItWorks.step3.body",
                  "Manage appointments, results, and notifications from your dashboard."
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <ModernFooter />
    </div>
  );
}
