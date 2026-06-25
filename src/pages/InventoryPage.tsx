// src/pages/InventoryPage.tsx
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { useAccessScope } from '@/hooks/useAccessScope';
import { useActiveEntityScope } from '@/hooks/useActiveEntityScope';
import { ClinicInventoryManager } from '@/components/inventory/ClinicInventoryManager';
import { hasAnyRole } from '@/lib/rbac';
import { useAuth } from '@/contexts/AuthContext';

export default function InventoryPage() {
  const { t } = useTranslation('inventory');
  const { primary, loading: scopeLoading } = useAccessScope();
  const { activeEntityId } = useActiveEntityScope('clinic');
  const { profile } = useAuth();

  const entityId = activeEntityId || primary?.entity_id;

  const userRoles: string[] = profile?.roles
    ? Array.isArray(profile.roles)
      ? profile.roles
      : [profile.roles]
    : profile?.role
    ? [profile.role]
    : [];

  const isAdmin = hasAnyRole(userRoles, ['clinic_admin', 'admin', 'super_admin']);

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
        <p className="text-sm">No clinic associated with your account.</p>
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
      </div>

      <ClinicInventoryManager
        entityId={entityId}
        canCreate={isAdmin || hasAnyRole(userRoles, ['doctor', 'staff'])}
        canDelete={isAdmin}
      />
    </div>
  );
}
