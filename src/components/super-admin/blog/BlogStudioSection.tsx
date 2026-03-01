import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpenText, FileJson, Globe2, ShieldCheck, Sparkles } from "lucide-react";

const checklistItems = [
  "Repo-backed multilingual post groups with one file per language",
  "Draft-first editing flow with autosave and preview mode",
  "Publish checklist gate before GitHub PR submission",
  "Language-prefixed public routes for blog index and article pages",
  "SEO output with canonical tags, hreflang, sitemap, RSS, and Article schema",
];

export default function BlogStudioSection() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Blog Studio
            </Badge>
            <Badge variant="outline">Phase 1 foundation wired</Badge>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Docito Blog Studio</h1>
            <p className="max-w-3xl text-muted-foreground">
              This section is now registered inside Super Admin and the public blog routes are reserved.
              The next messages will fill in the static content model, secure publish pipeline, editor,
              checklist gate, and public rendering without reopening the dashboard shell.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" disabled>
            Preview Mode
          </Button>
          <Button disabled>Submit for Publish</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenText className="h-5 w-5 text-primary" />
              Delivery track
            </CardTitle>
            <CardDescription>
              Root wiring is in place first so the editor, loaders, publish flow, and public pages can be
              added without changing routes or the super-admin shell again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map((item, index) => (
              <div key={item} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-foreground">{item}</p>
                </div>
                {index < checklistItems.length - 1 ? <Separator /> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe2 className="h-4 w-4 text-primary" />
                Public URLs reserved
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>/en/blog</p>
              <p>/en/blog/:slug</p>
              <p className="text-foreground">Language-aware placeholders are active and ready for static content loading.</p>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Secure publish path
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Drafts stay local in the browser.</p>
              <p>Supabase is reserved for auth and RBAC only.</p>
              <p>Publishing will go through a server-side Edge Function and GitHub PR flow.</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileJson className="h-4 w-4 text-primary" />
                Static content contract
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/90">
              <p>Posts will live under <span className="font-medium">src/content/blog/posts/&lt;groupId&gt;/&lt;lang&gt;.json</span>.</p>
              <p>Assets will live under <span className="font-medium">public/blog/&lt;groupId&gt;/...</span>.</p>
              <p className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                The foundation is ready for the shared schema and static loader layer.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
