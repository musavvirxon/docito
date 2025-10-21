import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Ban, Trash2 } from "lucide-react";

interface ManagementTableProps {
  title: string;
  type: "doctors" | "practices" | "patients" | "appointments" | "payments";
}

const ManagementTable = ({ title, type }: ManagementTableProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query;
      
      switch (type) {
        case "doctors":
          query = supabase
            .from("doctors")
            .select("*, profiles!inner(full_name, email)")
            .limit(10);
          break;
        case "practices":
          query = supabase
            .from("practices")
            .select("*")
            .limit(10);
          break;
        case "patients":
          query = supabase
            .from("profiles")
            .select("*")
            .eq("role", "patient")
            .limit(10);
          break;
        case "appointments":
          query = supabase
            .from("appointments")
            .select("*, doctors(id), profiles!appointments_patient_id_fkey(full_name)")
            .order("appointment_date", { ascending: false })
            .limit(10);
          break;
        case "payments":
          query = supabase
            .from("payments")
            .select("*, profiles!payments_patient_id_fkey(full_name)")
            .order("created_at", { ascending: false })
            .limit(10);
          break;
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const renderTableHeaders = () => {
    switch (type) {
      case "doctors":
        return (
          <>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Specialty</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "practices":
        return (
          <>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "patients":
        return (
          <>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "appointments":
        return (
          <>
            <TableHead>Patient</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "payments":
        return (
          <>
            <TableHead>Patient</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
    }
  };

  const renderTableRows = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
            No data available
          </TableCell>
        </TableRow>
      );
    }

    return data.map((item, index) => {
      switch (type) {
        case "doctors":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.profiles?.full_name || "N/A"}</TableCell>
              <TableCell>{item.profiles?.email || "N/A"}</TableCell>
              <TableCell>{item.specialty}</TableCell>
              <TableCell>{item.average_rating?.toFixed(1) || "0.0"} ⭐</TableCell>
              <TableCell>
                <Badge variant={item.verified ? "default" : "secondary"}>
                  {item.verified ? "Verified" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Ban className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "practices":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.city || "N/A"}</TableCell>
              <TableCell>{item.practice_type}</TableCell>
              <TableCell>{item.average_rating?.toFixed(1) || "0.0"} ⭐</TableCell>
              <TableCell>
                <Badge variant={item.verified ? "default" : "secondary"}>
                  {item.verification_status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Ban className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "patients":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.full_name}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell>{item.phone || "N/A"}</TableCell>
              <TableCell>
                <Badge variant={item.is_verified ? "default" : "secondary"}>
                  {item.is_verified ? "Verified" : "Unverified"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Ban className="w-4 h-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "appointments":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.profiles?.full_name || "N/A"}</TableCell>
              <TableCell>{new Date(item.appointment_date).toLocaleDateString()}</TableCell>
              <TableCell>{item.start_time}</TableCell>
              <TableCell>
                <Badge variant={item.status === "confirmed" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "payments":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.profiles?.full_name || "N/A"}</TableCell>
              <TableCell>${Number(item.amount).toFixed(2)}</TableCell>
              <TableCell>{item.payment_method || "N/A"}</TableCell>
              <TableCell>
                <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
      }
    });
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border-2 border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {renderTableHeaders()}
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderTableRows()}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManagementTable;
