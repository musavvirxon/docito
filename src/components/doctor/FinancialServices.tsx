import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ServiceEarnings {
  serviceId: string;
  serviceName: string;
  bookings: number;
  totalRevenue: number;
  avgRevenue: number;
  avgDuration: number;
}

interface FinancialServicesProps {
  serviceEarnings: ServiceEarnings[];
}

export const FinancialServices = ({ serviceEarnings }: FinancialServicesProps) => {
  const [sortBy, setSortBy] = useState<'bookings' | 'revenue'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedServices = [...serviceEarnings].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'bookings') {
      return (a.bookings - b.bookings) * multiplier;
    }
    return (a.totalRevenue - b.totalRevenue) * multiplier;
  });

  const toggleSort = (field: 'bookings' | 'revenue') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings by Service/Procedure</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Name</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleSort('bookings')}
                  className="hover:bg-transparent"
                >
                  Bookings <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleSort('revenue')}
                  className="hover:bg-transparent"
                >
                  Total Revenue <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Avg Revenue</TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Avg Duration
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedServices.length > 0 ? (
              sortedServices.map((service) => (
                <TableRow key={service.serviceId}>
                  <TableCell className="font-medium">{service.serviceName}</TableCell>
                  <TableCell>{service.bookings}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    ${service.totalRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell>${service.avgRevenue.toFixed(2)}</TableCell>
                  <TableCell>{service.avgDuration} min</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No service earnings data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
