export type StaffJobRole =
  | "receptionist"
  | "administrator"
  | "biologist"
  | "accountant"
  | "radiologist"
  | "technician"
  | "pharmacist"
  | "cashier";

export type StaffSectionKey =
  | "orders"
  | "schedule"
  | "patients"
  | "billing"
  | "inventory"
  | "reports"
  | "activity"
  | "analytics";

export const STAFF_ROLE_SECTIONS: Record<StaffJobRole, StaffSectionKey[]> = {
  receptionist: ["orders", "schedule", "patients", "activity"],
  administrator: ["orders", "schedule", "patients", "billing", "inventory", "reports", "activity", "analytics"],
  biologist: ["orders", "reports", "activity", "analytics"],
  accountant: ["billing", "analytics", "activity"],
  radiologist: ["orders", "reports", "activity"],
  technician: ["orders", "schedule", "activity"],
  pharmacist: ["orders", "inventory", "reports", "activity"],
  cashier: ["billing", "activity"],
};

export function canSeeSection(role: StaffJobRole | null | undefined, section: StaffSectionKey) {
  if (!role) return false;
  return (STAFF_ROLE_SECTIONS[role] || []).includes(section);
}
