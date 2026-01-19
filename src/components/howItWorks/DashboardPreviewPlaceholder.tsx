// File: src/components/howItWorks/DashboardPreviewPlaceholder.tsx
import { Card } from "@/components/ui/card";

export default function DashboardPreviewPlaceholder() {
  return (
    <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-muted/50" />
        <div className="h-8 w-24 rounded-full bg-primary/10" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="h-16 rounded-2xl border border-border/40 bg-background/60" />
        <div className="h-16 rounded-2xl border border-border/40 bg-background/60" />
        <div className="h-16 rounded-2xl border border-border/40 bg-background/60" />
      </div>

      <div className="mt-6 space-y-3">
        <div className="h-10 rounded-2xl border border-border/40 bg-background/60" />
        <div className="h-10 rounded-2xl border border-border/40 bg-background/60" />
        <div className="h-10 rounded-2xl border border-border/40 bg-background/60" />
      </div>
    </Card>
  );
}
