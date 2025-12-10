import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FlaskConical, 
  ScanLine, 
  FileText, 
  Download,
  ExternalLink,
  Calendar,
  Building2
} from 'lucide-react';
import { useClinicLabOrders } from '@/hooks/useClinicLabOrders';
import { useClinicImagingOrders } from '@/hooks/useClinicImagingOrders';
import { format } from 'date-fns';

interface PatientTestResultsProps {
  patientId?: string;
}

export function PatientTestResults({ patientId }: PatientTestResultsProps) {
  const { labOrders, fetchPatientLabOrders, loading: labLoading } = useClinicLabOrders();
  const { imagingOrders, fetchPatientImagingOrders, loading: imagingLoading } = useClinicImagingOrders();
  const [activeTab, setActiveTab] = useState('lab');

  useEffect(() => {
    fetchPatientLabOrders(patientId);
    fetchPatientImagingOrders(patientId);
  }, [patientId, fetchPatientLabOrders, fetchPatientImagingOrders]);

  const loading = labLoading || imagingLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Test Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lab" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Lab Results ({labOrders.length})
            </TabsTrigger>
            <TabsTrigger value="imaging" className="gap-2">
              <ScanLine className="h-4 w-4" />
              Imaging Results ({imagingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lab" className="mt-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : labOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No lab results available</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {labOrders.map(order => (
                    <Card key={order.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{order.test_name}</h4>
                              {order.is_abnormal && (
                                <Badge variant="destructive">Abnormal</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="capitalize">{order.test_type}</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {order.completed_at ? format(new Date(order.completed_at), 'MMM d, yyyy') : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">
                            Completed
                          </Badge>
                        </div>

                        {order.result_text && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Result:</p>
                            <p className="text-sm">{order.result_text}</p>
                            {order.reference_range && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Reference: {order.reference_range}
                              </p>
                            )}
                          </div>
                        )}

                        {order.result_url && (
                          <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={order.result_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Report
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={order.result_url} download>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="imaging" className="mt-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : imagingOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <ScanLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No imaging results available</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {imagingOrders.map(order => (
                    <Card key={order.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{order.exam_name}</h4>
                              <Badge variant="secondary" className="uppercase text-xs">
                                {order.modality}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {order.body_part && <span>{order.body_part}</span>}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {order.completed_at ? format(new Date(order.completed_at), 'MMM d, yyyy') : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">
                            Completed
                          </Badge>
                        </div>

                        {order.impression && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Impression:</p>
                            <p className="text-sm">{order.impression}</p>
                          </div>
                        )}

                        {order.findings && (
                          <div className="mt-2 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Findings:</p>
                            <p className="text-sm">{order.findings}</p>
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          {order.result_url && (
                            <>
                              <Button variant="outline" size="sm" asChild>
                                <a href={order.result_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Report
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={order.result_url} download>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            </>
                          )}
                          {order.result_images && order.result_images.length > 0 && (
                            <Button variant="outline" size="sm">
                              View Images ({order.result_images.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
