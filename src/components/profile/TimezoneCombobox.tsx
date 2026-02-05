// Path: src/components/profile/TimezoneCombobox.tsx
import * as React from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const POPULAR_TIMEZONES = [
  "UTC",
  "Asia/Tashkent",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Australia/Sydney",
];

function getAllTimezones(): string[] {
  try {
    const supported = (Intl as any)?.supportedValuesOf?.("timeZone");
    if (Array.isArray(supported) && supported.length > 0) {
      const normalized = supported.filter((v: any) => typeof v === "string" && v.trim().length > 0);
      normalized.sort((a: string, b: string) => a.localeCompare(b));
      return normalized;
    }
  } catch {
    // ignore
  }

  // Fallback: minimal list (still usable)
  return Array.from(new Set(POPULAR_TIMEZONES)).sort((a, b) => a.localeCompare(b));
}

const ALL_TIMEZONES = getAllTimezones();

function uniq(list: string[]) {
  return Array.from(new Set(list.filter(Boolean)));
}

function mergeValueIntoList(list: string[], value?: string) {
  const v = (value || "").trim();
  if (!v) return list;
  if (list.includes(v)) return list;
  return uniq([v, ...list]);
}

export function TimezoneCombobox(props: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const { value, onValueChange, disabled, placeholder = "Select timezone", className, align = "start" } = props;
  const [open, setOpen] = React.useState(false);

  const list = React.useMemo(() => mergeValueIntoList(ALL_TIMEZONES, value), [value]);

  const popular = React.useMemo(() => {
    const merged = mergeValueIntoList(POPULAR_TIMEZONES, value);
    return merged.filter((tz) => list.includes(tz));
  }, [list, value]);

  const rest = React.useMemo(() => {
    const set = new Set(popular);
    return list.filter((tz) => !set.has(tz));
  }, [list, popular]);

  const hasPopular = popular.length > 0;
  const hasRest = rest.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between w-full", className)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0" align={align}>
        <Command>
          <CommandInput placeholder="Search timezones…" />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>

            {hasPopular && (
              <CommandGroup heading="Popular">
                {popular.map((tz) => (
                  <CommandItem
                    key={tz}
                    value={tz}
                    onSelect={() => {
                      onValueChange(tz);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === tz ? "opacity-100" : "opacity-0")} />
                    {tz}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {hasRest && (
              <CommandGroup heading={hasPopular ? "All timezones" : "Timezones"}>
                {rest.map((tz) => (
                  <CommandItem
                    key={tz}
                    value={tz}
                    onSelect={() => {
                      onValueChange(tz);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === tz ? "opacity-100" : "opacity-0")} />
                    {tz}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
