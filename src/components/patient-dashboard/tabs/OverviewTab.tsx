import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  FileText,
  Pill,
  Stethoscope,
  Upload,
  Clock,
  Eye,
  Image,
  File,
} from "lucide-react";
import { motion } from "framer-motion";

interface TimelineEvent {
  id: string;
  type: "appointment" | "prescription" | "note" | "treatment" | "diagnosis" | "file";
  title: string;
  date: string;
  description?: string;
}

interface RecentFile {
  id: string;
  name: string;
  type: string;
  date: string;
  url?: string;
}

interface OverviewTabProps {
  timeline: TimelineEvent[];
  recentFiles: RecentFile[];
  metrics: {
    totalAppointments: number;
    totalPrescriptions: number;
    firstVisit?: string;
    lastVisit?: string;
  };
  onViewFile: (file: RecentFile) => void;
}

const OverviewTab = ({
  timeline,
  recentFiles,
  metrics,
  onViewFile,
}: OverviewTabProps) => {
  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "appointment":
        return Calendar;
      case "prescription":
        return Pill;
      case "note":
        return FileText;
      case "treatment":
        return Stethoscope;
      case "diagnosis":
        return Stethoscope;
      case "file":
        return Upload;
      default:
        return Clock;
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "appointment":
        return "bg-primary/10 text-primary";
      case "prescription":
        return "bg-accent/10 text-accent";
      case "note":
        return "bg-secondary/10 text-secondary";
      case "treatment":
        return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "diagnosis":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
      case "file":
        return "bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return Image;
    return File;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Appointments</p>
            <p className="text-2xl font-bold text-primary">{metrics.totalAppointments}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/5 to-accent/10">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Prescriptions</p>
            <p className="text-2xl font-bold text-accent">{metrics.totalPrescriptions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">First Visit</p>
            <p className="text-lg font-semibold">
              {metrics.firstVisit
                ? new Date(metrics.firstVisit).toLocaleDateString()
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Last Visit</p>
            <p className="text-lg font-semibold">
              {metrics.lastVisit
                ? new Date(metrics.lastVisit).toLocaleDateString()
                : "—"}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {timeline.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {timeline.map((event, index) => {
                        const Icon = getEventIcon(event.type);
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative pl-10"
                          >
                            <div
                              className={`absolute left-2 top-1 p-1.5 rounded-full ${getEventColor(
                                event.type
                              )}`}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-sm">{event.title}</p>
                                  {event.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {new Date(event.date).toLocaleDateString()}
                                </Badge>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Files */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Recent Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentFiles.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No files uploaded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentFiles.slice(0, 3).map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => onViewFile(file)}
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          <FileIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default OverviewTab;
