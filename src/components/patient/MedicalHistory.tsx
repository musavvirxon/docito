import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Upload,
  Download,
  Eye,
  Filter,
  Search,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  FileImage
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const medicalRecordSchema = z.object({
  title: z.string().optional(),
  record_type: z.enum(["diagnosis", "condition", "examination", "note", "treatment"]).optional(),
  description: z.string().optional(),
  record_date: z.date().optional(),
  doctor_name: z.string().optional(),
  doctor_phone: z.string().optional(),
  doctor_email: z.string().optional(),
  practice_name: z.string().optional(),
});

type MedicalRecord = {
  id: string;
  title: string;
  record_type: string;
  description?: string;
  record_date: string;
  added_by: string;
  status: string;
  doctor_name?: string;
  doctor_phone?: string;
  doctor_email?: string;
  practice_name?: string;
  created_at: string;
  verification_log?: any;
};

const getRecordTypeIcon = (type: string) => {
  switch (type) {
    case 'diagnosis': return <Stethoscope className="w-4 h-4" />;
    case 'condition': return <Activity className="w-4 h-4" />;
    case 'examination': return <FlaskConical className="w-4 h-4" />;
    case 'treatment': return <Pill className="w-4 h-4" />;
    case 'note': return <FileText className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Verified</Badge>;
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">🟡 Pending</Badge>;
    case 'rejected':
      return <Badge variant="destructive">❌ Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function MedicalHistory() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

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
      practice_name: "",
    },
  });

  const fetchMedicalRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', user.id)
        .order('record_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast({
        title: "Error",
        description: "Failed to load medical records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const onSubmit = async (data: z.infer<typeof medicalRecordSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('medical_records')
        .insert({
          title: data.title,
          record_type: data.record_type,
          description: data.description,
          record_date: data.record_date.toISOString().split('T')[0], // Convert to YYYY-MM-DD
          doctor_name: data.doctor_name,
          doctor_phone: data.doctor_phone,
          doctor_email: data.doctor_email,
          practice_name: data.practice_name,
          patient_id: user.id,
          added_by: 'patient',
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Medical record added",
        description: "Your record has been submitted for verification",
      });

      form.reset();
      setIsAddingRecord(false);
      fetchMedicalRecords();
    } catch (error) {
      console.error('Error adding medical record:', error);
      toast({
        title: "Error",
        description: "Failed to add medical record",
        variant: "destructive",
      });
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesType = filterType === "all" || record.record_type === filterType;
    const matchesStatus = filterStatus === "all" || record.status === filterStatus;
    const matchesSearch = searchTerm === "" || 
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const totalRecords = records.length;
  const verifiedRecords = records.filter(r => r.status === 'verified').length;
  const pendingRecords = records.filter(r => r.status === 'pending').length;
  const lastUpdate = records.length > 0 ? records[0].created_at : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
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
              <CheckCircle className="w-5 h-5 text-green-600" />
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
              <Clock className="w-5 h-5 text-yellow-600" />
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
                  {lastUpdate ? format(new Date(lastUpdate), 'MMM dd, yyyy') : 'No records'}
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

            <Dialog open={isAddingRecord} onOpenChange={setIsAddingRecord}>
              <DialogTrigger asChild>
                <Button>
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
                              <Input placeholder="e.g., Annual Physical Exam" {...field} />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
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
                            <Textarea 
                              placeholder="Enter details about this medical record..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Doctor Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="doctor_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doctor Name (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Dr. John Smith" {...field} />
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
                              <FormLabel>Doctor Phone *</FormLabel>
                              <FormControl>
                                <Input placeholder="+1 (555) 123-4567" {...field} />
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
                              <FormLabel>Doctor Email (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="doctor@clinic.com" {...field} />
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
                              <FormLabel>Practice/Clinic (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Downtown Medical Center" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setIsAddingRecord(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Add Record</Button>
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
                  : "Start by adding your first medical record"
                }
              </p>
              {(!searchTerm && filterType === "all" && filterStatus === "all") && (
                <Button onClick={() => setIsAddingRecord(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Record
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredRecords.map((record, index) => (
                  <div key={record.id} className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="bg-primary/10 p-2 rounded-full">
                        {getRecordTypeIcon(record.record_type)}
                      </div>
                      {index < filteredRecords.length - 1 && (
                        <div className="w-px h-16 bg-border mt-2" />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-8">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{record.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(record.record_date), 'MMM dd, yyyy')}
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
                            <p className="text-sm text-muted-foreground mb-3">
                              {record.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>Added by {record.added_by}</span>
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
                            </div>
                            
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}