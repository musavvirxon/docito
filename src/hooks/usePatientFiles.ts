import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PatientFile {
  id: string;
  name: string;
  type: string;
  size: number;
  date: string;
  url?: string;
  thumbnail_url?: string;
  category?: "xray" | "lab" | "scan" | "report" | "image" | "other";
}

export const usePatientFiles = (patientId: string) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctorId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (data) setDoctorId(data.id);
    };
    fetchDoctorId();
  }, [user]);

  const fetchFiles = useCallback(async () => {
    if (!user || !patientId) return;

    try {
      const { data, error } = await supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: PatientFile[] = await Promise.all(
        (data || []).map(async (file: any) => {
          let url: string | undefined;
          let thumbnailUrl: string | undefined;

          if (file.file_path) {
            const { data: urlData } = await supabase.storage
              .from("patient-files")
              .createSignedUrl(file.file_path, 3600);
            url = urlData?.signedUrl;

            if (file.file_type?.includes("image")) {
              thumbnailUrl = url;
            }
          }

          return {
            id: file.id,
            name: file.name,
            type: file.file_type,
            size: file.file_size || 0,
            date: file.created_at,
            url,
            thumbnail_url: thumbnailUrl || file.thumbnail_url,
            category: file.category as PatientFile["category"],
          };
        })
      );

      setFiles(formatted);
    } catch (err) {
      console.error("Error fetching files:", err);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFiles = async (fileList: FileList) => {
    if (!user || !doctorId || !patientId) {
      toast.error("Unable to upload files");
      return;
    }

    setUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${patientId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("patient-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const category = detectCategory(file.name, file.type);

        const { error: dbError } = await supabase.from("patient_files").insert({
          patient_id: patientId,
          doctor_id: doctorId,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          category,
        });

        if (dbError) throw dbError;
      }

      toast.success("Files uploaded successfully");
      fetchFiles();
    } catch (err) {
      console.error("Error uploading files:", err);
      toast.error("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (file: PatientFile) => {
    if (!user) return;

    try {
      const { data: fileData } = await supabase
        .from("patient_files")
        .select("file_path")
        .eq("id", file.id)
        .single();

      if (fileData?.file_path) {
        await supabase.storage
          .from("patient-files")
          .remove([fileData.file_path]);
      }

      const { error } = await supabase
        .from("patient_files")
        .delete()
        .eq("id", file.id);

      if (error) throw error;

      toast.success("File deleted successfully");
      fetchFiles();
    } catch (err) {
      console.error("Error deleting file:", err);
      toast.error("Failed to delete file");
    }
  };

  const downloadFile = async (file: PatientFile) => {
    if (!file.url) {
      toast.error("File URL not available");
      return;
    }

    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    files,
    loading,
    uploading,
    refetch: fetchFiles,
    uploadFiles,
    deleteFile,
    downloadFile,
  };
};

function detectCategory(name: string, type: string): PatientFile["category"] {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes("xray") || nameLower.includes("x-ray")) return "xray";
  if (nameLower.includes("lab") || nameLower.includes("blood") || nameLower.includes("test")) return "lab";
  if (nameLower.includes("scan") || nameLower.includes("ct") || nameLower.includes("mri")) return "scan";
  if (nameLower.includes("report")) return "report";
  if (type.includes("image")) return "image";
  
  return "other";
}
