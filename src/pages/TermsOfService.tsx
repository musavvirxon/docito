import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import SEO from "@/components/SEO/SEO";

const SUPPORT_EMAIL = "support@docito.app";

function normalizeMarkdown(value: unknown): string {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "string") return value;
  return String(value ?? "");
}

export default function TermsOfService() {
  const { t } = useTranslation(["common", "legal"]);
  const location = useLocation();

  const seoTitle = t("legal:tos.seoTitle");
  const seoDescription = t("legal:tos.seoDescription");

  const title = t("legal:tos.title");
  const effectiveDate = t("legal:tos.effectiveDate");
  const lastUpdated = t("legal:tos.lastUpdated");

  const contentRaw = t("legal:tos.content", { returnObjects: true }) as unknown;
  const content = normalizeMarkdown(contentRaw);

  const canonical = new URL(location.pathname, window.location.origin).toString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <SEO title={seoTitle} description={seoDescription} canonical={canonical} />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link to="/legal">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("legal:detail.backToLegal")}
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">{title}</h1>
              <p className="text-muted-foreground">
                {t("legal:detail.effectiveDate")}: {effectiveDate} • {t("legal:lastUpdated")}: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8">
            <ReactMarkdown>{content}</ReactMarkdown>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("legal:detail.questions")}{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
