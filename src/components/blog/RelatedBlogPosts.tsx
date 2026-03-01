import BlogCard from "@/components/blog/BlogCard";
import type { BlogPostRecord } from "@/types/blog";

interface RelatedBlogPostsProps {
  posts: BlogPostRecord[];
}

export default function RelatedBlogPosts({ posts }: RelatedBlogPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Related posts
        </h2>
        <p className="text-sm text-muted-foreground">
          More articles linked by shared topics and tags.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={`${post.groupId}-${post.lang}`} post={post} />
        ))}
      </div>
    </section>
  );
}
