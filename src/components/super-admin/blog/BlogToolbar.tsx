import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Youtube,
} from "lucide-react";

interface BlogToolbarProps {
  editor: Editor | null;
  onOpenImageDialog: () => void;
  onOpenEmbedDialog: () => void;
  onOpenLinkDialog: () => void;
}

const ToolbarButton = ({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    size="icon"
    variant={active ? "default" : "outline"}
    disabled={disabled}
    onClick={onClick}
    title={title}
    className="h-9 w-9"
  >
    {children}
  </Button>
);

export default function BlogToolbar({
  editor,
  onOpenImageDialog,
  onOpenEmbedDialog,
  onOpenLinkDialog,
}: BlogToolbarProps) {
  if (!editor) return null;

  const disabled = !editor.isEditable;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <ToolbarButton
        title="Undo"
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Redo"
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-8" />

      <ToolbarButton
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-8" />

      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Strike"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-8" />

      <ToolbarButton
        title="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-8" />

      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        title="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-8" />

      <ToolbarButton title="Insert link" onClick={onOpenLinkDialog}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton title="Insert image" onClick={onOpenImageDialog}>
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton title="Insert embed" onClick={onOpenEmbedDialog}>
        <Youtube className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
