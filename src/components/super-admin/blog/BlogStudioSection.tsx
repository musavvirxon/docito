import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useBlogStudio } from "@/hooks/blog/useBlogStudio";
import { stringifyBlogStudioDraftExport } from "@/lib/blog/studio-api";
import type { BlogLanguage } from "@/types/blog";
import BlogDeleteDialog from "@/components/super-admin/blog/BlogDeleteDialog";
import BlogEditorShell from "@/components/super-admin/blog/BlogEditorShell";
import BlogFiltersBar from "@/components/super-admin/blog/BlogFiltersBar";
import BlogJsonDialog from "@/components/super-admin/blog/BlogJsonDialog";
import BlogPostList from "@/components/super-admin/blog/BlogPostList";
import BlogPreviewPanel from "@/components/super-admin/blog/BlogPreviewPanel";
import BlogStatusPanel from "@/components/super-admin/blog/BlogStatusPanel";
import { BookOpenText, Github, Languages, ShieldCheck } from "lucide-react";

export default function BlogStudioSection() {
  const { toast } = useToast();
  const studio = useBlogStudio();
  const [jsonOpen, setJsonOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportJson = useMemo(
    () => (studio.activeDraft ? stringifyBlogStudioDraftExport(studio.activeDraft) : ""),
    [studio.activeDraft],
  );

  const handleCreateDraft = () => {
    const draft = studio.createDraft();
    studio.setSelectedGroupId(draft.groupId);
    toast({
      title: "Draft created",
      description: `Created local draft ${draft.groupId}.`,
    });
  };

  const handleOpenGroup = async (groupId: string) => {
    await studio.openGroup(groupId);
  };

  const handleCopyJson = async () => {
    if (!exportJson) return;

    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      toast({
        title: "JSON copied",
        description: "The draft export has been copied to your clipboard.",
      });

      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access failed. Copy the JSON manually from the dialog.",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    try {
      const result = await studio.publishActiveDraft({
        title: studio.activeDraft
          ? `blog: submit ${studio.activeDraft.groupId} for publish`
          : undefined,
        body: studio.activeDraft
          ? `Automated Blog Studio publish request for \`${studio.activeDraft.groupId}\`.`
          : undefined,
      });

      toast({
        title: "Publish request submitted",
        description: `Pull request #${result.pullRequest.number} created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Publish request failed",
        description: error instanceof Error ? error.message : "Unexpected publish error.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const result = await studio.deleteSelectedGroup();
      setDeleteOpen(false);
      toast({
        title: "Delete request submitted",
        description: `Pull request #${result.pullRequest.number} created for ${result.groupId}.`,
      });
    } catch (error) {
      toast({
        title: "Delete request failed",
        description: error instanceof Error ? error.message : "Unexpected delete error.",
        variant: "destructive",
      });
    }
  };

  const handleChangeLanguage = async (
    lang: BlogLanguage,
    mode: "active" | "preview" = "active",
  ) => {
    await studio.selectLanguage(lang, mode);
  };

  const activeTranslation = studio.activeDraft
    ? studio.activeDraft.translations[studio.activeDraft.activeLanguage]
    : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
                <BookOpenText className="mr-1.5 h-3.5 w-3.5" />
                Blog Studio
              </Badge>
              <Badge variant="outline">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Super admin only
              </Badge>
              <Badge variant="outline">
                <Github className="mr-1.5 h-3.5 w-3.5" />
                PR-based publish flow
              </Badge>
              <Badge variant="outline">
                <Languages className="mr-1.5 h-3.5 w-3.5" />
                11 languages
              </Badge>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Docito Blog Studio
              </h1>
              <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
                The admin route is now wired to a stable Blog Studio shell with list filtering,
                draft creation, local draft persistence, shared-field editing, JSON export, preview
                state, and secure publish/delete actions through the Supabase Edge Function.
              </p>
            </div>
          </div>
        </div>

        <BlogFiltersBar
          query={studio.filters.query}
          onQueryChange={studio.filters.setQuery}
          status={studio.filters.status}
          onStatusChange={studio.filters.setStatus}
          tag={studio.filters.tag}
          onTagChange={studio.filters.setTag}
          featured={studio.filters.featured}
          onFeaturedChange={studio.filters.setFeatured}
          lang={studio.filters.lang}
          onLangChange={studio.filters.setLang}
          source={studio.filters.source}
          onSourceChange={studio.filters.setSource}
          availableTags={studio.filters.availableTags}
          counts={studio.filters.counts}
          onCreateDraft={handleCreateDraft}
          onReset={studio.filters.resetFilters}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <BlogPostList
              items={studio.filteredRows}
              selectedGroupId={studio.selectedGroupId}
              onSelect={handleOpenGroup}
              isLoading={studio.contentQuery.isLoading}
            />
          </div>

          <div className="xl:col-span-5">
            <BlogEditorShell
              draft={studio.activeDraft}
              onChangeLanguage={handleChangeLanguage}
              onChangeGroupId={(value) => {
                void studio.updateActiveSharedFields({ groupId: value });
              }}
              onChangeTitle={(value) => {
                if (!studio.activeDraft) return;
                void studio.updateActiveTranslation(studio.activeDraft.activeLanguage, {
                  title: value,
                });
              }}
              onChangeExcerpt={(value) => {
                if (!studio.activeDraft) return;
                void studio.updateActiveTranslation(studio.activeDraft.activeLanguage, {
                  excerpt: value,
                });
              }}
              onChangeCoverImage={(value) => {
                void studio.updateActiveSharedFields({ coverImage: value });
              }}
              onChangeTags={(value) => {
                const tags = value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                void studio.updateActiveSharedFields({ tags });
              }}
              onChangeFeatured={(value) => {
                void studio.updateActiveSharedFields({ featured: value });
              }}
              onDuplicate={() => {
                void studio.duplicateActiveDraft();
              }}
              onAutofillSeo={() => {
                if (!studio.activeDraft) return;
                studio.drafts.autofillSeo(studio.activeDraft.draftId);
                toast({
                  title: "SEO autofilled",
                  description: "Meta title, description, keywords, and OG image were filled where empty.",
                });
              }}
              onOpenJson={() => setJsonOpen(true)}
              onOpenDelete={() => setDeleteOpen(true)}
            />
          </div>

          <div className="space-y-6 xl:col-span-3">
            <BlogStatusPanel
              draft={studio.activeDraft}
              checklist={studio.checklist.checklist}
              isPublishing={studio.publishMutation.isPending}
              onPublish={handlePublish}
            />

            <BlogPreviewPanel previewState={studio.preview} />

            {activeTranslation ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="text-sm font-semibold text-foreground">Quick context</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Active title:</span>{" "}
                      {activeTranslation.title || "Missing"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Slug:</span>{" "}
                      {activeTranslation.slug || "Missing"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Tags:</span>{" "}
                      {activeTranslation.tags.length ? activeTranslation.tags.join(", ") : "None"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      <BlogJsonDialog
        open={jsonOpen}
        onOpenChange={setJsonOpen}
        json={exportJson}
        copied={copied}
        onCopy={handleCopyJson}
      />

      <BlogDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        groupId={studio.activeDraft?.groupId || studio.selectedGroupId}
        isDeleting={studio.deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
