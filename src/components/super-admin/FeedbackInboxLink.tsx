import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
  label?: string;
};

/**
 * Button that links to /super-admin/feedback
 * If the current route has :lang param, it will link to /:lang/super-admin/feedback
 */
export default function FeedbackInboxLink({
  className,
  variant = "outline",
  label = "Feedback Inbox",
}: Props) {
  const { lang } = useParams();

  const href = lang ? `/${lang}/super-admin/feedback` : "/super-admin/feedback";

  return (
    <Button asChild variant={variant} className={className}>
      <Link to={href}>{label}</Link>
    </Button>
  );
}
