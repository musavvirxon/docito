// File: src/components/staff/SettingsSection.tsx

import EntitySettingsPage from "@/components/settings/EntitySettingsPage";

type Props = {
  clinicId: string;
};

export default function SettingsSection({ clinicId }: Props) {
  return (
    <div className="-m-6">
      <EntitySettingsPage entityType="clinic" entityId={clinicId} />
    </div>
  );
}
