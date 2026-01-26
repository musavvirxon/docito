// File: src/components/patient/PatientTestResultsSection.tsx

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TestTube2,
  Image as ImageIcon,
  Download,
  Eye,
  Calendar,
  AlertTriangle,
  Plus,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface LabResult {
  id: string;
  order_number: string;
  test_name: string;
  test_type: string;
  status: string;
  result_text: string | null;
  result_url: string | null;
  is_abnormal: boolean;
  reference_range: string | null;
  completed_at: string | null;
  created_at: string;
  clinic_id: string;
}

interface ImagingResult {
  id: string;
  order_number: string;
  exam_name: string;
  modality: string;
  status: string;
  findings: string | null;
  impression: string | null;
  result_url: string | null;
  result_images: string[] | null;
  completed_at: string | null;
  created_at: string;
  clinic_id: string;
}

type PatientUploadedResult = {
  id: string;
  patient_id: string;
  category: "lab" | "imaging" | "other";
  title: string;
  test_date: string;
  notes: string | null;
  attachment_bucket: string;
  attachment_paths: string[];
  created_at: string;
};

type AddUploadForm = {
  category: "lab" | "imaging" | "other";
  title: string;
  test_date: string;
  notes: string;
  files: FileList | null;
};

export const PatientTestResultsSection = () => {
  const { user } = useAuth();
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [imagingResults, setImagingResults] = useState<ImagingResult[]>([]);
  const [uploads, setUploads] = useState<PatientUploadedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lab" | "imaging" | "uploads">("lab");

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AddUploadForm>(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      category: "lab",
      title: "",
      test_date: today,
      notes: "",
      files: null,
    };
  });

  useEffect(() => {
    if (user) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchResults = async () => {
    try {
      setLoading(true);

      const [labRes, imagingRes, uploadsRes] = await Promise.all([
        supabase
          .from("clinic_lab_orders")
          .select("*")
          .eq("patient_id", user?.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
        supabase
          .from("clinic_imaging_orders")
          .select("*")
          .eq("patient_id", user?.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
        (supabase.from as any)("patient_test_results")
          .select("*")
          .eq("patient_id", user?.id)
          .order("test_date", { ascending: false }),
      ]);

      if (labRes.data) setLabResults(labRes.data as any);
      if (imagingRes.data) setImagingResults(imagingRes.data as any);

      const up = Array.isArray(uploadsRes.data) ? (uploadsRes.data as any[]) : [];
      setUploads(
        up.map((r) => ({
          id: String(r.id),
          patient_id: String(r.patient_id),
          category: r.category,
          title: String(r.title),
          test_date: String(r.test_date),
          notes: r.notes ?? null,
          attachment_bucket: String(r.attachment_bucket || "patient-files"),
          attachment_paths: Array.isArray(r.attachment_paths) ? r.attachment_paths : [],
          created_at: String(r.created_at || ""),
        })),
      );
    } catch (error) {
      console.error("Error fetching test results:", error);
    } finally {
      setLoading(false);
    }
  };

  const openUrl = (url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
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

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setForm({
      category: "lab",
      title: "",
      test_date: today,
      notes: "",
      files: null,
    });
  };

  const addUpload = async () => {
    if (!user) return;

    if (!form.title.trim() || !form.test_date.trim()) {
      toast.error("Please fill required fields");
      return;
    }

    setSaving(true);
    try {
      let attachment_bucket = "patient-files";
      let attachment_paths: string[] = [];

      if (form.files && form.files.length > 0) {
        const up = await uploadFiles(form.files, "test-results");
        attachment_bucket = up.bucket;
        attachment_paths = up.paths;
      }

      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        error?: string;
        test_result?: any;
      }>("patient-self-service", {
        body: {
          action: "add_test_result",
          payload: {
            category: form.category,
            title: form.title.trim(),
            test_date: form.test_date,
            notes: form.notes.trim() ? form.notes.trim() : null,
            attachment_bucket,
            attachment_paths,
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to add test result");

      toast.success("Test result added");
      setAddOpen(false);
      resetForm();
      await fetchResults();
      setActiveTab("uploads");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add test result");
    } finally {
      setSaving(false);
    }
  };

  const uploadCount = uploads.length;

  const titleBlock = useMemo(() => {
    return {
      title: "Test Results",
      subtitle: "View your laboratory and imaging results, and upload your own",
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">{titleBlock.title}</h2>
          <p className="text-muted-foreground">{titleBlock.subtitle}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={(v) => (saving ? null : setAddOpen(v))}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add test result</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tr_category">Category *</Label>
              <Input
                id="tr_category"
                value={form.category}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    category: (e.target.value as any) || "lab",
                  }))
                }
                placeholder="lab / imaging / other"
              />
              <p className="text-xs text-muted-foreground">Use: lab, imaging, or other</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tr_title">Title *</Label>
              <Input
                id="tr_title"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="e.g., CBC Panel"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tr_date">Test date *</Label>
              <Input
                id="tr_date"
                type="date"
                value={form.test_date}
                onChange={(e) => setForm((s) => ({ ...s, test_date: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tr_notes">Notes</Label>
              <Textarea
                id="tr_notes"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tr_files">Attachments (optional)</Label>
              <Input
                id="tr_files"
                type="file"
                multiple
                onChange={(e) => setForm((s) => ({ ...s, files: e.target.files }))}
              />
              <p className="text-xs text-muted-foreground">
                Files are uploaded privately and will be marked as added by you.
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
            <Button onClick={() => void addUpload()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="lab" className="gap-2">
            <TestTube2 className="h-4 w-4" />
            Lab Results
            {labResults.length > 0 && <Badge variant="secondary" className="ml-1">{labResults.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="imaging" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Imaging
            {imagingResults.length > 0 && <Badge variant="secondary" className="ml-1">{imagingResults.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="uploads" className="gap-2">
            <FileText className="h-4 w-4" />
            My uploads
            {uploadCount > 0 && <Badge variant="secondary" className="ml-1">{uploadCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab" className="mt-6">
          {labResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TestTube2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Lab Results</h3>
                <p className="text-muted-foreground text-sm">Your completed lab test results will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {labResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "p-2 rounded-lg",
                              result.is_abnormal ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20",
                            )}
                          >
                            <TestTube2 className={cn("h-5 w-5", result.is_abnormal ? "text-red-600" : "text-green-600")} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold">{result.test_name}</h3>
                              {result.is_abnormal && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Abnormal
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {result.test_type} • {result.order_number}
                            </p>
                          </div>
                        </div>

                        {result.result_text && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm font-medium mb-1">Result</p>
                            <p className="text-sm">{result.result_text}</p>
                            {result.reference_range && (
                              <p className="text-xs text-muted-foreground mt-1">Reference: {result.reference_range}</p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {result.completed_at ? format(new Date(result.completed_at), "MMM dd, yyyy") : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openUrl(result.result_url)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {result.result_url && (
                          <Button variant="outline" size="sm" onClick={() => openUrl(result.result_url)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="imaging" className="mt-6">
          {imagingResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Imaging Results</h3>
                <p className="text-muted-foreground text-sm">Your completed imaging results will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {imagingResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                            <ImageIcon className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold">{result.exam_name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {result.modality}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{result.order_number}</p>
                          </div>
                        </div>

                        {(result.findings || result.impression) && (
                          <div className="space-y-2">
                            {result.findings && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-medium mb-1">Findings</p>
                                <p className="text-sm">{result.findings}</p>
                              </div>
                            )}
                            {result.impression && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-medium mb-1">Impression</p>
                                <p className="text-sm">{result.impression}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {result.completed_at ? format(new Date(result.completed_at), "MMM dd, yyyy") : "Pending"}
                            </span>
                          </div>
                          {result.result_images && result.result_images.length > 0 && (
                            <span>{result.result_images.length} image(s)</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openUrl(result.result_url)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {result.result_url && (
                          <Button variant="outline" size="sm" onClick={() => openUrl(result.result_url)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="uploads" className="mt-6">
          {uploads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No uploads yet</h3>
                <p className="text-muted-foreground text-sm">Use the Add button to upload your own test results</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {uploads.map((u) => {
                const files = Array.isArray(u.attachment_paths) ? u.attachment_paths : [];
                return (
                  <Card key={u.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold">{u.title}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {u.category}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Added by you
                                </Badge>
                                {files.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {files.length} file{files.length > 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                              {u.notes && <p className="text-sm text-muted-foreground line-clamp-2">{u.notes}</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(u.test_date), "MMM dd, yyyy")}</span>
                            </div>
                          </div>

                          {files.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {files.slice(0, 3).map((p) => (
                                <Button
                                  key={p}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void downloadAttachment(u.attachment_bucket || "patient-files", p)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              ))}
                              {files.length > 3 && (
                                <span className="text-xs text-muted-foreground self-center">
                                  +{files.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.message("Upload preview is not implemented yet")}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={files.length === 0}
                            onClick={() => {
                              if (files.length === 0) return;
                              void downloadAttachment(u.attachment_bucket || "patient-files", files[0]);
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
