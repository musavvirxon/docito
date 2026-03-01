import { Link, useParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Languages, Sparkles } from "lucide-react";

export default function BlogPostPage() {
  const { lang = "en", slug = "post" } = useParams<{ lang: string; slug: string }>();

  return (
    <>
      <SEOHead
        title="Docito Blog Article"
        description="Docito Blog article route placeholder. Static multilingual article rendering, SEO metadata, and related posts will be added in later implementation batches."
        type="article"
      />

      <article className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Blog Article
            </Badge>
            <Badge variant="outline">/{lang}/blog/{slug}</Badge>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Welcome to Docito Blog Studio
            </h1>
            <p className="text-base leading-7 text-muted-foreground md:text-lg">
              This placeholder confirms the public article route, SEO surface, and language-aware path contract.
              Later batches will swap this with static article rendering from repo files, translation alternates,
              structured article metadata, and related-post linking.
            </p>
          </div>
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What lands next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Static content loader, rich document rendering, cover image support, and related posts will be connected here.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Languages className="h-4 w-4 text-primary" />
                  Translation model
                </div>
                <p>One JSON file per language under a shared <span className="font-medium text-foreground">groupId</span>.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  SEO surface
                </div>
                <p>Canonical, hreflang alternates, OG image, Article schema, RSS, and sitemap.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link to={`/${lang}/blog`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to blog index
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to={`/${lang}`}>
                  Go to homepage
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </article>
    </>
  );
}
