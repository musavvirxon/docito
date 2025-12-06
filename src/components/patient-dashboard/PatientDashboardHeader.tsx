import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  MoreVertical,
  Download,
  Printer,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

interface PatientInfo {
  id: string;
  full_name: string;
  avatar_url?: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  status?: string;
}

interface PatientDashboardHeaderProps {
  patient: PatientInfo;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadPDF: () => void;
  onPrint: () => void;
  isDownloading?: boolean;
}

const PatientDashboardHeader = ({
  patient,
  onBack,
  onEdit,
  onDelete,
  onDownloadPDF,
  onPrint,
  isDownloading,
}: PatientDashboardHeaderProps) => {
  const initials = patient.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "P";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-4 md:p-6 shadow-sm"
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Back button - Mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="self-start md:hidden"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Main content */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 flex-1">
          {/* Avatar */}
          <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto sm:mx-0 ring-4 ring-primary/10">
            <AvatarImage src={patient.avatar_url} alt={patient.full_name} />
            <AvatarFallback className="text-xl md:text-2xl bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Patient Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                {patient.full_name}
              </h1>
              <div className="flex gap-2 justify-center sm:justify-start">
                <Badge variant="outline" className="text-xs">
                  ID: {patient.id.slice(0, 8)}
                </Badge>
                {patient.status && (
                  <Badge
                    variant={patient.status === "active" ? "default" : "secondary"}
                    className={
                      patient.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : ""
                    }
                  >
                    {patient.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Demographics */}
            <p className="text-sm text-muted-foreground mb-3">
              {patient.age && <span>{patient.age} years old</span>}
              {patient.gender && (
                <span className="capitalize"> • {patient.gender}</span>
              )}
            </p>

            {/* Contact Actions */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {patient.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`tel:${patient.phone}`)}
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call</span>
                </Button>
              )}
              {patient.email && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`mailto:${patient.email}`)}
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Email</span>
                </Button>
              )}
              {patient.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${patient.phone?.replace(/\D/g, "")}`
                    )
                  }
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-2 justify-center md:justify-end">
          {/* Desktop actions */}
          <div className="hidden md:flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onDownloadPDF} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Summary PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Patient
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Patient
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};

export default PatientDashboardHeader;
