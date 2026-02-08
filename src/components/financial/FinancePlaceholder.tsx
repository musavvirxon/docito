// File: src/components/financial/FinancePlaceholder.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancePlaceholderProps {
  title: string;
  description: string;
}

export default function FinancePlaceholder({ title, description }: FinancePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}
