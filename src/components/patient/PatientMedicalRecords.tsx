// File: src/components/patient/PatientMedicalRecords.tsx

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Eye, Search, Calendar, User as UserIcon, Building2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface MedicalRecord {
  id: string;
  patient_id?: string;
  title: string;
  description: string | null;
  record_type: string;
  record_date: string;
  doctor_name: string | null;
  practice_name: string | null;
  status: string;
  created_at: string;
  added_by?: string | null;
  attachment_bucket?: string | null;
  attachment_paths?: string[] | null;
}

type AddRecordForm = {
  title: string;
  record_type: string;
  record_date: string;
  description: string;
  doctor_name: string;
  practice_name: string;
  files: FileList | null;
};

export const PatientMedicalRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const recordTypes = useMemo(
    () => [
      { value: "all", label: "All Records" },
      { value: "consultation", label: "Consultations" },
      { value: "lab_result", label: "Lab Results" },
      { value: "imaging", label: "Imaging" },
      { value: "prescription", label: "Prescriptions" },
      { value: "procedure", label: "Procedures" },
      { value: "diagnosis", label: "Diagnosis" },
      { value: "other", label: "Other" },
    ],
    [],
  );

  const [form, setForm] = useState<AddRecordForm>(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      title: "",
      record_type: "consultation",
      record_date: today,
      description: "",
      doctor_name: "",
      practice_name: "",
      files: null,
    };
  });

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", user?.id)
        .order("record_date", { ascending: false });

      if (error) throw error;
      setRecords((data || []) as any);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.doctor_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.practice_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || record.record_type === selectedType;
    return matchesSearch && matchesType;
  });

  const getRecordTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      consultation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      lab_result: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      imaging: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      prescription: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      procedure: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      diagnosis: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      other: "bg-muted text-muted-foreground",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setForm({
      title: "",
      record_type: "consultation",
      record_date: today,
      description: "",
      doctor_name: "",
      practice_name: "",
      files: null,
    });
  };

  const uploadFiles = async (files: FileList, prefix: string) => {
    if (!user) throw new Error("Not authenticated");

    const bucket = "patient-files";
    const paths: string[] = [];

    for (const file of Array.from(files)) {
      const safeName = file.name.replace(/[^\w.\-()+\s]/g, "_");
      const path = `${user.id}/${prefix}/${crypto.randomUUID()}_${safeName}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });
      if (error) throw error;
      paths.push(path);
    }

    return { bucket, paths };
  };

  const createRecord = async () => {
    if (!user) return;

    if (!form.title.trim() || !form.record_type.trim() || !form.record_date.trim()) {
      toast.error("Please fill required fields");
      return;
    }

    setSaving(true);
    try {
      let attachment_bucket = "patient-files";
      let attachment_paths: string[] = [];

      if (form.files && form.files.length > 0) {
        const up = await uploadFiles(form.files, "medical-records");
        attachment_bucket = up.bucket;
        attachment_paths = up.paths;
      }

      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        error?: string;
        record?: any;
      }>("patient-self-service", {
        body: {
          action: "add_medical_record",
          payload: {
            title: form.title.trim(),
            record_type: form.record_type,
            record_date: form.record_date,
            description: form.description.trim() ? form.description.trim() : null,
            doctor_name: form.doctor_name.trim() ? form.doctor_name.trim() : null,
            practice_name: form.practice_name.trim() ? form.practice_name.trim() : null,
            attachment_bucket,
            attachment_paths,
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to add medical record");

      toast.success("Medical record added");
      setAddOpen(false);
      resetForm();
      await fetchRecords();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add medical record");
    } finally {
      setSaving(false);
    }
  };

  const downloadAttachment = async (bucket: string, path: string) => {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "Failed to download file");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Medical Records</h2>
          <p className="text-muted-foreground">View and manage your medical history</p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={(v) => (saving ? null : setAddOpen(v))}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add medical record</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="mr_title">Title *</Label>
              <Input
                id="mr_title"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="e.g., Annual physical notes"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mr_type">Type *</Label>
                <Input
                  id="mr_type"
                  value={form.record_type}
                  onChange={(e) => setForm((s) => ({ ...s, record_type: e.target.value }))}
                  placeholder="e.g., consultation"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mr_date">Record date *</Label>
                <Input
                  id="mr_date"
                  type="date"
                  value={form.record_date}
                  onChange={(e) => setForm((s) => ({ ...s, record_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mr_doctor">Doctor name</Label>
                <Input
                  id="mr_doctor"
                  value={form.doctor_name}
                  onChange={(e) => setForm((s) => ({ ...s, doctor_name: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mr_practice">Practice name</Label>
                <Input
                  id="mr_practice"
                  value={form.practice_name}
                  onChange={(e) => setForm((s) => ({ ...s, practice_name: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mr_desc">Description</Label>
              <Textarea
                id="mr_desc"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Optional notes/details"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mr_files">Attachments (optional)</Label>
              <Input
                id="mr_files"
                type="file"
                multiple
                onChange={(e) => setForm((s) => ({ ...s, files: e.target.files }))}
              />
              <p className="text-xs text-muted-foreground">
                Files are uploaded to your private patient storage and marked as added by you.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                if (saving) return;
                setAddOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void createRecord()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {recordTypes.map((type) => (
          <Button
            key={type.value}
            variant={selectedType === type.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(type.value)}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">No Medical Records Found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || selectedType !== "all" ? "Try adjusting your filters" : "Add your first record using the Add button."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record) => {
            const addedByYou = Boolean(user?.id && record.added_by && record.added_by === user.id);

            const bucket = record.attachment_bucket || "patient-files";
            const paths = Array.isArray(record.attachment_paths) ? record.attachment_paths : [];
            const hasFiles = paths.length > 0;

            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{record.title}</h3>
                            <Badge className={cn("text-xs", getRecordTypeColor(record.record_type))}>
                              {record.record_type.replace("_", " ")}
                            </Badge>
                            {addedByYou && (
                              <Badge variant="secondary" className="text-xs">
                                Added by you
                              </Badge>
                            )}
                            {hasFiles && (
                              <Badge variant="outline" className="text-xs">
                                {paths.length} file{paths.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          {record.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{record.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(record.record_date), "MMM dd, yyyy")}</span>
                        </div>
                        {record.doctor_name && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            <span>{record.doctor_name}</span>
                          </div>
                        )}
                        {record.practice_name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span>{record.practice_name}</span>
                          </div>
                        )}
                      </div>

                      {hasFiles && (
                        <div className="flex flex-wrap gap-2">
                          {paths.slice(0, 3).map((p) => (
                            <Button
                              key={p}
                              variant="outline"
                              size="sm"
                              onClick={() => void downloadAttachment(bucket, p)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          ))}
                          {paths.length > 3 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{paths.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.message("Record preview is not implemented yet")}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasFiles}
                        onClick={() => {
                          if (!hasFiles) return;
                          void downloadAttachment(bucket, paths[0]);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
