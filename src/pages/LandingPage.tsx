// src/pages/LandingPage.tsx
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import RoleSelector from "@/components/landing/RoleSelector";
import DoctorLanding from "@/components/landing/DoctorLanding";
import ClinicLanding from "@/components/landing/ClinicLanding";

export type LandingRole = "doctor" | "clinic";

export default function LandingPage() {
  const [role, setRole] = useState<LandingRole | null>(null);

  return (
    <>
      <Helmet>
        <title>Docito® — Run your entire clinic without the chaos</title>
        <meta
          name="description"
          content="Docito connects scheduling, patient records, diagnostics, prescriptions, referrals, and billing into one system—so you spend less time managing workflows and more time delivering care."
        />
        <link rel="canonical" href="https://docito.app/start" />
      </Helmet>

      {role === null && <RoleSelector onSelect={setRole} />}
      {role === "doctor" && (
        <DoctorLanding onChangeRole={() => setRole(null)} />
      )}
      {role === "clinic" && (
        <ClinicLanding onChangeRole={() => setRole(null)} />
      )}
    </>
  );
}
