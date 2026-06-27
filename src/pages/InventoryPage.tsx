// src/pages/InventoryPage.tsx
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { useActiveEntityScope } from '@/hooks/useActiveEntityScope';
import { useAccessScope } from '@/hooks/useAccessScope';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicInventoryManager } from '@/components/inventory/ClinicInventoryManager';

export default function InventoryPage() {
  const { t } = useTranslation('inventory');
  const { session } = useAuth();
  const { primary, loading: scopeLoading } = useAccessScope();
  const { activeEntityId } = useActiveEntityScope('clinic');

  const entityId = activeEntityId || primary?.entity_id;
  const role: string = (primary as any)?.scope_role ?? (primary as any)?.role ?? '';
  const isAdmin = ['admin', 'clinic_admin', 'super_admin'].includes(role);

  if (scopeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!entityId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t('noPractice')}</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          {t('page.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <ClinicInventoryManager
        entityId={entityId}
        canCreate={true}
        canDelete={isAdmin}
      />
    </div>
  );
}
