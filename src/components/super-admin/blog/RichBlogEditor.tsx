import { useEffect, useMemo, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import BlogToolbar from "@/components/super-admin/blog/BlogToolbar";
import BlogImageDialog, {
  type BlogImageInsertValue,
} from "@/components/super-admin/blog/BlogImageDialog";
import BlogEmbedDialog, {
  type BlogEmbedInsertValue,
} from "@/components/super-admin/blog/BlogEmbedDialog";
import { Button } from "@/components/ui/button";
import type { BlogDoc } from "@/types/blog";
import { Link2Off } from "lucide-react";

interface RichBlogEditorProps {
  value: BlogDoc;
  onChange: (value: BlogDoc) => void;
  assetOptions?: string[];
}

const BlogImageNode = Image.extend({
  name: "blogImage",
  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      title: { default: "" },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-blog-image]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      { class: "blog-editor-figure" },
      [
        "img",
        mergeAttributes(HTMLAttributes, {
          "data-blog-image": "true",
        }),
      ],
      HTMLAttributes.caption
        ? ["figcaption", { class: "blog-editor-caption" }, HTMLAttributes.caption]
        : ["figcaption", { class: "blog-editor-caption hidden" }, ""],
    ];
  },
});

const BlogEmbedNode = Node.create({
  name: "blogEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: "" },
      provider: { default: "embed" },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-blog-embed]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || "");
    const caption = String(HTMLAttributes.caption || "");

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-blog-embed": "true",
        class: "blog-editor-embed",
      }),
      [
        "iframe",
        {
          src,
          loading: "lazy",
          allowfullscreen: "true",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          referrerpolicy: "strict-origin-when-cross-origin",
        },
      ],
      caption
        ? ["div", { class: "blog-editor-caption" }, caption]
        : ["div", { class: "blog-editor-caption hidden" }, ""],
    ];
  },
});

const editorContentClassName = [
  "prose prose-sm dark:prose-invert max-w-none",
  "min-h-[360px] rounded-xl border border-border bg-background px-4 py-4",
  "focus-within:border-primary",
  "[&_figure]:my-4",
  "[&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground",
  "[&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border [&_iframe]:border-border",
  "[&_.ProseMirror]:min-h-[320px] [&_.ProseMirror]:outline-none",
].join(" ");

export default function RichBlogEditor({
  value,
  onChange,
  assetOptions = [],
}: RichBlogEditorProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder:
          "Write the article body here. Add headings, lists, images, links, and embeds.",
      }),
      BlogImageNode,
      BlogEmbedNode,
    ],
    content: value as JSONContent,
    editorProps: {
      attributes: {
        class: editorContentClassName,
      },
    },
    onUpdate({ editor: nextEditor }) {
      onChange(nextEditor.getJSON() as BlogDoc);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON() as BlogDoc;
    const incoming = value;
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming as JSONContent, { emitUpdate: false });
    }
  }, [editor, value]);

  const assetOptionValues = useMemo(() => assetOptions, [assetOptions]);

  const insertImage = (payload: BlogImageInsertValue) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "blogImage",
        attrs: {
          src: payload.src,
          alt: payload.alt,
          caption: payload.caption,
          title: payload.title,
        },
      })
      .run();
  };

  const insertEmbed = (payload: BlogEmbedInsertValue) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "blogEmbed",
        attrs: {
          src: payload.src,
          caption: payload.caption,
          provider: payload.provider,
        },
      })
      .run();
  };

  const handleOpenLinkDialog = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const nextUrl = window.prompt("Enter link URL", previousUrl || "");
    if (nextUrl === null) return;

    const cleaned = nextUrl.trim();
    if (!cleaned) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: cleaned }).run();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">Article body</div>
        <p className="text-xs text-muted-foreground">
          Supports headings, formatting, alignment, lists, links, images, and video/embed blocks.
        </p>
      </div>

      <BlogToolbar
        editor={editor}
        onOpenImageDialog={() => setImageOpen(true)}
        onOpenEmbedDialog={() => setEmbedOpen(true)}
        onOpenLinkDialog={handleOpenLinkDialog}
      />

      <EditorContent editor={editor} />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!editor?.isActive("link")}
          onClick={() => editor?.chain().focus().unsetLink().run()}
        >
          <Link2Off className="mr-2 h-4 w-4" />
          Remove link
        </Button>
      </div>

      <BlogImageDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        onInsert={insertImage}
        assetOptions={assetOptionValues}
      />

      <BlogEmbedDialog
        open={embedOpen}
        onOpenChange={setEmbedOpen}
        onInsert={insertEmbed}
      />
    </div>
  );
}
