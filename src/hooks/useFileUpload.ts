import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type UploadBucket = 'avatars' | 'practice-logos' | 'medical-documents' | 'signatures';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (
    file: File, 
    bucket: UploadBucket, 
    path?: string
  ): Promise<{ url: string; path: string } | null> => {
    try {
      setUploading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload files.",
          variant: "destructive",
        });
        return null;
      }

      // Create file path with user ID for organization
      const fileExt = file.name.split('.').pop();
      const fileName = path || `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload file to storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL for public buckets, signed URL for private buckets
      let publicUrl: string;
      
      if (bucket === 'avatars' || bucket === 'practice-logos') {
        // Public buckets
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else {
        // Private buckets - get signed URL
        const { data: urlData, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

        if (urlError) throw urlError;
        publicUrl = urlData.signedUrl;
      }

      toast({
        title: "Upload successful",
        description: "File has been uploaded successfully.",
      });

      return {
        url: publicUrl,
        path: fileName
      };

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (bucket: UploadBucket, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      toast({
        title: "File deleted",
        description: "File has been removed successfully.",
      });

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
      return false;
    }
  };

  const getSignedUrl = async (bucket: UploadBucket, path: string, expiresIn = 3600): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  };

  return {
    uploadFile,
    deleteFile,
    getSignedUrl,
    uploading,
  };
};