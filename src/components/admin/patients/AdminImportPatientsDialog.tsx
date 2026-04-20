import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DoctorOption {
  id: string;
  full_name?: string | null;
  email?: string | null;
  specialty?: string | null;
}

interface AdminImportPatientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  practiceId?: string | null;
  doctors: DoctorOption[];
}

interface PatientRow {
  full_name: string;
  date_of_birth: string;
  gender?: string;
  phone: string;
  email?: string;
  address?: string;
  allergies?: string;
  medical_history?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  doctor_email?: string;
}

interface ValidationResult {
  row: number;
  data: PatientRow;
  resolvedDoctorId: string | null;
  valid: boolean;
  errors: string[];
}

const REQUIRED_COLUMNS = ["full_name", "date_of_birth", "phone"];
const OPTIONAL_COLUMNS = [
  "gender",
  "email",
  "address",
  "allergies",
  "medical_history",
  "emergency_contact_name",
  "emergency_contact_phone",
  "doctor_email",
];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const AdminImportPatientsDialog = ({
  isOpen,
  onClose,
  onSuccess,
  practiceId,
  doctors,
}: AdminImportPatientsDialogProps) => {
  const { t } = useTranslation("patients");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [defaultDoctorId, setDefaultDoctorId] = useState<string>("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload");
  const [importedCount, setImportedCount] = useState(0);

  const doctorByEmail = useMemo(() => {
    const map = new Map<string, string>();
    doctors.forEach((d) => {
      if (d.email) map.set(d.email.trim().toLowerCase(), d.id);
    });
    return map;
  }, [doctors]);

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ALL_COLUMNS,
      [
        "John Doe",
        "1990-05-15",
        "male",
        "+1234567890",
        "john@example.com",
        "123 Main St",
        "Penicillin",
        "Diabetes Type 2",
        "Jane Doe",
        "+0987654321",
        "",
      ],
      [
        "Jane Smith",
        "1985-08-22",
        "female",
        "+1122334455",
        "",
        "456 Oak Ave",
        "",
        "",
        "",
        "",
        "doctor@example.com",
      ],
    ]);
    ws["!cols"] = ALL_COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, "patient_import_template.xlsx");
    toast.success(t("import.templateDownloaded", "Template downloaded"));
  };

  const validateRow = (row: any, rowIndex: number): ValidationResult => {
    const errors: string[] = [];
    const data: PatientRow = {
      full_name: String(row.full_name || "").trim(),
      date_of_birth: String(row.date_of_birth || "").trim(),
      phone: String(row.phone || "").trim(),
      gender: row.gender ? String(row.gender).trim().toLowerCase() : undefined,
      email: row.email ? String(row.email).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
      allergies: row.allergies ? String(row.allergies).trim() : undefined,
      medical_history: row.medical_history ? String(row.medical_history).trim() : undefined,
      emergency_contact_name: row.emergency_contact_name
        ? String(row.emergency_contact_name).trim()
        : undefined,
      emergency_contact_phone: row.emergency_contact_phone
        ? String(row.emergency_contact_phone).trim()
        : undefined,
      doctor_email: row.doctor_email ? String(row.doctor_email).trim() : undefined,
    };

    if (!data.full_name) errors.push(t("import.errors.nameRequired", "Full name is required"));
    if (!data.date_of_birth) errors.push(t("import.errors.dobRequired", "Date of birth is required"));
    if (!data.phone) errors.push(t("import.errors.phoneRequired", "Phone is required"));

    if (data.date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date_of_birth)) {
        errors.push(t("import.errors.dateFormat", "Date must be YYYY-MM-DD"));
      } else {
        const date = new Date(data.date_of_birth);
        if (isNaN(date.getTime())) {
          errors.push(t("import.errors.invalidDate", "Invalid date"));
        } else if (date > new Date()) {
          errors.push(t("import.errors.futureDate", "Date cannot be in the future"));
        }
      }
    }

    if (data.phone && !/^\+?[\d\s\-()]{7,20}$/.test(data.phone)) {
      errors.push(t("import.errors.phoneFormat", "Invalid phone format"));
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push(t("import.errors.emailFormat", "Invalid email format"));
    }

    if (data.gender && !["male", "female", "other"].includes(data.gender)) {
      errors.push(t("import.errors.gender", "Gender must be male, female or other"));
    }

    // Resolve doctor
    let resolvedDoctorId: string | null = defaultDoctorId || null;
    if (data.doctor_email) {
      const matched = doctorByEmail.get(data.doctor_email.toLowerCase());
      if (matched) {
        resolvedDoctorId = matched;
      } else if (!defaultDoctorId) {
        errors.push(
          t("import.errors.doctorNotFound", "Provider email not found and no default selected")
        );
      }
    }
    if (!resolvedDoctorId) {
      errors.push(t("import.errors.doctorRequired", "A default provider must be selected"));
    }

    return {
      row: rowIndex + 2,
      data,
      resolvedDoctorId,
      valid: errors.length === 0,
      errors,
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!defaultDoctorId) {
      toast.error(
        t("import.errors.selectDefaultFirst", "Please select a default provider before uploading")
      );
      e.target.value = "";
      return;
    }

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (
      !validTypes.includes(selectedFile.type) &&
      !selectedFile.name.match(/\.(xlsx|xls|csv)$/)
    ) {
      toast.error(t("import.errors.fileType", "Please upload an Excel (.xlsx, .xls) or CSV file"));
      return;
    }

    setFile(selectedFile);

    try {
      const XLSX = await import("xlsx");
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        toast.error(t("import.errors.empty", "File is empty"));
        return;
      }

      const firstRow = jsonData[0] as Record<string, any>;
      const columns = Object.keys(firstRow);
      const missingRequired = REQUIRED_COLUMNS.filter((col) => !columns.includes(col));

      if (missingRequired.length > 0) {
        toast.error(
          t("import.errors.missingColumns", "Missing required columns: {{cols}}", {
            cols: missingRequired.join(", "),
          })
        );
        return;
      }

      const results = jsonData.map((row, index) => validateRow(row, index));
      setValidationResults(results);
      setStep("preview");
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error(t("import.errors.readFailed", "Failed to read file"));
    }
  };

  const handleImport = async () => {
    const validRows = validationResults.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error(t("import.errors.noValid", "No valid rows to import"));
      return;
    }

    setImporting(true);
    try {
      const patientsToInsert = validRows.map((r) => {
        const base: any = {
          doctor_id: r.resolvedDoctorId,
          full_name: r.data.full_name,
          date_of_birth: r.data.date_of_birth,
          phone: r.data.phone,
          gender: r.data.gender || null,
          email: r.data.email || null,
          address: r.data.address || null,
          allergies: r.data.allergies || null,
          medical_history: r.data.medical_history || null,
          emergency_contact_name: r.data.emergency_contact_name || null,
          emergency_contact_phone: r.data.emergency_contact_phone || null,
          status: "active",
        };
        if (practiceId) base.practice_id = practiceId;
        return base;
      });

      const { error } = await (supabase as any).from("doctor_patients").insert(patientsToInsert);
      if (error) throw error;

      setImportedCount(validRows.length);
      toast.success(
        t("import.success", "Successfully imported {{count}} patients", {
          count: validRows.length,
        })
      );
      setStep("complete");
      onSuccess();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || t("import.errors.importFailed", "Failed to import patients"));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResults([]);
    setStep("upload");
    setDefaultDoctorId("");
    setImportedCount(0);
    onClose();
  };

  const validCount = validationResults.filter((r) => r.valid).length;
  const invalidCount = validationResults.filter((r) => !r.valid).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {t("import.title", "Import Patients")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "import.description",
              "Bulk import patients into the practice from an Excel or CSV file."
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            {/* Default provider */}
            <div className="space-y-2">
              <Label htmlFor="default-doctor">
                {t("import.defaultProvider", "Default Provider")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select value={defaultDoctorId} onValueChange={setDefaultDoctorId}>
                <SelectTrigger id="default-doctor">
                  <SelectValue
                    placeholder={t("import.defaultProviderPlaceholder", "Select a provider")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {doctors.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t("import.noDoctors", "No providers available")}
                    </SelectItem>
                  ) : (
                    doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name || d.email || d.id}
                        {d.specialty ? ` — ${d.specialty}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(
                  "import.defaultProviderHint",
                  "All imported patients will be assigned to this provider unless a doctor_email is provided per row."
                )}
              </p>
            </div>

            {/* Structure info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  {t("import.fileStructure", "Required file structure:")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      {t("import.requiredColumns", "Required columns")}
                    </p>
                    <ul className="list-disc list-inside">
                      <li>full_name</li>
                      <li>date_of_birth (YYYY-MM-DD)</li>
                      <li>phone</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">
                      {t("import.optionalColumns", "Optional columns")}
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>gender (male/female/other)</li>
                      <li>email</li>
                      <li>address</li>
                      <li>allergies</li>
                      <li>medical_history</li>
                      <li>emergency_contact_name</li>
                      <li>emergency_contact_phone</li>
                      <li>
                        doctor_email —{" "}
                        {t("import.doctorEmailHint", "assign row to a specific provider")}
                      </li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Download template */}
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  {t("import.downloadTemplate", "Download Template")}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("import.templateHint", "Pre-formatted Excel template with all columns")}
                </p>
              </CardContent>
            </Card>

            {/* Upload */}
            <Card
              className={`border-dashed transition-colors ${
                defaultDoctorId
                  ? "cursor-pointer hover:border-primary"
                  : "opacity-60 cursor-not-allowed"
              }`}
              onClick={() => defaultDoctorId && fileInputRef.current?.click()}
            >
              <CardContent className="p-12 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">
                  {t("import.uploadHint", "Click to upload or drag and drop")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("import.fileTypes", "Excel (.xlsx, .xls) or CSV")}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {t("import.preview.valid", "{{count}} Valid", { count: validCount })}
              </Badge>
              {invalidCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  {t("import.preview.invalid", "{{count}} Invalid", { count: invalidCount })}
                </Badge>
              )}
              {file && (
                <Badge variant="outline" className="text-muted-foreground">
                  {file.name}
                </Badge>
              )}
            </div>

            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t(
                    "import.preview.invalidNotice",
                    "{{count}} row(s) have errors and will be skipped.",
                    { count: invalidCount }
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead className="w-16">{t("import.preview.status", "Status")}</TableHead>
                    <TableHead>{t("import.preview.name", "Name")}</TableHead>
                    <TableHead>{t("import.preview.dob", "DOB")}</TableHead>
                    <TableHead>{t("import.preview.phone", "Phone")}</TableHead>
                    <TableHead>{t("import.preview.errors", "Errors")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result, index) => (
                    <TableRow
                      key={index}
                      className={!result.valid ? "bg-red-50/60 dark:bg-red-950/20" : ""}
                    >
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.valid ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>{result.data.full_name || "—"}</TableCell>
                      <TableCell>{result.data.date_of_birth || "—"}</TableCell>
                      <TableCell>{result.data.phone || "—"}</TableCell>
                      <TableCell className="text-red-600 text-sm">
                        {result.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="flex-1"
                disabled={importing}
              >
                {t("import.actions.back", "Back")}
              </Button>
              <Button
                onClick={handleImport}
                className="flex-1"
                disabled={importing || validCount === 0}
              >
                {importing
                  ? t("import.actions.importing", "Importing...")
                  : t("import.actions.import", "Import {{count}} Patients", { count: validCount })}
              </Button>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {t("import.complete.title", "Import Complete!")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("import.complete.message", "Successfully imported {{count}} patients", {
                count: importedCount,
              })}
            </p>
            <Button onClick={handleClose}>{t("import.actions.close", "Close")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminImportPatientsDialog;
