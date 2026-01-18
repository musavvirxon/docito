// src/pages/StaffDashboardPage.tsx
// File: src/pages/StaffDashboardPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useStaffContext } from "@/hooks/useStaffContext";

import { StaffSidebar } from "@/components/staff/StaffSidebar";

import LabDashboardContent from "@/components/staff/LabDashboardContent";
import ImagingDashboardContent from "@/components/staff/ImagingDashboardContent";
import PharmacyDashboardContent from "@/components/staff/PharmacyDashboardContent";

import LabOrderQueue from "@/components/lab/LabOrderQueue";
import LabSampleManager from "@/components/lab/LabSampleManager";
import LabHomeCollection from "@/components/lab/LabHomeCollection";

import ImagingScanWorkflow from "@/components/imaging/ImagingScanWorkflow";
import ImagingReportManager from "@/components/imaging/ImagingReportManager";
import ImagingEquipmentManager from "@/components/imaging/ImagingEquipmentManager";
import ImagingAnalytics from "@/components/imaging/ImagingAnalytics";
import ImagingBillingSection from "@/components/imaging/ImagingBillingSection";

import PharmacyPrescriptionInbox from "@/components/pharmacy/PharmacyPrescriptionInbox";
import FulfillmentQueue from "@/components/pharmacy/FulfillmentQueue";
import PharmacyInventoryManager from "@/components/pharmacy/PharmacyInventoryManager";
import PharmacyDeliveryOrders from "@/components/pharmacy/PharmacyDeliveryOrders";
import PharmacyAnalytics from "@/components/pharmacy/PharmacyAnalytics";
import PharmacyInsuranceClaims from "@/components/pharmacy/PharmacyInsuranceClaims";

import { EmptyState } from "@/components/dashboard/EmptyState";

export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { staffType, entityInfo, permissions, loading: scopeLoading, error } = useStaffContext();

  const [activeSection, setActiveSection] = useState("dashboard");

  const entityId = useMemo(() => {
    const p: any = permissions as any;
    return (p?.entity_id as string) || "";
  }, [permissions]);

  useEffect(() => {
    setActiveSection("dashboard");
  }, [staffType, entityId]);

  if (authLoading || scopeLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <EmptyState
          title="Sign in required"
          description="Please sign in to access the staff dashboard."
          action={{ label: "Sign In", onClick: () => navigate("/auth") }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <EmptyState
          title="Unable to load staff scope"
          description={String((error as any)?.message || error)}
          action={{ label: "Reload", onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  if (!permissions || !entityId || staffType === "unknown") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <EmptyState
          title="No staff access found"
          description="This account is not currently assigned to a clinic/lab/imaging/pharmacy."
          action={{ label: "Go Home", onClick: () => navigate("/") }}
        />
      </div>
    );
  }

  const renderContent = () => {
    if (activeSection === "dashboard") {
      if (staffType === "lab") return <LabDashboardContent entityInfo={entityInfo} permissions={permissions} />;
      if (staffType === "imaging") return <ImagingDashboardContent entityInfo={entityInfo} permissions={permissions} />;
      if (staffType === "pharmacy") return <PharmacyDashboardContent entityInfo={entityInfo} permissions={permissions} />;
      return <div />;
    }

    if (staffType === "lab") {
      if (activeSection === "orders") return <LabOrderQueue labCenterId={entityId} />;
      if (activeSection === "samples") return <LabSampleManager labCenterId={entityId} />;
      if (activeSection === "processing") return <LabSampleManager labCenterId={entityId} />;
      if (activeSection === "equipment") return <LabHomeCollection labCenterId={entityId} />;
      return <LabDashboardContent entityInfo={entityInfo} permissions={permissions} />;
    }

    if (staffType === "imaging") {
      if (activeSection === "orders") return <ImagingScanWorkflow imagingCenterId={entityId} />;
      if (activeSection === "scans") return <ImagingScanWorkflow imagingCenterId={entityId} />;
      if (activeSection === "processing") return <ImagingScanWorkflow imagingCenterId={entityId} />;
      if (activeSection === "results") return <ImagingReportManager imagingCenterId={entityId} />;
      if (activeSection === "verification") return <ImagingReportManager imagingCenterId={entityId} />;
      if (activeSection === "equipment") return <ImagingEquipmentManager imagingCenterId={entityId} />;
      return <ImagingDashboardContent entityInfo={entityInfo} permissions={permissions} />;
    }

    if (staffType === "pharmacy") {
      if (activeSection === "prescriptions") return <PharmacyPrescriptionInbox pharmacyId={entityId} />;
      if (activeSection === "dispensing") return <FulfillmentQueue pharmacyId={entityId} />;
      if (activeSection === "inventory") return <PharmacyInventoryManager pharmacyId={entityId} />;
      if (activeSection === "orders") return <PharmacyDeliveryOrders pharmacyId={entityId} />;
      return <PharmacyDashboardContent entityInfo={entityInfo} permissions={permissions} />;
    }

    return <div />;
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <StaffSidebar
        staffType={staffType}
        entityInfo={entityInfo}
        permissions={permissions}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
        {renderContent()}

        {staffType === "imaging" && (activeSection === "dashboard" || activeSection === "orders") ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Analytics</h3>
              <ImagingAnalytics imagingCenterId={entityId} />
            </div>
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Billing</h3>
              <ImagingBillingSection imagingCenterId={entityId} />
            </div>
          </div>
        ) : null}

        {staffType === "pharmacy" && activeSection === "dashboard" ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Analytics</h3>
              <PharmacyAnalytics pharmacyId={entityId} />
            </div>
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Billing / Claims</h3>
              <PharmacyInsuranceClaims pharmacyId={entityId} />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
