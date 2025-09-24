import { useState } from "react";
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
import { Upload, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface DoctorProfileSectionProps {
  doctorProfile: {
    id: string;
    user_id: string;
    specialty: string;
    bio?: string;
    verified: boolean;
    license_number?: string;
    consultation_fee?: number;
    average_rating: number;
    num_reviews: number;
    profiles?: {
      full_name: string;
      email: string;
      avatar_url?: string;
      phone?: string;
    };
    practices?: {
      name: string;
      city: string;
      country: string;
      verified: boolean;
    };
  };
}

const DoctorProfileSection = ({ doctorProfile }: DoctorProfileSectionProps) => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English", "Spanish"]);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "rejected">(
    doctorProfile.verified ? "verified" : "pending"
  );

  const specialties = [
    "Cardiology", "Dermatology", "Family Medicine", "Internal Medicine", "Pediatrics",
    "Orthopedics", "Psychiatry", "Neurology", "Gastroenterology", "Obstetrics & Gynecology"
  ];

  const languages = [
    "English", "Spanish", "Mandarin", "Hindi", "Arabic", "Portuguese", 
    "Russian", "Japanese", "German", "French", "Italian", "Korean"
  ];

  const consultationTypes = ["In-person", "Video", "Chat"];

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => 
      prev.includes(language) 
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const getVerificationIcon = () => {
    switch (verificationStatus) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case "verified":
        return <Badge className="bg-green-100 text-green-700">Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700">Pending Verification</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Completion Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Profile Completion
                {getVerificationIcon()}
              </CardTitle>
              <p className="text-muted-foreground">Complete your profile to get more visibility</p>
            </div>
            {getVerificationBadge()}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">85%</span>
            </div>
            <Progress value={85} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={doctorProfile.profiles?.avatar_url} />
              <AvatarFallback className="text-lg">
                {doctorProfile.profiles?.full_name?.charAt(0) || 'DR'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <p className="text-sm text-muted-foreground">Professional headshot recommended</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fullName">Full Name (Optional)</Label>
              <Input id="fullName" defaultValue={doctorProfile.profiles?.full_name || ''} />
            </div>
            <div>
              <Label htmlFor="degree">Degree/Certifications</Label>
              <Input id="degree" placeholder="MD, Board Certified" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="specialty">Specialty *</Label>
              <Select defaultValue={doctorProfile.specialty.toLowerCase()}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty.toLowerCase()}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Select defaultValue="6-10">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-2">0-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="6-10">6-10 years</SelectItem>
                  <SelectItem value="11-15">11-15 years</SelectItem>
                  <SelectItem value="16-20">16-20 years</SelectItem>
                  <SelectItem value="20+">20+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">About Me / Bio</Label>
            <Textarea 
              id="bio" 
              placeholder="Tell patients about your experience, approach to care, and what makes you unique..."
              className="min-h-[100px]"
              defaultValue={doctorProfile.bio || ''}
            />
          </div>

          <div>
            <Label>Languages Spoken</Label>
            <p className="text-sm text-muted-foreground mb-3">Select all languages you speak fluently</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {languages.map((language) => (
                <div key={language} className="flex items-center space-x-2">
                  <Checkbox 
                    id={language}
                    checked={selectedLanguages.includes(language)}
                    onCheckedChange={() => toggleLanguage(language)}
                  />
                  <Label htmlFor={language} className="text-sm">{language}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="license">Medical License Number</Label>
              <Input id="license" placeholder="License number" defaultValue={doctorProfile.license_number || ''} />
            </div>
            <div>
              <Label htmlFor="npi">NPI Number</Label>
              <Input id="npi" placeholder="National Provider Identifier" />
            </div>
          </div>

          <div>
            <Label>Consultation Types Offered</Label>
            <div className="flex space-x-4 mt-2">
              {consultationTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox id={type} defaultChecked />
                  <Label htmlFor={type} className="text-sm">{type}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="defaultPrice">Default Consultation Price</Label>
              <Input id="defaultPrice" placeholder="$150" defaultValue={doctorProfile.consultation_fee ? `$${doctorProfile.consultation_fee}` : ''} />
            </div>
            <div>
              <Label htmlFor="location">Primary Location</Label>
              <Input id="location" placeholder="City, State" 
                defaultValue={doctorProfile.practices ? `${doctorProfile.practices.city}, ${doctorProfile.practices.country}` : ''} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Medical License</p>
              <p className="text-xs text-muted-foreground mb-2">Upload license document</p>
              <Button variant="outline" size="sm">Choose File</Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Professional ID</p>
              <p className="text-xs text-muted-foreground mb-2">Government issued ID</p>
              <Button variant="outline" size="sm">Choose File</Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button>Save Changes</Button>
            <Button variant="outline">Submit for Verification</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfileSection;