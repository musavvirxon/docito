// Path: src/components/ui/PageShell.tsx
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageShell(props: {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  actions?: ReactNode;
  children: ReactNode;
  empty?: { show: boolean; title?: string; description?: string; action?: ReactNode };
}) {
  const { title, description, loading, error, actions, children, empty } = props;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive whitespace-pre-wrap">{error}</div>
          ) : empty?.show ? (
            <div className="py-10 text-center space-y-2">
              <div className="text-base font-medium">{empty.title || "Nothing here yet"}</div>
              <div className="text-sm text-muted-foreground">{empty.description || "No records found for this view."}</div>
              {empty.action ? <div className="pt-2 flex items-center justify-center">{empty.action}</div> : null}
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </div>
  );
}
