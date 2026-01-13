import { Link } from "react-router-dom";
import { MessageSquareWarning, HelpCircle, FileText, Shield } from "lucide-react";

interface DashboardFooterProps {
  className?: string;
}

/**
 * DashboardFooter - Small footer for dashboard pages
 * Includes link to feedback page and essential links
 */
export function DashboardFooter({ className }: DashboardFooterProps) {
  return (
    <footer className={`border-t border-border bg-card/50 ${className || ""}`}>
      <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>© 2025 Docito®</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link
            to="/feedback"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquareWarning className="h-4 w-4" />
            <span>Feedback</span>
          </Link>
          
          <Link
            to="/help-center"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help</span>
          </Link>
          
          <Link
            to="/legal/privacy-policy"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Privacy</span>
          </Link>
          
          <Link
            to="/legal/terms-of-service"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Terms</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default DashboardFooter;
