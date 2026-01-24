// File: src/components/patient/MedicalHistory.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Calendar as CalendarIcon,
  FileText,
  User,
  Upload,
  Download,
  Eye,
  Search,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  X,
  Paperclip
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const medicalRecordSchema = z.object({
  title: z.string().min(1, "Title is required"),
  record_type: z.enum(["diagnosis", "condition", "examination", "note", "treatment"]),
  description: z.string().optional(),
  record_date: z.date(),
  doctor_name: z.string().optional(),
  doctor_phone: z.string().optional(),
  doctor_email: z.string().optional(),
  practice_name: z.string().optional()
});

type MedicalRecord = {
  id: string;
  title: string;
  record_type: string;
  description: string | null;
  record_date: string;
  added_by: string | null;
  status: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  doctor_email: string | null;
  practice_name: string | null;
  created_at: string | null;
};

type RecordAttachment = {
  id: string;
  record_id: string;
  patient_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

function sanitizeFileName(name: string) {
  // Keep simple + safe for storage path
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

const getRecordTypeIcon = (type: string) => {
  switch (type) {
    case "diagnosis":
      return <Stethoscope className="w-4 h-4" />;
    case "condition":
      return <Activity className="w-4 h-4" />;
    case "examination":
      return <FlaskConical className="w-4 h-4" />;
    case "treatment":
      return <Pill className="w-4 h-4" />;
    case "note":
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Verified</Badge>;
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          🟡 Pending
        </Badge>
      );
    case "rejected":
      return <Badge variant="destructive">❌ Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status || "unknown"}</Badge>;
  }
};

