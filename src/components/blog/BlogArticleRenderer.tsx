import { cn } from "@/lib/utils";
import type { BlogDoc } from "@/types/blog";
import type { CSSProperties, ReactNode } from "react";

type BlogNode = {
  type?: string;
  text?: string;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
};

interface BlogArticleRendererProps {
  doc: BlogDoc;
}

const alignClassMap: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

const getTextAlignClass = (value?: unknown) =>
  typeof value === "string" && alignClassMap[value] ? alignClassMap[value] : "";

const renderMarks = (
  text: string,
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>,
): ReactNode => {
  if (!marks?.length) return text;

  return marks.reduce<ReactNode>((acc, mark, index) => {
    const key = `${mark.type || "mark"}-${index}`;

    switch (mark.type) {
      case "bold":
        return <strong key={key}>{acc}</strong>;
      case "italic":
        return <em key={key}>{acc}</em>;
      case "underline":
        return <u key={key}>{acc}</u>;
      case "strike":
        return <s key={key}>{acc}</s>;
      case "link":
        return (
          <a
            key={key}
            href={String(mark.attrs?.href || "#")}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-4"
          >
            {acc}
          </a>
        );
      default:
        return <span key={key}>{acc}</span>;
    }
  }, text);
};

const renderInlineNodes = (nodes: BlogNode[] = []) =>
  nodes.map((node, index) => {
    if (node.type === "text") {
      return <span key={`text-${index}`}>{renderMarks(node.text || "", node.marks)}</span>;
    }

    if (node.type === "hardBreak") {
      return <br key={`break-${index}`} />;
    }

    return <span key={`node-${index}`}>{renderNode(node, index)}</span>;
  });

const renderListItemContent = (node: BlogNode, key: string) => {
  const content = node.content || [];

  if (content.length === 1 && content[0]?.type === "paragraph") {
    return <>{renderInlineNodes(content[0].content || [])}</>;
  }

  return content.map((child, index) => renderNode(child, `${key}-${index}`));
};

const renderImageNode = (node: BlogNode, key: string) => {
  const src = String(node.attrs?.src || "");
  const alt = String(node.attrs?.alt || "");
  const caption = String(node.attrs?.caption || "");

  if (!src) return null;

  return (
    <figure key={key} className="my-8 overflow-hidden rounded-2xl border border-border bg-card">
      <img src={src} alt={alt} className="w-full object-cover" />
      {caption ? (
        <figcaption className="px-4 py-3 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

const renderEmbedNode = (node: BlogNode, key: string) => {
  const src = String(node.attrs?.src || "");
  const caption = String(node.attrs?.caption || "");

  if (!src) return null;

  return (
    <figure key={key} className="my-8 space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <iframe
          src={src}
          loading="lazy"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video w-full"
          title={caption || "Embedded media"}
        />
      </div>
      {caption ? (
        <figcaption className="text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

const renderNode = (node: BlogNode, key: string | number): ReactNode => {
  const alignClass = getTextAlignClass(node.attrs?.textAlign);

  switch (node.type) {
    case "doc":
      return (
        <div key={String(key)} className="space-y-4">
          {(node.content || []).map((child, index) => renderNode(child, `doc-${index}`))}
        </div>
      );

    case "paragraph":
      return (
        <p
          key={String(key)}
          className={cn("text-base leading-8 text-foreground", alignClass)}
        >
          {renderInlineNodes(node.content || [])}
        </p>
      );

    case "heading": {
      const level = Number(node.attrs?.level || 2);
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      const className =
        level === 1
          ? "mt-10 text-4xl font-semibold tracking-tight text-foreground"
          : level === 2
            ? "mt-10 text-3xl font-semibold tracking-tight text-foreground"
            : "mt-8 text-2xl font-semibold tracking-tight text-foreground";

      return (
        <Tag key={String(key)} className={cn(className, alignClass)}>
          {renderInlineNodes(node.content || [])}
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul
          key={String(key)}
          className="my-4 list-disc space-y-2 pl-6 text-base leading-8 text-foreground"
        >
          {(node.content || []).map((child, index) =>
            renderNode(child, `bullet-${index}`),
          )}
        </ul>
      );

    case "orderedList":
      return (
        <ol
          key={String(key)}
          className="my-4 list-decimal space-y-2 pl-6 text-base leading-8 text-foreground"
        >
          {(node.content || []).map((child, index) =>
            renderNode(child, `ordered-${index}`),
          )}
        </ol>
      );

    case "listItem":
      return <li key={String(key)}>{renderListItemContent(node, String(key))}</li>;

    case "blogImage":
    case "image":
      return renderImageNode(node, String(key));

    case "blogEmbed":
      return renderEmbedNode(node, String(key));

    case "blockquote":
      return (
        <blockquote
          key={String(key)}
          className="my-6 rounded-r-2xl border-l-4 border-primary bg-primary/5 px-5 py-4 text-base leading-8 text-foreground"
        >
          {(node.content || []).map((child, index) =>
            renderNode(child, `quote-${index}`),
          )}
        </blockquote>
      );

    default:
      if (node.content?.length) {
        return (
          <div key={String(key)}>
            {node.content.map((child, index) => renderNode(child, `${key}-${index}`))}
          </div>
        );
      }

      if (node.text) {
        return <span key={String(key)}>{renderMarks(node.text, node.marks)}</span>;
      }

      return null;
  }
};

export default function BlogArticleRenderer({ doc }: BlogArticleRendererProps) {
  return (
    <article className="space-y-4">
      {renderNode((doc || { type: "doc", content: [] }) as BlogNode, "root")}
    </article>
  );
}
