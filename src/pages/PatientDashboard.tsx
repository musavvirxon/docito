import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import SearchBar from "@/components/patient/SearchBar";
import SearchResults from "@/components/patient/SearchResults";
import MedicalHistory from "@/components/patient/MedicalHistory";
import { 
  Heart, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Users, 
  CreditCard,
  Settings,
  User,
  Shield,
  Bell,
  Upload,
  Search,
  Star,
  MapPin,
  Clock,
  Phone,
  Mail,
  Camera,
  Plus,
  Eye,
  EyeOff,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location: string;
  rating: number;
  availability?: string;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  distance?: string;
}

const PatientDashboard = () => {
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Dr. Sarah Johnson",
    "Dental cleaning",
    "Eye exam near me"
  ]);
  const { toast } = useToast();

  const handleVerifyEmail = () => {
    toast({
      title: "✉️ Verification email sent!",
      description: "Please check your inbox and click the verification link.",
    });
  };

  const handleVerifyPhone = () => {
    toast({
      title: "📱 OTP sent!",
      description: "We've sent a code to your phone number.",
    });
  };

  const handleBookAppointment = (result?: SearchResult) => {
    if (!emailVerified || !phoneVerified) {
      toast({
        title: "⚠️ Verification Required",
        description: "Please verify your email and phone before booking appointments.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "🎉 Redirecting to booking!",
      description: result 
        ? `Booking appointment with ${result.name}...`
        : "Taking you to our secure payment and booking system...",
    });
  };

  const handleSearch = (results: SearchResult[]) => {
    setSearchResults(results);
    setShowResults(true);
    
    // Add to recent searches (simplified)
    if (results.length > 0) {
      const firstResult = results[0];
      const searchQuery = firstResult.name;
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s !== searchQuery);
        return [searchQuery, ...filtered].slice(0, 5);
      });
    }
  };

  const handleViewPractice = (result: SearchResult) => {
    toast({
      title: `Viewing ${result.name}`,
      description: "Showing doctors and services at this practice...",
    });
  };

  const handleFavorite = (result: SearchResult) => {
    toast({
      title: "Added to favorites",
      description: `${result.name} has been saved to your favorites.`,
    });
  };

  const isFullyVerified = emailVerified && phoneVerified;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center">
                <span className="text-foreground font-bold text-lg">Z</span>
              </div>
              <span className="text-xl font-semibold text-foreground">Your Health Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={isFullyVerified ? "default" : "secondary"} className="px-3">
                {isFullyVerified ? "✅ Verified" : "⏳ Verification Pending"}
              </Badge>
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground">JD</AvatarFallback>
              </Avatar>
            </div>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Verification Alert */}
        {!isFullyVerified && (
          <Card className="mb-8 border-orange-200 bg-orange-50/50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 rounded-full p-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800 mb-2">
                    Complete Verification to Start Booking 🌟
                  </h3>
                  <p className="text-orange-700 mb-4">
                    We need to confirm your info to give you the best care possible and secure your bookings.
                  </p>
                  <div className="flex items-center space-x-6 mb-4">
                    <div className="flex items-center space-x-2">
                      {emailVerified ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={emailVerified ? "text-green-700" : "text-red-600"}>
                        Email {emailVerified ? "verified" : "not verified"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {phoneVerified ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={phoneVerified ? "text-green-700" : "text-red-600"}>
                        Phone {phoneVerified ? "verified" : "not verified"}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {!emailVerified && (
                      <Button onClick={handleVerifyEmail} variant="outline" size="sm">
                        Verify Email
                      </Button>
                    )}
                    {!phoneVerified && (
                      <Button onClick={handleVerifyPhone} variant="outline" size="sm">
                        Verify Phone
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Search Section */}
        <SearchBar 
          onSearch={handleSearch}
          className="mb-8"
        />

        {/* Search Results */}
        {showResults && (
          <div className="mb-8">
            <SearchResults
              results={searchResults}
              onBookAppointment={handleBookAppointment}
              onViewPractice={handleViewPractice}
              onFavorite={handleFavorite}
            />
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && !showResults && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Recent Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      // Simulate a quick search
                      const mockResult: SearchResult = {
                        id: `recent-${index}`,
                        type: search.includes('Dr.') ? 'doctor' : 'practice',
                        name: search,
                        location: "Your area",
                        rating: 4.5,
                        acceptsInsurance: true,
                        acceptsNewPatients: true
                      };
                      handleSearch([mockResult]);
                    }}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard */}
        <Tabs defaultValue="wellness" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="wellness" className="flex items-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>Wellness Guide</span>
            </TabsTrigger>
            <TabsTrigger value="care-team" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Care Team</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Insurance</span>
            </TabsTrigger>
            <TabsTrigger value="medical-history" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Medical History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Wellness Guide Tab */}
          <TabsContent value="wellness" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span>Your Wellness Journey</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      🎉 You're taking a great step toward better health!
                    </h3>
                    <p className="text-green-700">
                      Let's keep track of your wellness milestones together.
                    </p>
                  </div>

                  {/* Checkup Reminders */}
                  <div className="space-y-3">
                    {[
                      { task: "Annual Physical", status: "due", dueDate: "Due in 2 weeks" },
                      { task: "Dental Cleaning", status: "completed", dueDate: "Completed 3 months ago" },
                      { task: "Eye Exam", status: "upcoming", dueDate: "Scheduled for next month" },
                      { task: "Blood Work", status: "overdue", dueDate: "Overdue by 1 month" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            item.status === 'completed' ? 'bg-green-500' :
                            item.status === 'upcoming' ? 'bg-blue-500' :
                            item.status === 'due' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <div>
                            <h4 className="font-medium">{item.task}</h4>
                            <p className="text-sm text-muted-foreground">{item.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {item.status !== 'completed' && (
                            <Button onClick={() => handleBookAppointment()} size="sm">
                              Book
                            </Button>
                          )}
                          {item.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              Mark Done
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Demo */}
            <Card>
              <CardHeader>
                <CardTitle>🩺 Book Your Next Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 border-2 border-dashed border-primary/30 rounded-lg">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Ready to book?</h3>
                  <p className="text-muted-foreground mb-4">
                    You'll be charged now, but don't worry — your money is protected and only released after the appointment!
                  </p>
                  <Button onClick={() => handleBookAppointment()} className="bg-primary hover:bg-primary/90">
                    Start Booking Process
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Care Team Tab */}
          <TabsContent value="care-team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Your Care Team</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Provider
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for doctors, dentists, specialists..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Current Providers */}
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>DR</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold">Dr. Sarah Johnson</h4>
                        <p className="text-sm text-muted-foreground">Primary Care Physician</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm">4.9</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Downtown Medical</span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleBookAppointment()} size="sm">
                        Book Appointment
                      </Button>
                    </div>
                  </div>

                  {/* Add Provider CTA */}
                  <div className="text-center p-6 border-2 border-dashed border-muted rounded-lg">
                    <h4 className="font-medium mb-2">Need a specialist?</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Find dentists, specialists, and more in your area
                    </p>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Find Providers
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <span>Insurance Plans</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Medical Insurance */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Medical Insurance</h4>
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Card
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="medical-carrier">Carrier</Label>
                      <Input id="medical-carrier" placeholder="e.g., Aetna" />
                    </div>
                    <div>
                      <Label htmlFor="medical-plan">Plan</Label>
                      <Input id="medical-plan" placeholder="e.g., Silver 80 PPO" />
                    </div>
                  </div>
                </div>

                {/* Dental Insurance */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Dental Insurance</h4>
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Card
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dental-carrier">Carrier</Label>
                      <Input id="dental-carrier" placeholder="e.g., Delta Dental" />
                    </div>
                    <div>
                      <Label htmlFor="dental-plan">Plan</Label>
                      <Input id="dental-plan" placeholder="e.g., Premium Plan" />
                    </div>
                  </div>
                </div>

                {/* Vision Insurance */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Vision Insurance</h4>
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Card
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vision-carrier">Carrier</Label>
                      <Input id="vision-carrier" placeholder="e.g., VSP" />
                    </div>
                    <div>
                      <Label htmlFor="vision-plan">Plan</Label>
                      <Input id="vision-plan" placeholder="e.g., Choice Plan" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Settings Sidebar */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-2">
                    {[
                      { icon: User, label: "Personal Information", active: true },
                      { icon: Users, label: "Family Members" },
                      { icon: CreditCard, label: "Insurance & ID Cards" },
                      { icon: Shield, label: "Privacy" },
                      { icon: Settings, label: "Login & Security" },
                      { icon: Bell, label: "Notifications" }
                    ].map((item, index) => (
                      <button
                        key={index}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                          item.active 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>

              {/* Settings Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first-name">First Name</Label>
                        <Input id="first-name" defaultValue="John" />
                      </div>
                      <div>
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input id="last-name" defaultValue="Doe" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="john.doe@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" defaultValue="(555) 123-4567" />
                    </div>
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input id="dob" type="date" defaultValue="1985-06-15" />
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Login & Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input 
                          id="current-password" 
                          type={showPasswords ? "text" : "password"}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input 
                        id="new-password" 
                        type={showPasswords ? "text" : "password"}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Appointment Confirmations", desc: "Get notified when appointments are confirmed" },
                      { label: "Appointment Reminders", desc: "Receive reminders before your appointments" },
                      { label: "Cancellation Notices", desc: "Be informed of any cancellations" },
                      { label: "Health Tips", desc: "Receive personalized health recommendations" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{item.label}</h4>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <div className="flex space-x-2">
                          <div className="text-center">
                            <Mail className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <Switch defaultChecked />
                          </div>
                          <div className="text-center">
                            <Phone className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <Switch />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="medical-history" className="space-y-6">
            <MedicalHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatientDashboard;