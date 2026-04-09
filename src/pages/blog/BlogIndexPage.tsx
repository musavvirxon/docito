import { Link, useParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Globe2, Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function BlogIndexPage() {
  const { t } = useTranslation('common');
  const { lang = "en" } = useParams<{ lang: string }>();

  return (
    <>
      <SEOHead
        title="Docito Blog"
        description="Docito Blog Studio foundation is wired. Static multilingual blog listing will be rendered here in the next implementation batches."
        type="website"
      />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
        <div className="space-y-4">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            Blog
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Docito Blog</h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              The public multilingual blog index route is now reserved and SEO-ready. The next messages will
              connect static repo content, featured posts, filters, related content, and discovery feeds.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                Blog index foundation
              </CardTitle>
              <CardDescription>
                Route placeholder registered at <span className="font-medium text-foreground">/{lang}/blog</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                The final version of this page will load published posts from static JSON files, show featured
                articles, support language-aware browsing, and expose internal links for SEO.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to={`/${lang}/blog/welcome-to-docito-blog-studio`}>
                    Open placeholder article
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/${lang}`}>
                    Return home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe2 className="h-4 w-4 text-primary" />
                Planned public features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/90">
              <p>• Featured posts</p>
              <p>• Cover images</p>
              <p>• Related posts by shared tags</p>
              <p>• Canonical and hreflang tags</p>
              <p>• RSS and sitemap generation</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
