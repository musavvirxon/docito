import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export const MoneyBackGuarantee = () => {
  return (
    <Card className="max-w-3xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">
                30-Day Money-Back Guarantee
              </h3>
              <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">
                Risk-Free
              </Badge>
            </div>
            <p className="text-green-800 dark:text-green-200">
              Try any paid plan risk-free for 30 days. If you're not completely satisfied, 
              we'll refund your payment in full—no questions asked, no hidden fees.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
