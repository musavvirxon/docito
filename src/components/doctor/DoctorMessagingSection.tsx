import React from 'react';
import { useSearchParams } from 'react-router-dom';
import MessagingCenter from '@/components/messaging/MessagingCenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DoctorMessagingSection: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('c');

  const handleConversationChange = (newConversationId: string | null) => {
    if (newConversationId) {
      searchParams.set('c', newConversationId);
    } else {
      searchParams.delete('c');
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('doctor.navigation.messages')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('doctor.messaging.description', 'Communicate with patients and healthcare providers')}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messaging Center */}
      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[600px]">
            <MessagingCenter
              initialConversationId={conversationId}
              onConversationChange={handleConversationChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorMessagingSection;
