import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/hooks/useCurrency";
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
import { CalendarPlus, FileText, Upload, X, AlertCircle, Package, Plus, Trash2, Building2, User as UserIcon } from "lucide-react";
import { useMergedInventory, getStockStatus, getUseStatus } from "@/hooks/useClinicInventory";

const PROCEDURE_CATEGORY_ALIASES: Record<string, string> = {
  surgical: "oral_surgery",
  periodontal: "periodontic",
};

const normalizeProcedureCategory = (value: string) => PROCEDURE_CATEGORY_ALIASES[value] || value;

const buildFormSchema = (t: (k: string, d?: string) => string) => z.object({
  name: z.string().min(1, t("validation.nameRequired", "Procedure name is required")),
  code: z.string().max(32, t("validation.codeTooLong", "Code is too long")).optional(),
  category: z.string().min(1, t("validation.categoryRequired", "Category is required")),
  default_cost: z.number().min(0, t("validation.costPositive", "Cost must be a positive number")).optional(),
  notes: z.string().optional(),
  tooth_range: z.array(z.number()).optional(),

  has_followup: z.boolean().default(false),
  followup_count: z.number().min(1).max(10).optional(),
  followup_interval_days: z.number().min(1).max(365).optional(),

  requires_consent: z.boolean().default(false),
  consent_text: z.string().optional(),
});

type ProcedureFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

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
  const { t } = useTranslation("procedures");
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [hasFollowup, setHasFollowup] = useState(false);
  const [requiresConsent, setRequiresConsent] = useState(false);

  const [consentFile, setConsentFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dentistId, setDentistId] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_PROCEDURE_CATEGORIES);
  const [customCategory, setCustomCategory] = useState("");

  // Inventory linkage state
  const [selectedInventory, setSelectedInventory] = useState<
    { inventoryId: string; quantity: number; entityScope: string }[]
  >([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerItemId, setPickerItemId] = useState("");
  const [pickerQty, setPickerQty] = useState(1);

  const { items: mergedInventory } = useMergedInventory(practiceId, dentistId);

  const formSchema = useMemo(() => buildFormSchema(t as any), [t]);

  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
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
        .select("id, practice_id")
        .eq("user_id", authUser.id)
        .single();

      if (doctorError || !doctor?.id) {
        console.error(doctorError);
        toast.error(t("toasts.doctorNotFound", "Doctor profile not found"));
        setDentistId(null);
        setPracticeId(null);
        if (externalCategories.length > 0) {
          setCategoryOptions(externalCategories);
        } else {
          setCategoryOptions(DEFAULT_PROCEDURE_CATEGORIES);
        }
        return;
      }

      setDentistId(doctor.id);
      setPracticeId((doctor as any).practice_id ?? null);

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
      toast.error(t("toasts.invalidFileType", "Please upload a PDF, DOC, DOCX, or TXT file"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("toasts.fileTooLarge", "File size must be less than 5MB"));
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

  const onSubmit = async (values: ProcedureFormValues) => {
    setLoading(true);
    try {
      if (!dentistId) {
        toast.error(t("toasts.doctorNotLoaded", "Doctor profile not loaded"));
        return;
      }

      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;

      const isDev =
        window.location.hostname.includes("localhost") ||
        window.location.hostname.includes("127.0.0.1");

      if (!isDev && !authUser) {
        toast.error(t("toasts.mustBeLoggedIn", "You must be logged in to create procedures"));
        return;
      }

      const finalCategory =
        normalizeProcedureCategory(values.category === "__custom__" ? customCategory.trim() : values.category);

      if (!finalCategory) {
        toast.error(t("toasts.chooseCategory", "Please choose or enter a category"));
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
          toast.error(t("toasts.uploadFailed", "Failed to upload consent file"));
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
        code: values.code?.trim() ? values.code.trim() : null,
        category: finalCategory as any,
        type: hasFollowup ? "multi_visit" as any : "single_visit" as any,
        default_cost: values.default_cost || null,
        currency,
        notes: values.notes || null,
        tooth_range: selectedTeeth.length > 0 ? selectedTeeth : null,
        informed_consent_template: requiresConsent ? consentTemplate : null,
        has_followup: hasFollowup,
        followup_count: hasFollowup ? values.followup_count : null,
        followup_interval_days: hasFollowup ? values.followup_interval_days : null,
      };

      const { data: createdProc, error } = await supabase
        .from("procedures")
        .insert([procedureData])
        .select("id")
        .single();

      if (error) throw error;

      // Persist inventory requirements
      if (selectedInventory.length > 0 && createdProc?.id) {
        const rows = selectedInventory
          .map((sel) => {
            const inv = mergedInventory.find((m) => m.id === sel.inventoryId);
            if (!inv) return null;
            return {
              entity_id: inv.entity_id,
              procedure_id: createdProc.id,
              procedure_name: values.name,
              inventory_id: sel.inventoryId,
              quantity_required: sel.quantity,
            };
          })
          .filter(Boolean);
        if (rows.length) {
          const { error: reqErr } = await (supabase as any)
            .from("procedure_inventory_requirements")
            .insert(rows);
          if (reqErr) {
            console.error("inventory linkage failed", reqErr);
            toast.warning(t("toasts.inventoryAttachFailed", "Procedure created, but failed to attach some inventory items"));
          }
        }
      }

      toast.success(t("toasts.created", "Procedure created successfully"));

      form.reset();
      setSelectedTeeth([]);
      setHasFollowup(false);
      setRequiresConsent(false);
      setConsentFile(null);
      setCustomCategory("");
      setSelectedInventory([]);

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`${t("toasts.createFailed", "Failed to create procedure")}: ${error?.message || t("toasts.unknownError", "Unknown error")}`);
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
    setSelectedInventory([]);
    onOpenChange(false);
  };

  const categoryValue = form.watch("category") || "";

  const showToothSelector =
    categoryValue.includes("dental") ||
    categoryValue.includes("restorative") ||
    categoryValue.includes("endodontic") ||
    categoryValue.includes("periodontic") ||
    categoryValue.includes("periodontal") ||
    categoryValue.includes("oral_surgery") ||
    categoryValue.includes("prosthodontic") ||
    categoryValue.includes("orthodontic") ||
    categoryValue.includes("implant");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add.title", "Add New Procedure")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("add.name", "Procedure Name*")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("add.namePlaceholder", "e.g., Dental Crown, Blood Test")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Procedure / Billing Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("add.code", "Procedure Code")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("add.codePlaceholder", "e.g., D2740, 99213, CPT/CDT/HCPCS code")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("add.codeHint", "Optional billing code shown on appointment summaries, treatment plans, invoices, and superbills.")}
                  </p>
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
                  <FormLabel>{t("add.category", "Category*")}</FormLabel>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("add.categoryPlaceholder", "Select treatment category")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {t(`categories.${cat.value}`, cat.label)}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">{t("add.custom", "Custom…")}</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.watch("category") === "__custom__" && (
                    <div className="space-y-2 mt-2">
                      <Label>{t("add.customCategory", "Custom Category")}</Label>
                      <Input
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder={t("add.customCategoryPlaceholder", "e.g., Specialized Therapy")}
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
                  <FormLabel>{t("add.defaultCost", "Default Cost ({{currency}})", { currency })}</FormLabel>
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
                      {t("add.followupTitle", "Schedule Follow-up Appointments")}
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
                          <FormLabel>{t("add.followupCount", "Number of Follow-ups")}</FormLabel>
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
                          <FormLabel>{t("add.followupInterval", "Days Between Appointments")}</FormLabel>
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
                    {t("add.followupSummary", "{{count}} follow-up appointment(s) will be suggested, each {{days}} day(s) after the previous one.", { count: form.watch("followup_count"), days: form.watch("followup_interval_days") })}
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
                      {t("add.consentTitle", "Require Patient Consent")}
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
                        {t("add.consentNotice", "Patient must read and accept this consent before the procedure can be performed. If declined, you will receive an alert notification.")}
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="consent_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("add.consentText", "Consent Text")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("add.consentTextPlaceholder", "Enter the informed consent text...")}
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>{t("add.uploadConsent", "Or Upload Consent Document")}</Label>
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
                          {t("add.uploadFile", "Upload File")}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {t("add.uploadHint", "PDF, DOC, DOCX, or TXT (max 5MB)")}
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
                  <FormLabel>{t("add.notes", "Notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("add.notesPlaceholder", "Optional notes about this procedure...")}
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
                <FormLabel>{t("add.toothSelection", "Tooth Selection (Optional)")}</FormLabel>
                <div className="mt-2">
                  <ToothSelector
                    selectedTeeth={selectedTeeth}
                    onSelectionChange={setSelectedTeeth}
                  />
                </div>
              </div>
            ) : null}

            {/* Inventory linkage */}
            <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-700" />
                    <Label htmlFor="inventory-toggle" className="font-medium cursor-pointer">
                      {t("add.useInventoryToggle", "Uses instruments / materials")}
                    </Label>
                  </div>
                  <Switch
                    id="inventory-toggle"
                    checked={usesInventory}
                    onCheckedChange={(checked) => {
                      setUsesInventory(checked);
                      if (!checked) {
                        setSelectedInventory([]);
                        setPickerOpen(false);
                        setPickerItemId("");
                        setPickerQty(1);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("add.useInventoryToggleHint", "Turn on to link the tools, instruments or medications consumed by this procedure.")}
                </p>

                {usesInventory && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{t("add.inventoryTitle", "Instruments & Medications")}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPickerOpen((v) => !v);
                          setPickerItemId("");
                          setPickerQty(1);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> {t("add.addItem", "Add Item")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("add.inventoryHint", "Items selected here will be auto-deducted from inventory when this procedure is completed. Reusable items will increment their use count; you'll be warned if stock is insufficient.")}
                    </p>

                {pickerOpen && (
                  <div className="grid grid-cols-12 gap-2 items-end p-2 rounded-md border bg-background">
                    <div className="col-span-7">
                      <Label className="text-xs">{t("add.item", "Item")}</Label>
                      <Select value={pickerItemId} onValueChange={setPickerItemId}>
                        <SelectTrigger>
                          <SelectValue placeholder={mergedInventory.length ? t("add.selectItem", "Select item…") : t("add.noInventoryAvailable", "No inventory available")} />
                        </SelectTrigger>
                        <SelectContent>
                          {mergedInventory
                            .filter((m) => !selectedInventory.find((s) => s.inventoryId === m.id))
                            .map((m) => {
                              const stock = getStockStatus(m);
                              const useSt = getUseStatus(m);
                              const disabled =
                                useSt === "exhausted" || (!m.is_reusable && m.quantity_in_stock <= 0);
                              return (
                                <SelectItem key={m.id} value={m.id} disabled={disabled}>
                                  <span className="inline-flex items-center gap-2">
                                    {m.source === "clinic" ? (
                                      <Building2 className="w-3 h-3" />
                                    ) : (
                                      <UserIcon className="w-3 h-3" />
                                    )}
                                    {m.name} · {m.quantity_in_stock} {m.unit}
                                    <Badge variant="secondary" className="ml-1 text-[10px]">
                                      {m.is_reusable
                                        ? `${t("add.reusable", "Reusable")}${
                                            m.max_uses_per_unit
                                              ? ` ${m.current_use_count}/${m.max_uses_per_unit}`
                                              : ""
                                          }`
                                        : t("add.singleUse", "Single-use")}
                                    </Badge>
                                    {useSt === "needs_sterilization" && (
                                      <Badge variant="outline" className="ml-1 text-[10px]">
                                        {t("add.inSterilization", "In sterilization")}
                                      </Badge>
                                    )}
                                    {useSt === "exhausted" && (
                                      <Badge variant="outline" className="ml-1 text-[10px]">
                                        {t("add.maxUsesReached", "Max uses reached")}
                                      </Badge>
                                    )}
                                    {!m.is_reusable && m.quantity_in_stock <= 0 && (
                                      <Badge variant="outline" className="ml-1 text-[10px]">
                                        {t("add.outOfStock", "Out of stock")}
                                      </Badge>
                                    )}
                                    {stock !== "ok" && m.quantity_in_stock > 0 && (
                                      <Badge variant="outline" className="ml-1 text-[10px]">
                                        {stock}
                                      </Badge>
                                    )}
                                  </span>
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">{t("add.qty", "Qty")}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={pickerQty}
                        onChange={(e) => setPickerQty(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={!pickerItemId}
                        onClick={() => {
                          const inv = mergedInventory.find((m) => m.id === pickerItemId);
                          if (!inv) return;
                          const useSt = getUseStatus(inv);
                          if (useSt === "exhausted") {
                            toast.error(t("add.maxUsesReachedHint", "This item reached its maximum number of uses."));
                            return;
                          }
                          if (!inv.is_reusable && inv.quantity_in_stock <= 0) {
                            toast.error(t("add.outOfStock", "Out of stock"));
                            return;
                          }
                          let qty = pickerQty;
                          if (!inv.is_reusable && qty > inv.quantity_in_stock) {
                            qty = inv.quantity_in_stock;
                            toast.warning(
                              t("add.insufficientStockHint", "Only {{count}} left in stock — quantity adjusted.", {
                                count: inv.quantity_in_stock,
                              }),
                            );
                          }
                          if (useSt === "needs_sterilization") {
                            toast.warning(
                              t("add.inSterilizationHint", "This item must be sterilized before it can be used again."),
                            );
                          }
                          setSelectedInventory((prev) => [
                            ...prev,
                            { inventoryId: inv.id, quantity: qty, entityScope: inv.source },
                          ]);
                          setPickerOpen(false);
                          setPickerItemId("");
                          setPickerQty(1);
                        }}
                      >
                        {t("add.add", "Add")}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedInventory.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">{t("add.noInventoryLinked", "No inventory linked yet.")}</p>
                ) : (

                  <div className="space-y-2">
                    {selectedInventory.map((sel, idx) => {
                      const inv = mergedInventory.find((m) => m.id === sel.inventoryId);
                      if (!inv) return null;
                      const stock = getStockStatus(inv);
                      const useSt = getUseStatus(inv);
                      const insufficient = !inv.is_reusable && inv.quantity_in_stock < sel.quantity;
                      return (
                        <div
                          key={sel.inventoryId}
                          className="flex items-center gap-2 p-2 rounded-md border bg-background"
                        >
                          {inv.source === "clinic" ? (
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{inv.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {t("add.stock", "Stock")}: {inv.quantity_in_stock} {inv.unit}
                              {inv.is_reusable && inv.max_uses_per_unit
                                ? ` · ${t("add.uses", "uses")} ${inv.current_use_count}/${inv.max_uses_per_unit}`
                                : ""}
                              {inv.requires_sterilization ? ` · ${t("add.sterilizable", "sterilizable")}` : ""}
                            </div>
                            {(insufficient || stock !== "ok" || useSt !== "ok") && (
                              <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                {insufficient
                                  ? t("add.insufficientStock", "Insufficient stock")
                                  : useSt === "needs_sterilization"
                                  ? t("add.needsSterilization", "Needs sterilization")
                                  : useSt === "exhausted"
                                  ? t("add.maxUsesReached", "Max uses reached")
                                  : stock}
                              </div>
                            )}
                          </div>
                          <Input
                            type="number"
                            min={1}
                            value={sel.quantity}
                            onChange={(e) =>
                              setSelectedInventory((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) } : p,
                                ),
                              )
                            }
                            className="w-20 h-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setSelectedInventory((prev) => prev.filter((_, i) => i !== idx))
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                  </div>
                )}
              </CardContent>

            </Card>


            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("add.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={loading || uploadingFile}>
                {loading || uploadingFile ? t("add.creating", "Creating...") : t("add.create", "Create Procedure")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProcedureModal;
