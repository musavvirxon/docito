import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Repeat, Gem } from "lucide-react";

const SUBSCRIPTION_UZS_PER_USER = 100000;
const ONE_TIME_USD = 1200;

const formatUzs = (amount: number) =>
  new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(amount);

export const UzbekistanPricing = () => {
  const { t } = useTranslation("pricing_matrix");

  const getArray = (key: string): string[] => {
    const v = t(key, { returnObjects: true }) as unknown;
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  };

  const cards = [
    {
      key: "subscription" as const,
      icon: Repeat,
      price: `${formatUzs(SUBSCRIPTION_UZS_PER_USER)} UZS`,
      suffix: t("uz.subscription.suffix"),
      featured: true,
    },
    {
      key: "oneTime" as const,
      icon: Gem,
      price: `$${ONE_TIME_USD.toLocaleString("en-US")}`,
      suffix: t("uz.oneTime.suffix"),
      featured: false,
    },
  ];

  return (
    <section className="relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative rounded-3xl border border-border/60 bg-card/50 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.25] [background:radial-gradient(circle_at_20%_15%,hsl(var(--primary))_0%,transparent_40%),radial-gradient(circle_at_80%_10%,hsl(var(--primary))_0%,transparent_40%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>

        <div className="relative p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="px-3 py-1">
                <Sparkles className="mr-2 h-4 w-4" />
                {t("uz.badge")}
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t("uz.title")}</h2>
            <p className="text-muted-foreground max-w-2xl">{t("uz.subtitle")}</p>
          </motion.div>

          {/* Core inclusions */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-background/40 p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{t("matrix.included.title")}</div>
              <Badge variant="secondary">{t("matrix.included.badge")}</Badge>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {getArray("matrix.included.items").map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-foreground/90">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Two offers */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {cards.map((c) => {
              const Icon = c.icon;
              const features = getArray(`uz.${c.key}.features`);
              return (
                <motion.div
                  key={c.key}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    "rounded-3xl border bg-background/45 backdrop-blur p-6 flex flex-col",
                    "border-border/60 hover:border-primary/30 hover:shadow-sm",
                    c.featured && "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground">{t(`uz.${c.key}.name`)}</div>
                        <div className="text-xs text-muted-foreground">{t(`uz.${c.key}.tagline`)}</div>
                      </div>
                    </div>
                    {c.featured ? (
                      <Badge className="bg-primary/10 text-primary border border-primary/20">
                        {t("labels.mostPopular")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("labels.premium")}</Badge>
                    )}
                  </div>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{c.price}</span>
                    <span className="text-sm text-muted-foreground">{c.suffix}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                        <span className="text-foreground/90">{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-2 mt-auto">
                    <Button asChild className="w-full" variant={c.featured ? "default" : "outline"}>
                      <Link to="/contact">{t(`uz.${c.key}.cta`)}</Link>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">{t("uz.note")}</p>
        </div>
      </div>
    </section>
  );
};

export default UzbekistanPricing;
