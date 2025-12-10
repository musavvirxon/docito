import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TestTube2, 
  Image as ImageIcon, 
  Download, 
  Eye,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

export const PatientTestResultsSection = () => {
  const { user } = useAuth();
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [imagingResults, setImagingResults] = useState<ImagingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lab');

  useEffect(() => {
    if (user) {
      fetchResults();
    }
  }, [user]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      const [labRes, imagingRes] = await Promise.all([
        supabase
          .from('clinic_lab_orders')
          .select('*')
          .eq('patient_id', user?.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false }),
        supabase
          .from('clinic_imaging_orders')
          .select('*')
          .eq('patient_id', user?.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
      ]);

      if (labRes.data) setLabResults(labRes.data);
      if (imagingRes.data) setImagingResults(imagingRes.data);
    } catch (error) {
      console.error('Error fetching test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModalityIcon = (modality: string) => {
    return ImageIcon;
  };

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
      <div>
        <h2 className="text-2xl font-bold">Test Results</h2>
        <p className="text-muted-foreground">View your laboratory and imaging results</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="lab" className="gap-2">
            <TestTube2 className="h-4 w-4" />
            Lab Results
            {labResults.length > 0 && (
              <Badge variant="secondary" className="ml-1">{labResults.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="imaging" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Imaging
            {imagingResults.length > 0 && (
              <Badge variant="secondary" className="ml-1">{imagingResults.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab" className="mt-6">
          {labResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TestTube2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Lab Results</h3>
                <p className="text-muted-foreground text-sm">
                  Your completed lab test results will appear here
                </p>
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
                          <div className={cn(
                            "p-2 rounded-lg",
                            result.is_abnormal 
                              ? 'bg-red-50 dark:bg-red-900/20' 
                              : 'bg-green-50 dark:bg-green-900/20'
                          )}>
                            <TestTube2 className={cn(
                              "h-5 w-5",
                              result.is_abnormal ? 'text-red-600' : 'text-green-600'
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
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
                              <p className="text-xs text-muted-foreground mt-1">
                                Reference: {result.reference_range}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {result.completed_at 
                                ? format(new Date(result.completed_at), 'MMM dd, yyyy')
                                : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {result.result_url && (
                          <Button variant="outline" size="sm">
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
                <p className="text-muted-foreground text-sm">
                  Your completed imaging results will appear here
                </p>
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
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{result.exam_name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {result.modality}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {result.order_number}
                            </p>
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

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {result.completed_at 
                                ? format(new Date(result.completed_at), 'MMM dd, yyyy')
                                : 'Pending'}
                            </span>
                          </div>
                          {result.result_images && result.result_images.length > 0 && (
                            <span>{result.result_images.length} image(s)</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {result.result_url && (
                          <Button variant="outline" size="sm">
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
      </Tabs>
    </div>
  );
};
