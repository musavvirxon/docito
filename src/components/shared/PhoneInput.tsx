import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePhone, formatPhone, normalizePhone } from "@/lib/phone/phone";

export function PhoneInput({
  label = "Phone *",
  value,
  onChange,
  required = true,
  placeholder = "+1 415 555 2671",
  id = "phone",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const [touched, setTouched] = useState(false);

  const validation = useMemo(() => validatePhone(value), [value]);

  // auto-format as user types (non-destructive)
  useEffect(() => {
    if (!value) return;
    // If user already entered +998..., we keep it but format spacing for display.
    // We store normalized to keep DB clean.
    const normalized = normalizePhone(value);
    if (normalized && normalized !== value) {
      // avoid fighting typing: only normalize when it becomes long enough
      if (normalized.replace(/\D/g, "").length >= 9) {
        onChange(normalized);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showError = (required && touched && !validation.ok) || (touched && !!validation.reason && !validation.ok);

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={formatPhone(value)}
        onChange={(e) => {
          const raw = e.target.value;
          // store normalized (clean digits) not formatted text
          onChange(normalizePhone(raw));
        }}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        aria-invalid={showError ? "true" : "false"}
      />
      {showError ? (
        <p className="text-xs text-destructive">{validation.reason}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Enter with country code. US example: +1 415 555 2671 </p>
      )}
    </div>
  );
}
