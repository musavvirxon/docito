import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, CheckCircle, Clock, Lock, ExternalLink, X, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDoctorVerificationStatus } from "@/hooks/useDoctorVerificationStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { specialtyCategories, allLanguages, consultationTypes, experienceOptions } from "@/config/doctorFormData";

interface DoctorProfileSectionProps {
  doctorProfile?: any;
}

const DoctorProfileSection = ({ doctorProfile: propProfile }: DoctorProfileSectionProps) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { doctorProfile: profile, loading, stats, refreshAll } = useDoctorData();
  const { verificationStatus } = useDoctorVerificationStatus();
  const { uploadFile, uploading } = useFileUpload();

  const doctorProfile = propProfile || profile;
  const profileCompletion = stats?.profileCompletion || 0;
  const isEditingLocked = verificationStatus?.status === 'pending' || verificationStatus?.status === 'resubmitted';

  const [formData, setFormData] = useState({
    bio: '',
    license_number: '',
    consultation_fee: '',
    years_experience: '',
    phone: '',
  });

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [expandedSpecialty, setExpandedSpecialty] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageSearch, setLanguageSearch] = useState("");
  const [selectedConsultationTypes, setSelectedConsultationTypes] = useState<string[]>([]);

  useEffect(() => {
    if (doctorProfile && user) {
      setFormData({
        bio: doctorProfile.bio || '',
        license_number: doctorProfile.license_number || '',
        consultation_fee: doctorProfile.consultation_fee?.toString() || '',
        years_experience: doctorProfile.years_experience?.toString() || '',
        phone: doctorProfile.profiles?.phone || '',
      });

      if (doctorProfile.specialty) {
        setSelectedSpecialties([doctorProfile.specialty]);
      }
      if (doctorProfile.languages) {
        setSelectedLanguages(doctorProfile.languages);
      }
      if (doctorProfile.consultation_types) {
        setSelectedConsultationTypes(doctorProfile.consultation_types);
      }
    }
  }, [doctorProfile, user]);

  const toggleSpecialty = (specialty: string, parentSpecialty: string) => {
    if (isEditingLocked) return;
    const fullName = `${parentSpecialty} - ${specialty}`;
    setSelectedSpecialties(prev => {
      if (prev.includes(fullName)) return prev.filter(s => s !== fullName);
      if (prev.length >= 5) { toast.error('Max 5 subspecialties'); return prev; }
      return [...prev, fullName];
    });
  };

  const removeSpecialty = (spec: string) => !isEditingLocked && setSelectedSpecialties(prev => prev.filter(s => s !== spec));
  const toggleExpandSpecialty = (spec: string) => setExpandedSpecialty(prev => prev === spec ? null : spec);
  const toggleLanguage = (lang: string) => !isEditingLocked && setSelectedLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  const removeLanguage = (lang: string) => !isEditingLocked && setSelectedLanguages(prev => prev.filter(l => l !== lang));
  const toggleConsultationType = (type: string) => !isEditingLocked && setSelectedConsultationTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);

  const filteredMainSpecialties = Object.keys(specialtyCategories).filter(spec => {
    const subs = specialtyCategories[spec as keyof typeof specialtyCategories];
    if (subs.length === 0) return false;
    if (specialtySearch) {
      return spec.toLowerCase().includes(specialtySearch.toLowerCase()) || subs.some(sub => sub.toLowerCase().includes(specialtySearch.toLowerCase()));
    }
    return true;
  });

  const filteredLanguages = allLanguages.filter(lang => lang.toLowerCase().includes(languageSearch.toLowerCase()) && !selectedLanguages.includes(lang));

  const handleSaveChanges = async () => {
    if (!user || !doctorProfile) { toast.error("Not authenticated"); return; }
    if (isEditingLocked) { toast.error("Profile locked during verification"); return; }

    try {
      const { error: profileError } = await supabase.from('profiles').update({ phone: formData.phone }).eq('user_id', user.id);
      if (profileError) { console.error(profileError); toast.error('Failed to update profile'); return; }

      const { error: doctorError } = await supabase.from('doctors').update({
        specialty: selectedSpecialties[0] || doctorProfile.specialty,
        bio: formData.bio,
        license_number: formData.license_number,
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        languages: selectedLanguages,
        consultation_types: selectedConsultationTypes
      }).eq('user_id', user.id);

      if (doctorError) throw doctorError;
      toast.success('Profile updated successfully');
      refreshAll?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user || isEditingLocked) return;
    if (!['image/png', 'image/jpg', 'image/jpeg'].includes(file.type)) { toast.error('Only PNG/JPG allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const result = await uploadFile(file, 'avatars', `${user.id}/avatar-${Date.now()}.jpg`);
    if (result) {
      await supabase.from('profiles').update({ avatar_url: result.url }).eq('user_id', user.id);
      toast.success('Avatar uploaded');
      refreshAll?.();
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!doctorProfile) return <div className="text-center p-8"><p className="text-muted-foreground">{t("doctor.profile.noProfile")}</p></div>;

  return (
    <div className="space-y-6">
      {isEditingLocked && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-600" />
            <div>
              <h3 className="font-semibold">Verification Pending</h3>
              <p className="text-sm text-muted-foreground">Profile locked during review.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/doctor-signup')}>View Status <ExternalLink className="w-3 h-3 ml-2" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">{t("doctor.profile.title")} {doctorProfile?.verified ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-amber-600" />}</CardTitle>
            <Badge className={doctorProfile?.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{doctorProfile?.verified ? "Verified" : "Pending"}</Badge>
          </div>
          <div className="mt-4"><Progress value={profileCompletion} className="h-2" /><p className="text-sm mt-1">{profileCompletion}% complete</p></div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20"><AvatarImage src={doctorProfile.profiles?.avatar_url} /><AvatarFallback>{doctorProfile.profiles?.full_name?.charAt(0) || 'DR'}</AvatarFallback></Avatar>
            <Button variant="outline" size="sm" disabled={uploading || isEditingLocked} onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = (e) => { const f = (e.target as HTMLInputElement)?.files?.[0]; if (f) handleAvatarUpload(f); }; i.click(); }}><Upload className="w-4 h-4 mr-2" />{uploading ? 'Uploading...' : 'Upload Photo'}</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Full Name</Label><Input value={doctorProfile.profiles?.full_name || ''} readOnly className="bg-muted/50" /></div>
            <div><Label>Email</Label><Input value={doctorProfile.profiles?.email || ''} readOnly className="bg-muted/50" /></div>
          </div>
          <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} disabled={isEditingLocked} /></div>
          <div><Label>Bio</Label><Textarea value={formData.bio} onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))} disabled={isEditingLocked} className="min-h-[100px]" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-lg">Specialties</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-4">
          {selectedSpecialties.length > 0 && <div className="flex flex-wrap gap-2">{selectedSpecialties.map(s => <Badge key={s} variant="secondary" className="flex items-center gap-1">{s}{!isEditingLocked && <X className="w-3 h-3 cursor-pointer" onClick={() => removeSpecialty(s)} />}</Badge>)}</div>}
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={specialtySearch} onChange={(e) => setSpecialtySearch(e.target.value)} className="pl-10" disabled={isEditingLocked} /></div>
          <div className="border rounded-lg max-h-[250px] overflow-y-auto">
            {filteredMainSpecialties.map(main => {
              const subs = specialtyCategories[main as keyof typeof specialtyCategories];
              return (
                <div key={main} className="border-b last:border-b-0">
                  <button type="button" onClick={() => toggleExpandSpecialty(main)} className="w-full px-4 py-2 flex justify-between items-center hover:bg-muted/50" disabled={isEditingLocked}>
                    <span className="text-sm font-medium">{main}</span>{expandedSpecialty === main ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSpecialty === main && <div className="px-4 pb-2 grid grid-cols-2 gap-1">{subs.map(sub => <label key={sub} className="flex items-center gap-2 p-1 text-sm cursor-pointer"><Checkbox checked={selectedSpecialties.includes(`${main} - ${sub}`)} onCheckedChange={() => toggleSpecialty(sub, main)} disabled={isEditingLocked} />{sub}</label>)}</div>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-lg">Languages</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-4">
          {selectedLanguages.length > 0 && <div className="flex flex-wrap gap-2">{selectedLanguages.map(l => <Badge key={l} variant="secondary" className="flex items-center gap-1">{l}{!isEditingLocked && <X className="w-3 h-3 cursor-pointer" onClick={() => removeLanguage(l)} />}</Badge>)}</div>}
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={languageSearch} onChange={(e) => setLanguageSearch(e.target.value)} className="pl-10" disabled={isEditingLocked} /></div>
          <div className="border rounded-lg max-h-[150px] overflow-y-auto p-2 grid grid-cols-3 gap-1">{filteredLanguages.slice(0, 30).map(l => <label key={l} className="flex items-center gap-2 p-1 text-sm cursor-pointer"><Checkbox checked={selectedLanguages.includes(l)} onCheckedChange={() => toggleLanguage(l)} disabled={isEditingLocked} />{l}</label>)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-lg">Professional Details</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>License Number</Label><Input value={formData.license_number} onChange={(e) => setFormData(p => ({ ...p, license_number: e.target.value }))} disabled={isEditingLocked} /></div>
            <div><Label>Experience</Label><Select value={formData.years_experience} onValueChange={(v) => setFormData(p => ({ ...p, years_experience: v }))} disabled={isEditingLocked}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{experienceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Consultation Types</Label><div className="flex gap-2 mt-2">{consultationTypes.map(t => <label key={t} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${selectedConsultationTypes.includes(t) ? 'border-primary bg-primary/10' : ''}`}><Checkbox checked={selectedConsultationTypes.includes(t)} onCheckedChange={() => toggleConsultationType(t)} disabled={isEditingLocked} />{t}</label>)}</div></div>
          <div><Label>Consultation Fee ($)</Label><Input type="number" value={formData.consultation_fee} onChange={(e) => setFormData(p => ({ ...p, consultation_fee: e.target.value }))} disabled={isEditingLocked} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={handleSaveChanges} disabled={isEditingLocked} size="lg">{isEditingLocked ? <><Lock className="w-4 h-4 mr-2" />Locked</> : 'Save Changes'}</Button></div>
    </div>
  );
};

export default DoctorProfileSection;
