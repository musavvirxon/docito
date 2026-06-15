import React from "react";
import { useTranslation, withTranslation, WithTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface Props extends WithTranslation {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

class RouteErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      message: String(error?.message || error || ""),
    };
  }

  componentDidCatch(error: any, info: any) {
    console.error("RouteErrorBoundary caught:", error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback message={this.state.message} onReset={this.reset} />;
  }
}

export const RouteErrorBoundary = withTranslation("common")(RouteErrorBoundaryInner);
export default RouteErrorBoundary;

function ErrorFallback({ message, onReset }: { message: string; onReset: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{t("errorBoundary.title")}</h1>
          <p className="text-sm text-muted-foreground">{message || t("errorBoundary.routeDescription")}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={onReset} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("errorBoundary.tryAgain")}
          </Button>
          <Button onClick={() => (window.location.href = "/")}>
            <Home className="h-4 w-4 mr-2" />
            {t("errorBoundary.goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
