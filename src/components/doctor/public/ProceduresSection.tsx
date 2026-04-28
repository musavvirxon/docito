import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Clock } from 'lucide-react';

export interface PublicProcedure {
  id: string;
  name: string;
  description?: string | null;
  cost: number | null;
  duration_minutes?: number | null;
  category?: string | null;
}

interface Props {
  procedures: PublicProcedure[];
  currency?: string;
}

const fmtMoney = (n: number | null | undefined, currency = 'USD') => {
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
};

export default function ProceduresSection({ procedures, currency = 'USD' }: Props) {
  return (
    <section aria-labelledby="procedures-heading">
      <h2
        id="procedures-heading"
        className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"
      >
        <Stethoscope className="h-5 w-5 text-primary" />
        Procedures &amp; Services
      </h2>

      {procedures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            This doctor hasn&apos;t published any procedures yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {procedures.map((p) => (
            <Card key={p.id} className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                  {p.category && (
                    <Badge variant="outline" className="capitalize shrink-0">
                      {String(p.category).replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-base font-semibold tabular-nums">
                    {fmtMoney(p.cost, currency)}
                  </span>
                  {p.duration_minutes ? (
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {p.duration_minutes} min
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
