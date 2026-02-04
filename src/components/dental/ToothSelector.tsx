import { cn } from "@/lib/utils";

const FDI_TEETH = [
  "18","17","16","15","14","13","12","11",
  "21","22","23","24","25","26","27","28",
  "48","47","46","45","44","43","42","41",
  "31","32","33","34","35","36","37","38"
];

interface ToothSelectorProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
}

export const ToothSelector = ({ selectedTeeth, onChange }: ToothSelectorProps) => {
  const toggleTooth = (tooth: string) => {
    if (selectedTeeth.includes(tooth)) {
      onChange(selectedTeeth.filter(t => t !== tooth));
    } else {
      onChange([...selectedTeeth, tooth]);
    }
  };

  return (
    <div className="grid grid-cols-8 gap-2">
      {FDI_TEETH.map(tooth => (
        <button
          key={tooth}
          type="button"
          onClick={() => toggleTooth(tooth)}
          className={cn(
            "border rounded-md py-2 text-sm font-medium",
            selectedTeeth.includes(tooth)
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          )}
        >
          {tooth}
        </button>
      ))}
    </div>
  );
};
