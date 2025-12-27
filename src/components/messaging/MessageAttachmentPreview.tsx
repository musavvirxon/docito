import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MessageAttachment } from '@/hooks/useHealthcareMessaging';
import { cn } from '@/lib/utils';

interface MessageAttachmentPreviewProps {
  attachment: MessageAttachment;
  isOwn?: boolean;
}

const MessageAttachmentPreview: React.FC<MessageAttachmentPreviewProps> = ({
  attachment,
  isOwn = false,
}) => {
  const isImage = attachment.file_type?.startsWith('image/');
  const isPdf = attachment.file_type === 'application/pdf';

  const getFileUrl = () => {
    const { data } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(attachment.file_path);
    return data.publicUrl;
  };

  const handleDownload = async () => {
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .download(attachment.file_path);

    if (error) {
      console.error('Download error:', error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return (
      <div className="mt-2">
        <div className="relative group rounded-lg overflow-hidden max-w-xs">
          <img
            src={getFileUrl()}
            alt={attachment.file_name}
            className="w-full h-auto rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => window.open(getFileUrl(), '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {attachment.file_name}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mt-2 p-3 rounded-lg border flex items-center gap-3 max-w-xs',
        isOwn ? 'bg-primary-foreground/10 border-primary-foreground/20' : 'bg-muted/50'
      )}
    >
      <div className={cn(
        'h-10 w-10 rounded-lg flex items-center justify-center',
        isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
      )}>
        {isPdf ? <FileText className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isOwn && 'text-primary-foreground'
        )}>
          {attachment.file_name}
        </p>
        <p className={cn(
          'text-xs',
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MessageAttachmentPreview;
