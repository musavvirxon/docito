import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { buildBlogPostPath } from "@/lib/blog/public-loader";
import { CalendarDays, Sparkles, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import type { BlogPostRecord } from "@/types/blog";

interface BlogCardProps {
  post: BlogPostRecord;
  featuredVariant?: boolean;
}

export default function BlogCard({
  post,
  featuredVariant = false,
}: BlogCardProps) {
  const href = buildBlogPostPath(post.lang, post.slug);
  const publishDate = new Date(
    post.publishedAt || post.updatedAt || post.createdAt,
  ).toLocaleDateString();

  return (
    <Link to={href} className="block h-full">
      <Card
        className={`h-full overflow-hidden rounded-3xl border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
          featuredVariant ? "lg:grid lg:grid-cols-[1.15fr_1fr]" : ""
        }`}
      >
        <div className="relative overflow-hidden bg-muted/20">
          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className={`w-full object-cover transition-transform duration-300 hover:scale-[1.02] ${
                featuredVariant ? "h-full min-h-[280px]" : "h-56"
              }`}
            />
          ) : (
            <div className="flex h-56 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
              No cover image
            </div>
          )}

          {post.featured ? (
            <Badge className="absolute left-4 top-4 border-primary/20 bg-primary/90 text-primary-foreground">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Featured
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {publishDate}
              </span>
              <Badge variant="outline">{post.lang.toUpperCase()}</Badge>
            </div>

            <div>
              <h3
                className={`line-clamp-2 font-semibold text-foreground ${
                  featuredVariant ? "text-2xl" : "text-lg"
                }`}
              >
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {post.excerpt}
              </p>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.slice(0, featuredVariant ? 5 : 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="mt-auto text-sm font-medium text-primary">
            Read article →
          </CardFooter>
        </div>
      </Card>
    </Link>
  );
}
