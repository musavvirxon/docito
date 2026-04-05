import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface BranchSelectorProps {
  practiceId: string;
  value: string | null;
  onChange: (locationId: string | null) => void;
  className?: string;
}

type LocationRow = {
  id: string;
  name: string;
  address: string | null;
};

export default function BranchSelector({ practiceId, value, onChange, className }: BranchSelectorProps) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!practiceId) return;
    setLoading(true);
    (supabase as any)
      .from("practice_locations")
      .select("id,name,address")
      .eq("practice_id", practiceId)
      .order("name", { ascending: true })
      .limit(200)
      .then(({ data, error }: any) => {
        if (!error && data) setLocations(data as LocationRow[]);
        setLoading(false);
      });
  }, [practiceId]);

  if (locations.length === 0 && !loading) return null;

  return (
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(v === "all" ? null : v)}
    >
      <SelectTrigger className={className || "w-[200px]"}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="All Branches" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Branches</SelectItem>
        {locations.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            {loc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
