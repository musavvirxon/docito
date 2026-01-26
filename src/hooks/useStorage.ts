import { useState } from 'react';
import { storageApi } from '@/lib/api/supabase-api';

export const useStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (bucket: string, path: string, file: File) => {
    try {
      setUploading(true);
      setError(null);
      
      const result = await storageApi.uploadFile(bucket, path, file);
      
      if ('success' in result && result.success) {
        return { data: result.data, success: true };
      } else if ('error' in result) {
        setError(result.error);
        return { error: result.error };
      }
      return { error: 'Unknown error' };
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
      return { error: 'Failed to upload file' };
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (bucket: string, path: string) => {
    try {
      setDownloading(true);
      setError(null);
      
      const result = await storageApi.downloadFile(bucket, path);
      
      if ('success' in result && result.success) {
        return { data: result.data, success: true };
      } else if ('error' in result) {
        setError(result.error);
        return { error: result.error };
      }
      return { error: 'Unknown error' };
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
      return { error: 'Failed to download file' };
    } finally {
      setDownloading(false);
    }
  };

  const getPublicUrl = (bucket: string, path: string) => {
    return storageApi.getPublicUrl(bucket, path);
  };

  return {
    uploadFile,
    downloadFile,
    getPublicUrl,
    uploading,
    downloading,
    error,
  };
};
