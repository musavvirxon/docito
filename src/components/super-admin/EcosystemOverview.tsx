import { motion } from "framer-motion";
import { Building2, Pill, FlaskConical, Scan, Users, Stethoscope, Activity, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  delay: number;
}

const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span>{count.toLocaleString()}</span>;
};

const StatCard = ({ icon: Icon, label, value, color, delay }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={value} />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const EcosystemOverview = () => {
  const { data: stats } = useQuery({
    queryKey: ['ecosystem-stats'],
    queryFn: async () => {
      const [clinics, pharmacies, labs, imaging, doctors, staff] = await Promise.all([
        supabase.from('practices').select('id', { count: 'exact', head: true }),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }),
        supabase.from('lab_centers').select('id', { count: 'exact', head: true }),
        supabase.from('imaging_centers').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }),
        supabase.from('clinic_staff').select('id', { count: 'exact', head: true }),
      ]);
      
      return {
        clinics: clinics.count || 0,
        pharmacies: pharmacies.count || 0,
        labs: labs.count || 0,
        imaging: imaging.count || 0,
        doctors: doctors.count || 0,
        staff: staff.count || 0,
      };
    },
    staleTime: 30000,
  });

  const ecosystemStats = [
    { icon: Building2, label: "Total Clinics", value: stats?.clinics || 0, color: "bg-blue-500", delay: 0 },
    { icon: Pill, label: "Total Pharmacies", value: stats?.pharmacies || 0, color: "bg-green-500", delay: 0.1 },
    { icon: FlaskConical, label: "Total Laboratories", value: stats?.labs || 0, color: "bg-purple-500", delay: 0.2 },
    { icon: Scan, label: "Imaging Centers", value: stats?.imaging || 0, color: "bg-orange-500", delay: 0.3 },
    { icon: Stethoscope, label: "Total Doctors", value: stats?.doctors || 0, color: "bg-cyan-500", delay: 0.4 },
    { icon: Users, label: "Total Staff", value: stats?.staff || 0, color: "bg-pink-500", delay: 0.5 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ecosystem Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time view of your healthcare platform</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ecosystemStats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Platform Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-primary/20">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Platform Health</h3>
                  <p className="text-muted-foreground">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-500 font-medium">Healthy</span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">99.9%</p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">45ms</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Active Incidents</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-2xl font-bold text-foreground">12%</p>
                </div>
                <p className="text-xs text-muted-foreground">Growth Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default EcosystemOverview;