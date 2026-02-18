import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { EntityType } from "@/components/super-admin/entityDetailTypes";
import { mapEntityTypeToSettings } from "@/components/super-admin/entityDetailTypes";

type Props = {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  staffLimitPlaceholder: string;
};

export default function EntityDetailSettingsTab({ entityType, entityId, entityName, staffLimitPlaceholder }: Props) {
  const { toast } = useToast();
  const settingsEntityType = useMemo(() => mapEntityTypeToSettings(entityType), [entityType]);

  const {
    data: settingsRow,
    isLoading: settingsLoading,
    refetch: refetchSettings,
    isFetching: settingsFetching,
  } = useQuery({
    queryKey: ["entity-settings", settingsEntityType, entityId],
    enabled: Boolean(entityId) && Boolean(settingsEntityType),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("entity-settings", {
        body: { action: "get", entityType: settingsEntityType, entityId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load settings");
      return data.settings as any;
    },
  });

  const [settingsJson, setSettingsJson] = useState<string>("{}\n");
  const [settingsTouched, setSettingsTouched] = useState(false);

  useEffect(() => {
    if (!settingsTouched) {
      const payload = settingsRow?.payload ?? {};
      setSettingsJson(`${JSON.stringify(payload, null, 2)}\n`);
    }
  }, [settingsRow, settingsTouched]);

  const handleSaveSettings = async () => {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(settingsJson || "{}") as Record<string, unknown>;
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: e?.message || "Please fix the JSON and try again.",
      });
      return;
    }

    const { data, error } = await supabase.functions.invoke("entity-settings", {
      body: { action: "save", entityType: settingsEntityType, entityId, payload },
    });

    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      return;
    }
    if (!data?.ok) {
      toast({ variant: "destructive", title: "Save failed", description: data?.error || "Unknown error" });
      return;
    }

    toast({ title: "Saved", description: "Settings updated successfully." });
    setSettingsTouched(false);
    void refetchSettings();
  };

  const setJsonField = (key: string, value: unknown) => {
    let obj: any;
    try {
      obj = JSON.parse(settingsJson || "{}") as any;
    } catch {
      obj = {};
    }
    obj[key] = value;
    setSettingsJson(`${JSON.stringify(obj, null, 2)}\n`);
    setSettingsTouched(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Entity Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Stored in <span className="font-mono">entity_settings</span> as JSON.
        </div>

        {settingsLoading ? <Skeleton className="h-40 w-full" /> : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm">
              <span className="text-muted-foreground">Entity Type:</span>{" "}
              <span className="font-mono">{settingsEntityType}</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettingsTouched(false);
                  void refetchSettings();
                }}
                disabled={settingsFetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${settingsFetching ? "animate-spin" : ""}`} />
                Reload
              </Button>
              <Button type="button" size="sm" onClick={handleSaveSettings}>
                Save
              </Button>
            </div>
          </div>

          <Textarea
            value={settingsJson}
            onChange={(e) => {
              setSettingsJson(e.target.value);
              setSettingsTouched(true);
            }}
            className="font-mono min-h-[280px]"
            placeholder={`{\n  "timezone": "Asia/Tashkent",\n  "brand": {\n    "primary_color": "#0ea5e9"\n  }\n}\n`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Display name override</p>
                <Input
                  value={String((settingsRow?.payload?.display_name as any) ?? "")}
                  onChange={(e) => setJsonField("display_name", e.target.value)}
                  placeholder={entityName}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Staff limit override</p>
                <Input
                  type="number"
                  value={
                    settingsRow?.payload?.staff_limit === undefined || settingsRow?.payload?.staff_limit === null
                      ? ""
                      : String(settingsRow.payload.staff_limit)
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setJsonField("staff_limit", v === "" ? null : Number(v));
                  }}
                  placeholder={staffLimitPlaceholder}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <span className="font-medium text-foreground">Tip:</span> Use this payload for feature flags,
                branding, operational limits, and per-entity overrides.
              </p>
              <p>Super admins can read/write these settings across all entities (RLS already allows it).</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
