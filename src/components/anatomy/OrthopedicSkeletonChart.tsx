import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type BodyRegion =
  | "head_neck"
  | "shoulder_left"
  | "shoulder_right"
  | "elbow_left"
  | "elbow_right"
  | "wrist_hand_left"
  | "wrist_hand_right"
  | "spine"
  | "hip_left"
  | "hip_right"
  | "knee_left"
  | "knee_right"
  | "ankle_foot_left"
  | "ankle_foot_right";

const REGION_LABEL: Record<BodyRegion, string> = {
  head_neck: "Head / Neck",
  shoulder_left: "Left Shoulder",
  shoulder_right: "Right Shoulder",
  elbow_left: "Left Elbow",
  elbow_right: "Right Elbow",
  wrist_hand_left: "Left Wrist / Hand",
  wrist_hand_right: "Right Wrist / Hand",
  spine: "Spine",
  hip_left: "Left Hip",
  hip_right: "Right Hip",
  knee_left: "Left Knee",
  knee_right: "Right Knee",
  ankle_foot_left: "Left Ankle / Foot",
  ankle_foot_right: "Right Ankle / Foot",
};

const ALL_REGIONS: BodyRegion[] = [
  "head_neck",
  "shoulder_left",
  "shoulder_right",
  "elbow_left",
  "elbow_right",
  "wrist_hand_left",
  "wrist_hand_right",
  "spine",
  "hip_left",
  "hip_right",
  "knee_left",
  "knee_right",
  "ankle_foot_left",
  "ankle_foot_right",
];

type Props = {
  selected: BodyRegion[];
  onToggle: (region: BodyRegion) => void;
  onClear?: () => void;
  isEditable?: boolean;
};

export default function OrthopedicSkeletonChart({
  selected,
  onToggle,
  onClear,
  isEditable = true,
}: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Orthopedic Body Map</CardTitle>
            <Badge variant="outline" className="text-xs">Skeleton</Badge>
          </div>

          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onClear}
                disabled={!isEditable}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Select affected regions. (This helps attach location context to diagnosis/treatment notes.)
        </p>

        {/* Simple “body map” selection UI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_REGIONS.map((r) => {
            const active = selected.includes(r);
            return (
              <Button
                key={r}
                type="button"
                variant={active ? "default" : "outline"}
                className="justify-start"
                onClick={() => onToggle(r)}
                disabled={!isEditable}
              >
                {REGION_LABEL[r]}
              </Button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="pt-2">
            <div className="text-sm font-medium mb-2">
              Selected ({selected.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {selected.map((r) => (
                <Badge key={r} variant="secondary" className="text-xs">
                  {REGION_LABEL[r]}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
