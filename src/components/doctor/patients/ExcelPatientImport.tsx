import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
// XLSX is dynamically imported when needed to reduce initial bundle size

interface ExcelPatientImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctorId: string;
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
}

interface ValidationResult {
  row: number;
  data: PatientRow;
  valid: boolean;
  errors: string[];
}

const REQUIRED_COLUMNS = ['full_name', 'date_of_birth', 'phone'];
const OPTIONAL_COLUMNS = ['gender', 'email', 'address', 'allergies', 'medical_history', 'emergency_contact_name', 'emergency_contact_phone'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const ExcelPatientImport = ({ isOpen, onClose, onSuccess, doctorId }: ExcelPatientImportProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ALL_COLUMNS,
      ['John Doe', '1990-05-15', 'male', '+1234567890', 'john@example.com', '123 Main St', 'Penicillin', 'Diabetes Type 2', 'Jane Doe', '+0987654321'],
      ['Jane Smith', '1985-08-22', 'female', '+1122334455', '', '456 Oak Ave', '', '', '', ''],
    ]);
    
    // Set column widths
    ws['!cols'] = ALL_COLUMNS.map(() => ({ wch: 20 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patients');
    XLSX.writeFile(wb, 'patient_import_template.xlsx');
    toast.success('Template downloaded');
  };

  const validateRow = (row: any, rowIndex: number): ValidationResult => {
    const errors: string[] = [];
    const data: PatientRow = {
      full_name: String(row.full_name || '').trim(),
      date_of_birth: String(row.date_of_birth || '').trim(),
      phone: String(row.phone || '').trim(),
      gender: row.gender ? String(row.gender).trim().toLowerCase() : undefined,
      email: row.email ? String(row.email).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
      allergies: row.allergies ? String(row.allergies).trim() : undefined,
      medical_history: row.medical_history ? String(row.medical_history).trim() : undefined,
      emergency_contact_name: row.emergency_contact_name ? String(row.emergency_contact_name).trim() : undefined,
      emergency_contact_phone: row.emergency_contact_phone ? String(row.emergency_contact_phone).trim() : undefined,
    };

    // Required field validation
    if (!data.full_name) errors.push('Full name is required');
    if (!data.date_of_birth) errors.push('Date of birth is required');
    if (!data.phone) errors.push('Phone is required');

    // Date format validation (YYYY-MM-DD)
    if (data.date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date_of_birth)) {
        errors.push('Date must be in YYYY-MM-DD format');
      } else {
        const date = new Date(data.date_of_birth);
        if (isNaN(date.getTime())) {
          errors.push('Invalid date');
        } else if (date > new Date()) {
          errors.push('Date cannot be in the future');
        }
      }
    }

    // Phone validation
    if (data.phone && !/^\+?[\d\s\-()]{7,20}$/.test(data.phone)) {
      errors.push('Invalid phone format');
    }

    // Email validation
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Gender validation
    if (data.gender && !['male', 'female', 'other'].includes(data.gender)) {
      errors.push('Gender must be male, female, or other');
    }

    return {
      row: rowIndex + 2, // +2 for header row and 0-indexing
      data,
      valid: errors.length === 0,
      errors,
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV');
      return;
    }

    setFile(selectedFile);

    try {
      const XLSX = await import('xlsx');
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        toast.error('File is empty');
        return;
      }

      // Check for required columns
      const firstRow = jsonData[0] as Record<string, any>;
      const columns = Object.keys(firstRow);
      const missingRequired = REQUIRED_COLUMNS.filter(col => !columns.includes(col));
      
      if (missingRequired.length > 0) {
        toast.error(`Missing required columns: ${missingRequired.join(', ')}`);
        return;
      }

      // Validate all rows
      const results = jsonData.map((row, index) => validateRow(row, index));
      setValidationResults(results);
      setStep('preview');

    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file');
    }
  };

  const handleImport = async () => {
    const validRows = validationResults.filter(r => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImporting(true);

    try {
      const patientsToInsert = validRows.map(r => ({
        doctor_id: doctorId,
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
        status: 'active',
      }));

      const { error } = await supabase
        .from('doctor_patients')
        .insert(patientsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${validRows.length} patients`);
      setStep('complete');
      onSuccess();

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import patients');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResults([]);
    setStep('upload');
    onClose();
  };

  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => !r.valid).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Patients from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import patients
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* File Structure Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Required Excel Structure:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium text-green-600">Required columns:</p>
                    <ul className="list-disc list-inside">
                      <li>full_name - Patient's full name</li>
                      <li>date_of_birth - Format: YYYY-MM-DD</li>
                      <li>phone - Phone number</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Optional columns:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>gender - male/female/other</li>
                      <li>email - Email address</li>
                      <li>address - Full address</li>
                      <li>allergies - Known allergies</li>
                      <li>medical_history - Medical notes</li>
                      <li>emergency_contact_name</li>
                      <li>emergency_contact_phone</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Download Template */}
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Download a pre-formatted Excel template
                </p>
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card
              className="border-dashed cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="p-12 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Excel (.xlsx, .xls) or CSV files
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

        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validCount} Valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <XCircle className="w-3 h-3 mr-1" />
                  {invalidCount} Invalid
                </Badge>
              )}
            </div>

            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {invalidCount} row(s) have errors and will be skipped during import.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result, index) => (
                    <TableRow key={index} className={!result.valid ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.valid ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>{result.data.full_name || '—'}</TableCell>
                      <TableCell>{result.data.date_of_birth || '—'}</TableCell>
                      <TableCell>{result.data.phone || '—'}</TableCell>
                      <TableCell className="text-red-600 text-sm">
                        {result.errors.join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                className="flex-1" 
                disabled={importing || validCount === 0}
              >
                {importing ? 'Importing...' : `Import ${validCount} Patients`}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
            <p className="text-muted-foreground mb-6">
              Successfully imported {validCount} patients
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExcelPatientImport;
