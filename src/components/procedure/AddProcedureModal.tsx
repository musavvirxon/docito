import { useEffect, useState, useRef } from "react";
import { DEFAULT_PROCEDURE_CATEGORIES, mergeCategories } from "@/lib/procedureCategories";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import ToothSelector from "./ToothSelector";
import { CalendarPlus, FileText, Upload, X, AlertCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Procedure name is required"),
  category: z.string().min(1, "Category is required"),
  default_cost: z.number().min(0, "Cost must be a positive number").optional(),
  notes: z.string().optional(),
  tooth_range: z.array(z.number()).optional(),

  has_followup: z.boolean().default(false),
  followup_count: z.number().min(1).max(10).optional(),
  followup_interval_days: z.number().min(1).max(365).optional(),

  requires_consent: z.boolean().default(false),
  consent_text: z.string().optional(),
});

interface AddProcedureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories?: { value: string; label: string }[];
  types?: { value: string; label: string }[];
  onOpenCategoryModal?: () => void;
  onOpenTypeModal?: () => void;
}

const AddProcedureModal = ({
  open,
  onOpenChange,
  onSuccess,
  categories: externalCategories = [],
}: AddProcedureModalProps) => {
  const [loading, setLoading] = useState(false);

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [hasFollowup, setHasFollowup] = useState(false);
  const [requiresConsent, setRequiresConsent] = useState(false);

  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dentistId, setDentistId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_PROCEDURE_CATEGORIES);
  const [customCategory, setCustomCategory] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      default_cost: undefined,
      notes: "",
      tooth_range: [],
      has_followup: false,
      followup_count: 1,
      followup_interval_days: 7,
      requires_consent: false,
      consent_text: "",
    },
  });

  // Load dentistId (doctors.id) and merge custom categories for this dentist
  useEffect(() => {
    const loadDentistAndCategories = async () => {
      if (!open) return;

      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;
      if (!authUser?.id) {
        setDentistId(null);
        // Still use external categories if provided
        if (externalCategories.length > 0) {
          setCategoryOptions(externalCategories);
        } else {
          setCategoryOptions(DEFAULT_PROCEDURE_CATEGORIES);
        }
        return;
      }

      const { data: doctor, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", authUser.id)
        .single();

      if (doctorError || !doctor?.id) {
        console.error(doctorError);
        toast.error("Doctor profile not found");
        setDentistId(null);
        if (externalCategories.length > 0) {
          setCategoryOptions(externalCategories);
        } else {
          setCategoryOptions(DEFAULT_PROCEDURE_CATEGORIES);
        }
        return;
      }

      setDentistId(doctor.id);

      // Pull existing categories for this dentist (includes custom values stored in DB)
      const { data: rows, error: catErr } = await supabase
        .from("procedures")
        .select("category")
        .eq("dentist_id", doctor.id);

      if (catErr) {
        console.error(catErr);
        if (externalCategories.length > 0) {
          setCategoryOptions(externalCategories);
        } else {
          setCategoryOptions(DEFAULT_PROCEDURE_CATEGORIES);
        }
        return;
      }

      const distinctFromDB = Array.from(
        new Set((rows ?? []).map((r: any) => r.category).filter(Boolean))
      ) as string[];

      // Also load from localStorage (custom categories)
      const savedCustomCategories = localStorage.getItem('customProcedureCategories');
      const localStorageCategories = savedCustomCategories ? JSON.parse(savedCustomCategories) : [];
      
      // Merge all sources: DEFAULT + DB + localStorage + external
      const allCustomValues = [
        ...distinctFromDB,
        ...localStorageCategories.map((c: { value: string }) => c.value),
        ...externalCategories.map(c => c.value),
      ];
      
      setCategoryOptions(mergeCategories(DEFAULT_PROCEDURE_CATEGORIES, allCustomValues));
    };

    loadDentistAndCategories();
  }, [open, externalCategories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, DOC, DOCX, or TXT file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setConsentFile(file);
  };

  const removeConsentFile = () => {
    setConsentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      if (!dentistId) {
        toast.error("Doctor profile not loaded");
        return;
      }

      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;

      const isDev =
        window.location.hostname.includes("localhost") ||
        window.location.hostname.includes("127.0.0.1");

      if (!isDev && !authUser) {
        toast.error("You must be logged in to create procedures");
        return;
      }

      const finalCategory =
        values.category === "__custom__" ? customCategory.trim() : values.category;

      if (!finalCategory) {
        toast.error("Please choose or enter a category");
        return;
      }

      let consentTemplate = values.consent_text || null;

      // Upload consent file if required
      if (consentFile && requiresConsent) {
        setUploadingFile(true);

        const fileExt = consentFile.name.split(".").pop() || "pdf";
        const filePath = `${authUser?.id || "dev-user"}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("medical-documents")
          .upload(filePath, consentFile);

        if (uploadError) {
          console.error("File upload error:", uploadError);
          toast.error("Failed to upload consent file");
        } else {
          const { data: pub } = supabase.storage
            .from("medical-documents")
            .getPublicUrl(filePath);

          const publicUrl = pub?.publicUrl;

          consentTemplate = consentTemplate
            ? `${consentTemplate}\n\n[Consent Document: ${consentFile.name}]\nFile URL: ${publicUrl}`
            : `[Consent Document: ${consentFile.name}]\nFile URL: ${publicUrl}`;
        }

        setUploadingFile(false);
      }

      const procedureData = {
        dentist_id: dentistId, // ✅ doctors.id (RLS-safe)
        name: values.name,
        category: finalCategory as any,
        type: hasFollowup ? "multi_visit" as any : "single_visit" as any,
        default_cost: values.default_cost || null,
        notes: values.notes || null,
        tooth_range: selectedTeeth.length > 0 ? selectedTeeth : null,
        informed_consent_template: requiresConsent ? consentTemplate : null,
        has_followup: hasFollowup,
        followup_count: hasFollowup ? values.followup_count : null,
        followup_interval_days: hasFollowup ? values.followup_interval_days : null,
      };

      const { error } = await supabase
        .from("procedures")
        .insert([procedureData]);

      if (error) throw error;

      toast.success("Procedure created successfully");

      form.reset();
      setSelectedTeeth([]);
      setHasFollowup(false);
      setRequiresConsent(false);
      setConsentFile(null);
      setCustomCategory("");

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to create procedure: " + (error?.message || "Unknown error"));
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTeeth([]);
    setHasFollowup(false);
    setRequiresConsent(false);
    setConsentFile(null);
    setCustomCategory("");
    onOpenChange(false);
  };

  const categoryValue = form.watch("category") || "";

  const showToothSelector =
    categoryValue.includes("dental") ||
    categoryValue.includes("restorative") ||
    categoryValue.includes("endodontic") ||
    categoryValue.includes("periodontic") ||
    categoryValue.includes("oral_surgery") ||
    categoryValue.includes("prosthodontic") ||
    categoryValue.includes("orthodontic") ||
    categoryValue.includes("implant");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Procedure</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedure Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dental Crown, Blood Test" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category*</FormLabel>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select treatment category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom…</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.watch("category") === "__custom__" && (
                    <div className="space-y-2 mt-2">
                      <Label>Custom Category</Label>
                      <Input
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="e.g., Specialized Therapy"
                      />
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default cost */}
            <FormField
              control={form.control}
              name="default_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Cost (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up */}
            <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4 text-blue-600" />
                    <Label htmlFor="followup-toggle" className="font-medium cursor-pointer">
                      Schedule Follow-up Appointments
                    </Label>
                  </div>
                  <Switch
                    id="followup-toggle"
                    checked={hasFollowup}
                    onCheckedChange={(checked) => {
                      setHasFollowup(checked);
                      form.setValue("has_followup", checked);
                    }}
                  />
                </div>

                {hasFollowup && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="followup_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Follow-ups</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={field.value ?? 1}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="followup_interval_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days Between Appointments</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              value={field.value ?? 7}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 7)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {hasFollowup && form.watch("followup_count") && form.watch("followup_interval_days") && (
                  <p className="text-sm text-muted-foreground">
                    {form.watch("followup_count")} follow-up appointment(s) will be suggested,
                    each {form.watch("followup_interval_days")} day(s) after the previous one.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Consent */}
            <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/20">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <Label htmlFor="consent-toggle" className="font-medium cursor-pointer">
                      Require Patient Consent
                    </Label>
                  </div>
                  <Switch
                    id="consent-toggle"
                    checked={requiresConsent}
                    onCheckedChange={(checked) => {
                      setRequiresConsent(checked);
                      form.setValue("requires_consent", checked);
                    }}
                  />
                </div>

                {requiresConsent && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-2 p-3 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Patient must read and accept this consent before the procedure can be performed.
                        If declined, you will receive an alert notification.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="consent_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consent Text</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter the informed consent text..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Or Upload Consent Document</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.txt"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Upload File
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          PDF, DOC, DOCX, or TXT (max 5MB)
                        </span>
                      </div>

                      {consentFile && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">{consentFile.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(consentFile.size / 1024).toFixed(1)} KB
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeConsentFile}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes about this procedure..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tooth selector */}
            {showToothSelector ? (
              <div>
                <FormLabel>Tooth Selection (Optional)</FormLabel>
                <div className="mt-2">
                  <ToothSelector
                    selectedTeeth={selectedTeeth}
                    onSelectionChange={setSelectedTeeth}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploadingFile}>
                {loading || uploadingFile ? "Creating..." : "Create Procedure"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProcedureModal;
