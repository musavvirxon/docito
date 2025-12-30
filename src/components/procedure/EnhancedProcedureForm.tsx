import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { DollarSign, Clock, AlertCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { MaterialsToolsSection } from "./MaterialsToolsSection";
import {
  DEFAULT_PROCEDURE_CATEGORIES,
  mergeCategories,
} from "@/lib/procedureCategories";

const procedureSchema = z.object({
  name: z.string().min(1, "Procedure name is required"),
  category: z.string().min(1, "Category is required"),
  estimated_duration_minutes: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().optional(),
  default_time_interval: z.number().optional(),
  description: z.string().optional(),
  what_to_expect: z.string().optional(),
  informed_consent_template: z.string().optional(),
  default_notes_template: z.string().optional(),
});

type ProcedureFormData = z.infer<typeof procedureSchema>;

interface EnhancedProcedureFormProps {
  procedureId?: string;
  onSave?: (procedure: any) => void;
  onCancel?: () => void;
}

export const EnhancedProcedureForm = ({
  procedureId,
  onSave,
  onCancel,
}: EnhancedProcedureFormProps) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);

  const [materials, setMaterials] = useState<
    Array<{ name: string; quantity: number; required: boolean; notes?: string }>
  >([]);

  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ name: string; url: string; type: string }>
  >([]);

  const [dentistId, setDentistId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_PROCEDURE_CATEGORIES);
  const [customCategory, setCustomCategory] = useState("");

  const form = useForm<ProcedureFormData>({
    resolver: zodResolver(procedureSchema),
    defaultValues: {
      name: "",
      category: "",
      estimated_duration_minutes: 30,
      price: 0,
      default_time_interval: 7,
      description: "",
      what_to_expect: "",
      informed_consent_template: "",
      default_notes_template: "",
    },
  });

  // Load dentistId and categories (defaults + custom existing categories)
  useEffect(() => {
    const loadDentistAndCategories = async () => {
      if (!user?.id) {
        setDentistId(null);
        setCategoryOptions(DEFAULT_PROCEDURE_CATEGORIES);
        return;
      }

      const { data: doctor, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (doctorError || !doctor?.id) {
        console.error(doctorError);
        setDentistId(null);
        setCategoryOptions(DEFAULT_PROCEDURE_CATEGORIES);
        return;
      }

      setDentistId(doctor.id);

      const { data: rows, error: catErr } = await supabase
        .from("procedures")
        .select("category")
        .eq("dentist_id", doctor.id);

      if (catErr) {
        console.error(catErr);
        setCategoryOptions(DEFAULT_PROCEDURE_CATEGORIES);
        return;
      }

      const distinct = Array.from(
        new Set((rows ?? []).map((r: any) => r.category).filter(Boolean))
      ) as string[];

      setCategoryOptions(mergeCategories(DEFAULT_PROCEDURE_CATEGORIES, distinct));
    };

    loadDentistAndCategories();
  }, [user?.id]);

  // Load existing procedure data if editing
  useEffect(() => {
    const loadProcedure = async () => {
      if (!procedureId) return;

      try {
        setLoading(true);

        const { data: procedure, error } = await supabase
          .from("procedures")
          .select("*")
          .eq("id", procedureId)
          .single();

        if (error) throw error;

        // If the category is custom and not in options, add it
        if (procedure?.category) {
          const exists = categoryOptions.some((c) => c.value === procedure.category);
          if (!exists) {
            setCategoryOptions((prev) =>
              mergeCategories(prev, [procedure.category as string])
            );
          }
        }

        form.reset({
          name: procedure?.name ?? "",
          category: procedure?.category ?? "",
          estimated_duration_minutes: procedure?.estimated_duration_minutes ?? 30,
          price: procedure?.price ?? 0,
          default_time_interval: procedure?.default_time_interval ?? 7,
          description: procedure?.description ?? "",
          what_to_expect: procedure?.what_to_expect ?? "",
          informed_consent_template: procedure?.informed_consent_template ?? "",
          default_notes_template: procedure?.default_notes_template ?? "",
        });

        // Load materials
        const { data: materialsData, error: materialsError } = await supabase
          .from("procedure_materials")
          .select("*")
          .eq("procedure_id", procedureId);

        if (materialsError) throw materialsError;

        setMaterials(
          materialsData?.map((m: any) => ({
            name: m.material_name,
            quantity: m.quantity,
            required: m.is_required,
            notes: m.notes || "",
          })) || []
        );

        // Load files
        const { data: filesData, error: filesError } = await supabase
          .from("procedure_files")
          .select("*")
          .eq("procedure_id", procedureId);

        if (filesError) throw filesError;

        setUploadedFiles(
          filesData?.map((f: any) => ({
            name: f.file_name,
            url: f.file_path,
            type: f.file_type,
          })) || []
        );
      } catch (err: any) {
        console.error("Error loading procedure:", err);
        toast.error("Failed to load procedure data");
      } finally {
        setLoading(false);
      }
    };

    loadProcedure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureId]);

  const categoryValue = form.watch("category");

  const isCustomSelected = useMemo(() => categoryValue === "__custom__", [categoryValue]);

  const onSubmit = async (formData: ProcedureFormData) => {
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    if (!dentistId) {
      toast.error("Doctor profile not loaded");
      return;
    }

    const finalCategory =
      formData.category === "__custom__" ? customCategory.trim() : formData.category;

    if (!finalCategory) {
      toast.error("Please choose or enter a category");
      return;
    }

    try {
      setLoading(true);

      let procedureData: any;

      if (procedureId) {
        // Update existing procedure
        const { data, error } = await supabase
          .from("procedures")
          .update({
            name: formData.name,
            category: finalCategory as any,
            estimated_duration_minutes: formData.estimated_duration_minutes,
            price: formData.price ?? null,
            default_time_interval: formData.default_time_interval ?? null,
            description: formData.description ?? null,
            what_to_expect: formData.what_to_expect ?? null,
            informed_consent_template: formData.informed_consent_template ?? null,
            default_notes_template: formData.default_notes_template ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", procedureId)
          .select()
          .single();

        if (error) throw error;
        procedureData = data;
      } else {
        // Create new procedure
        const { data, error } = await supabase
          .from("procedures")
          .insert({
            dentist_id: dentistId,
            is_active: true,
            name: formData.name,
            category: finalCategory as any,
            estimated_duration_minutes: formData.estimated_duration_minutes,
            price: formData.price ?? null,
            default_time_interval: formData.default_time_interval ?? null,
            description: formData.description ?? null,
            what_to_expect: formData.what_to_expect ?? null,
            informed_consent_template: formData.informed_consent_template ?? null,
            default_notes_template: formData.default_notes_template ?? null,
          })
          .select()
          .single();

        if (error) throw error;
        procedureData = data;
      }

      // Save materials
      if (procedureData?.id) {
        await supabase.from("procedure_materials").delete().eq("procedure_id", procedureData.id);

        if (materials.length > 0) {
          const materialsToInsert = materials.map((material) => ({
            procedure_id: procedureData.id,
            material_name: material.name,
            quantity: material.quantity,
            is_required: material.required,
            notes: material.notes || null,
          }));

          const { error: materialsError } = await supabase
            .from("procedure_materials")
            .insert(materialsToInsert);

          if (materialsError) throw materialsError;
        }
      }

      toast.success(procedureId ? "Procedure updated successfully" : "Procedure created successfully");
      setCustomCategory("");
      onSave?.(procedureData);
    } catch (err: any) {
      console.error("Error saving procedure:", err);
      toast.error(err?.message || "Failed to save procedure");
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = () => {
    setMaterials([...materials, { name: "", quantity: 1, required: true, notes: "" }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Procedure Name *</Label>
                  <Input id="name" {...form.register("name")} placeholder="Enter procedure name" />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(value) => form.setValue("category", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>

                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom…</SelectItem>
                    </SelectContent>
                  </Select>

                  {isCustomSelected && (
                    <div className="space-y-2 mt-2">
                      <Label>Custom Category</Label>
                      <Input
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="e.g., Specialized Therapy"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      className="pl-9"
                      {...form.register("estimated_duration_minutes", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-9"
                      {...form.register("price", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="interval">Default Interval (days)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    {...form.register("default_time_interval", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Detailed description of the procedure..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="what_to_expect">What to Expect</Label>
                <Textarea
                  id="what_to_expect"
                  {...form.register("what_to_expect")}
                  placeholder="What the patient should expect during and after the procedure..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="notes_template">Default Notes Template</Label>
                <Textarea
                  id="notes_template"
                  {...form.register("default_notes_template")}
                  placeholder="Template for procedure-specific notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsToolsSection
            materials={materials}
            onAddMaterial={addMaterial}
            onRemoveMaterial={removeMaterial}
            onUpdateMaterial={updateMaterial}
            uploadedFiles={uploadedFiles}
            onFilesChange={setUploadedFiles}
          />
        </TabsContent>

        <TabsContent value="consent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informed Consent Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Informed Consent Information</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        If you add an informed consent template, patients will be required to
                        digitally sign consent before this procedure can be performed.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="consent_template">Consent Document Template</Label>
                  <Textarea
                    id="consent_template"
                    {...form.register("informed_consent_template")}
                    placeholder="Enter the informed consent text..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty if no consent is required. You can use variables like{" "}
                    {`{procedureName}`}, {`{estimatedCost}`}, etc.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : procedureId ? "Update Procedure" : "Create Procedure"}
        </Button>
      </div>
    </form>
  );
};

