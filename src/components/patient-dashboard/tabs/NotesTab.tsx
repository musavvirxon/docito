import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Pin,
  PinOff,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_pinned: boolean;
  is_private: boolean;
  tags: string[];
  author_name?: string;
}

interface NotesTabProps {
  notes: Note[];
  onAddNote: (note: {
    content: string;
    is_private: boolean;
    tags: string[];
  }) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const NotesTab = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
}: NotesTabProps) => {
  const { t, i18n } = useTranslation("patients");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({
    content: "",
    is_private: true,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");

  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const regularNotes = notes.filter((n) => !n.is_pinned);

  const availableTags = [
    { value: "important", label: t("tabs.notes.tagOptions.important"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    { value: "follow-up", label: t("tabs.notes.tagOptions.followUp"), color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    { value: "urgent", label: t("tabs.notes.tagOptions.urgent"), color: "bg-destructive/10 text-destructive" },
    { value: "medication", label: t("tabs.notes.tagOptions.medication"), color: "bg-primary/10 text-primary" },
    { value: "treatment", label: t("tabs.notes.tagOptions.treatment"), color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  ];

  const getTagStyle = (tag: string) => {
    const found = availableTags.find((t) => t.value === tag);
    return found?.color || "bg-muted text-muted-foreground";
  };

  const handleAddTag = (tag: string) => {
    if (!newNote.tags.includes(tag)) {
      setNewNote({ ...newNote, tags: [...newNote.tags, tag] });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewNote({ ...newNote, tags: newNote.tags.filter((t) => t !== tag) });
  };

  const handleSubmit = () => {
    if (newNote.content.trim()) {
      onAddNote(newNote);
      setNewNote({ content: "", is_private: true, tags: [] });
      setShowAddModal(false);
    }
  };

  const NoteCard = ({ note }: { note: Note }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <Card
        className={`relative hover:shadow-md transition-shadow ${
          note.is_pinned ? "ring-2 ring-primary/20" : ""
        }`}
      >
        {note.is_pinned && (
          <div className="absolute -top-2 -right-2">
            <div className="p-1.5 rounded-full bg-primary text-primary-foreground shadow-sm">
              <Pin className="w-3 h-3" />
            </div>
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {note.is_private && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Lock className="w-3 h-3" />
                  {t("tabs.notes.private")}
                </Badge>
              )}
              {note.tags.map((tag) => (
                <Badge key={tag} variant="outline" className={`text-xs ${getTagStyle(tag)}`}>
                  {tag}
                </Badge>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTogglePin(note.id)}>
                  {note.is_pinned ? (
                    <>
                      <PinOff className="w-4 h-4 mr-2" />
                      {t("tabs.notes.unpin")}
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4 mr-2" />
                      {t("tabs.notes.pin")}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingNote(note)}>
                  <Edit className="w-4 h-4 mr-2" />
                  {t("tabs.notes.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteNote(note.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("tabs.notes.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {note.content}
          </p>

          <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(note.created_at).toLocaleDateString(i18n.language)}{" "}
              {new Date(note.created_at).toLocaleTimeString(i18n.language, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {note.author_name && <span>{t("tabs.notes.by", { name: note.author_name })}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("tabs.notes.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("tabs.notes.privateHint")}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("tabs.notes.add")}
        </Button>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">{t("tabs.notes.emptyTitle")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("tabs.notes.emptyDesc")}
            </p>
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("tabs.notes.addFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Pin className="w-4 h-4" />
                {t("tabs.notes.pinned")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {pinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Regular Notes */}
          {regularNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {t("tabs.notes.all")}
                </h3>
              )}
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                  <AnimatePresence>
                    {regularNotes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Add Note Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("tabs.notes.addModalTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder={t("tabs.notes.placeholder")}
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              rows={6}
              className="resize-none"
            />

            <div>
              <p className="text-sm font-medium mb-2">{t("tabs.notes.tags")}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {newNote.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`cursor-pointer ${getTagStyle(tag)}`}
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags
                  .filter((t) => !newNote.tags.includes(t.value))
                  .map((tag) => (
                    <Button
                      key={tag.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tag.value)}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag.label}
                    </Button>
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private"
                checked={newNote.is_private}
                onChange={(e) =>
                  setNewNote({ ...newNote, is_private: e.target.checked })
                }
                className="rounded"
              />
              <label htmlFor="private" className="text-sm">
                {t("tabs.notes.privateLabel")}
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              {t("tabs.notes.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!newNote.content.trim()}>
              {t("tabs.notes.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default NotesTab;