export default function MedicalHistory() {
  const { toast } = useToast();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [attachmentsByRecord, setAttachmentsByRecord] = useState<Record<string, RecordAttachment[]>>({});
  const [loading, setLoading] = useState(true);

  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<z.infer<typeof medicalRecordSchema>>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      title: "",
      record_type: "diagnosis",
      description: "",
      record_date: new Date(),
      doctor_name: "",
      doctor_phone: "",
      doctor_email: "",
      practice_name: ""
    }
  });

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", user.id)
        .order("record_date", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as MedicalRecord[];
      setRecords(rows);

      const recordIds = rows.map((r) => r.id);
      if (recordIds.length > 0) {
        await fetchAttachments(recordIds);
      } else {
        setAttachmentsByRecord({});
      }
    } catch (e) {
      console.error("Error fetching medical records:", e);
      toast({
        title: "Error",
        description: "Failed to load medical records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async (recordIds: string[]) => {
    try {
      const { data, error } = await (supabase as any)
        // table introduced by migration; keep TS happy without regenerating types
        .from("medical_record_attachments")
        .select("*")
        .in("record_id", recordIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const grouped: Record<string, RecordAttachment[]> = {};
      for (const row of (data || []) as unknown as RecordAttachment[]) {
        if (!grouped[row.record_id]) grouped[row.record_id] = [];
        grouped[row.record_id].push(row);
      }
      setAttachmentsByRecord(grouped);
    } catch (e) {
      console.error("Error fetching record attachments:", e);
      // Non-fatal; keep UI working
      setAttachmentsByRecord({});
    }
  };

  useEffect(() => {
    fetchMedicalRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesType = filterType === "all" || record.record_type === filterType;
      const matchesStatus = filterStatus === "all" || record.status === filterStatus;

      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        record.title.toLowerCase().includes(q) ||
        (record.description || "").toLowerCase().includes(q) ||
        (record.doctor_name || "").toLowerCase().includes(q) ||
        (record.practice_name || "").toLowerCase().includes(q);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [records, filterType, filterStatus, searchTerm]);

  const totalRecords = records.length;
  const verifiedRecords = records.filter((r) => r.status === "verified").length;
  const pendingRecords = records.filter((r) => r.status === "pending").length;
  const lastUpdate = records.length > 0 ? records[0].created_at : null;

  const onPickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const next = Array.from(files);
    const merged = [...selectedFiles, ...next];

    // Simple cap to keep UX + storage sane
    const capped = merged.slice(0, 10);

    setSelectedFiles(capped);
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const downloadAttachment = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from("medical-documents").createSignedUrl(filePath, 60 * 10);
      if (error) throw error;

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("Download error:", e);
      toast({
        title: "Download failed",
        description: "Could not generate a download link.",
        variant: "destructive"
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof medicalRecordSchema>) => {
    try {
      setSaving(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1) Create record with added_by set to the actual patient user id
      const { data: inserted, error: insertErr } = await supabase
        .from("medical_records")
        .insert({
          title: values.title,
          record_type: values.record_type,
          description: values.description || null,
          record_date: values.record_date.toISOString().split("T")[0],
          doctor_name: values.doctor_name || null,
          doctor_phone: values.doctor_phone || null,
          doctor_email: values.doctor_email || null,
          practice_name: values.practice_name || null,
          patient_id: user.id,
          added_by: user.id,
          status: "pending"
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      const recordId = inserted.id as string;

      // 2) Upload files (optional) to medical-documents bucket under the patient's folder
      for (const file of selectedFiles) {
        const safeName = sanitizeFileName(file.name);
        const filePath = `${user.id}/medical-records/${recordId}/${Date.now()}_${safeName}`;

        const { error: upErr } = await supabase.storage.from("medical-documents").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined
        });

        if (upErr) {
          console.error("Upload failed:", upErr);
          toast({
            title: "File upload failed",
            description: `${file.name}: ${upErr.message}`,
            variant: "destructive"
          });
          continue;
        }

        // 3) Save attachment metadata and attribute it to the patient (uploaded_by = auth.uid)
        const { error: metaErr } = await supabase.from("medical_record_attachments" as any).insert({
          record_id: recordId,
          patient_id: user.id,
          uploaded_by: user.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null
        });

        if (metaErr) {
          console.error("Attachment metadata insert failed:", metaErr);
          toast({
            title: "Attachment saved partially",
            description: `Uploaded ${file.name}, but failed to save metadata.`,
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Medical record added",
        description: "Your record has been submitted for verification."
      });

      form.reset();
      setSelectedFiles([]);
      setIsAddingRecord(false);
      await fetchMedicalRecords();
    } catch (e) {
      console.error("Error adding medical record:", e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to add medical record",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-green-600">{verifiedRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Last Update</p>
                <p className="text-sm font-medium">
                  {lastUpdate ? format(new Date(lastUpdate), "MMM dd, yyyy") : "No records"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="diagnosis">Diagnosis</SelectItem>
                  <SelectItem value="condition">Condition</SelectItem>
                  <SelectItem value="examination">Examination</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isAddingRecord} onOpenChange={(v) => !saving && setIsAddingRecord(v)}>
              <DialogTrigger asChild>
                <Button disabled={saving}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Medical Record</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Annual Physical Exam" {...field} disabled={saving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="record_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={saving}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="diagnosis">Diagnosis</SelectItem>
                                <SelectItem value="condition">Condition</SelectItem>
                                <SelectItem value="examination">Examination</SelectItem>
                                <SelectItem value="treatment">Treatment</SelectItem>
                                <SelectItem value="note">Note</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="record_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className="w-full pl-3 text-left font-normal" disabled={saving}>
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter details about this medical record..." {...field} disabled={saving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-medium">Attachments (Optional)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <label
                            htmlFor="record-files"
                            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Add files</span>
                          </label>
                          <input
                            id="record-files"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => onPickFiles(e.target.files)}
                            disabled={saving}
                          />
                          <p className="text-xs text-muted-foreground">Up to 10 files.</p>
                        </div>

                        {selectedFiles.length > 0 && (
                          <div className="rounded-md border p-3 space-y-2">
                            {selectedFiles.map((f, idx) => (
                              <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <p className="text-sm truncate">{f.name}</p>
                                    <p className="text-xs text-muted-foreground">{Math.round(f.size / 1024)} KB</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSelectedFile(idx)}
                                  disabled={saving}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Doctor Information (Optional)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="doctor_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doctor Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Dr. John Smith" {...field} disabled={saving} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="doctor_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doctor Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="+1 (555) 123-4567" {...field} disabled={saving} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="doctor_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doctor Email</FormLabel>
                              <FormControl>
                                <Input placeholder="doctor@clinic.com" {...field} disabled={saving} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="practice_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Practice/Clinic</FormLabel>
                              <FormControl>
                                <Input placeholder="Downtown Medical Center" {...field} disabled={saving} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsAddingRecord(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Add Record"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Medical History Timeline</span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No medical records found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Start by adding your first medical record"}
              </p>
              {!searchTerm && filterType === "all" && filterStatus === "all" && (
                <Button onClick={() => setIsAddingRecord(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Record
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredRecords.map((record, index) => {
                  const attachments = attachmentsByRecord[record.id] || [];
                  return (
                    <div key={record.id} className="flex space-x-4">
                      <div className="flex flex-col items-center">
                        <div className="bg-primary/10 p-2 rounded-full">{getRecordTypeIcon(record.record_type)}</div>
                        {index < filteredRecords.length - 1 && <div className="w-px h-16 bg-border mt-2" />}
                      </div>

                      <div className="flex-1 pb-8">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2 gap-3">
                              <div className="min-w-0">
                                <h4 className="font-semibold truncate">{record.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {record.record_date ? format(new Date(record.record_date), "MMM dd, yyyy") : "—"}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="capitalize">
                                  {record.record_type}
                                </Badge>
                                {getStatusBadge(record.status)}
                              </div>
                            </div>

                            {record.description && (
                              <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{record.description}</p>
                            )}

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>
                                    Added by{" "}
                                    {record.added_by && currentUserId && record.added_by === currentUserId ? "you" : "provider"}
                                  </span>
                                </div>

                                {record.doctor_name && (
                                  <div className="flex items-center space-x-1">
                                    <Stethoscope className="w-3 h-3" />
                                    <span>{record.doctor_name}</span>
                                  </div>
                                )}

                                {record.practice_name && (
                                  <div className="flex items-center space-x-1">
                                    <FileText className="w-3 h-3" />
                                    <span>{record.practice_name}</span>
                                  </div>
                                )}

                                {attachments.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <Paperclip className="w-3 h-3" />
                                    <span>
                                      {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" type="button">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {attachments.length > 0 && (
                              <div className="mt-4 rounded-md border p-3 space-y-2">
                                <p className="text-sm font-medium">Attachments</p>
                                <div className="space-y-2">
                                  {attachments.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                                        <div className="min-w-0">
                                          <p className="text-sm truncate">{a.file_name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {a.file_size ? `${Math.round(a.file_size / 1024)} KB` : "—"}
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadAttachment(a.file_path)}
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
