// src/pages/LandingPage.tsx
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import RoleSelector from "@/components/landing/RoleSelector";
import DoctorLanding from "@/components/landing/DoctorLanding";
import ClinicLanding from "@/components/landing/ClinicLanding";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export type LandingRole = "doctor" | "clinic";

interface LandingSection {
  id: string;
  section_key: string;
  title: string;
  subtitle: string;
  content: any;
  image_url: string;
  cta_text: string;
  cta_link: string;
  display_order: number;
  is_visible: boolean;
}

export default function LandingPage() {
  const { t } = useTranslation('common');
  const [role, setRole] = useState<LandingRole | null>(null);
  const [sections, setSections] = useState<LandingSection[]>([]);

  useEffect(() => {
    const loadSections = async () => {
      const { data } = await (supabase as any)
        .from('landing_sections')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      setSections(data || []);
    };
    loadSections();
  }, []);

  // Get CMS overrides for hero section
  const heroSection = sections.find(s => s.section_key === 'hero');
  const heroTitle = heroSection?.title || "Run your entire clinic without the chaos";
  const heroSubtitle = heroSection?.subtitle || "Docito connects scheduling, patient records, diagnostics, prescriptions, referrals, and billing into one system.";

  return (
    <>
      <Helmet>
        <title>Docito® — {heroTitle}</title>
        <meta name="description" content={heroSubtitle} />
        <link rel="canonical" href="https://docito.app/landing" />
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
