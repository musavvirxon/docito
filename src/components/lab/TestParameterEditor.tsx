import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';


export type ParameterGender = 'any' | 'male' | 'female';

export interface RangeRule {
  gender: ParameterGender;
  age_min_years?: number | null;
  age_max_years?: number | null;
  low?: number | null;
  high?: number | null;
  text?: string | null;
}

export interface ParameterDef {
  id: string;
  name: string;
  unit?: string | null;
  result_type?: 'number' | 'text';
  default_range?: { low?: number | null; high?: number | null; text?: string | null };
  ranges?: RangeRule[];
}

interface TestParameterEditorProps {
  parameters: ParameterDef[];
  onChange: (parameters: ParameterDef[]) => void;
}

function generateId() {
  return `param_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function TestParameterEditor({ parameters, onChange }: TestParameterEditorProps) {
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  const addParameter = () => {
    const newParam: ParameterDef = {
      id: generateId(),
      name: '',
      unit: '',
      result_type: 'number',
      default_range: { low: null, high: null, text: null },
      ranges: [],
    };
    onChange([...parameters, newParam]);
    setExpandedParam(newParam.id);
  };

  const updateParameter = (id: string, updates: Partial<ParameterDef>) => {
    onChange(parameters.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removeParameter = (id: string) => {
    onChange(parameters.filter((p) => p.id !== id));
  };

  const addRangeRule = (paramId: string) => {
    const param = parameters.find((p) => p.id === paramId);
    if (!param) return;

    const newRule: RangeRule = {
      gender: 'any',
      age_min_years: null,
      age_max_years: null,
      low: null,
      high: null,
      text: null,
    };

    updateParameter(paramId, { ranges: [...(param.ranges || []), newRule] });
  };

  const updateRangeRule = (paramId: string, index: number, updates: Partial<RangeRule>) => {
    const param = parameters.find((p) => p.id === paramId);
    if (!param) return;

    const newRanges = [...(param.ranges || [])];
    newRanges[index] = { ...newRanges[index], ...updates };
    updateParameter(paramId, { ranges: newRanges });
  };

  const removeRangeRule = (paramId: string, index: number) => {
    const param = parameters.find((p) => p.id === paramId);
    if (!param) return;

    const newRanges = (param.ranges || []).filter((_, i) => i !== index);
    updateParameter(paramId, { ranges: newRanges });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Test Parameters</Label>
        <Button type="button" variant="outline" size="sm" onClick={addParameter}>
          <Plus className="h-4 w-4 mr-1" />
          Add Parameter
        </Button>
      </div>

      {parameters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No parameters defined yet.</p>
            <p className="text-xs mt-1">Add parameters to enable detailed result entry.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <Accordion
            type="single"
            collapsible
            value={expandedParam || undefined}
            onValueChange={(val) => setExpandedParam(val || null)}
          >
            {parameters.map((param, paramIndex) => (
              <AccordionItem key={param.id} value={param.id} className="border rounded-lg mb-2 px-3">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{param.name || `Parameter ${paramIndex + 1}`}</span>
                    {param.unit && (
                      <Badge variant="secondary" className="text-xs">
                        {param.unit}
                      </Badge>
                    )}
                    {(param.ranges?.length || 0) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {param.ranges?.length} range{(param.ranges?.length || 0) > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Parameter Name *</Label>
                        <Input
                          value={param.name}
                          onChange={(e) => updateParameter(param.id, { name: e.target.value })}
                          placeholder="e.g., Hemoglobin, WBC, RBC"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit</Label>
                        <Input
                          value={param.unit || ''}
                          onChange={(e) => updateParameter(param.id, { unit: e.target.value })}
                          placeholder="e.g., g/dL, cells/mcL"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Result Type</Label>
                        <Select
                          value={param.result_type || 'number'}
                          onValueChange={(val) => updateParameter(param.id, { result_type: val as 'number' | 'text' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Numeric</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Default Range */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Default Normal Range</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Low</Label>
                          <Input
                            type="number"
                            value={param.default_range?.low ?? ''}
                            onChange={(e) =>
                              updateParameter(param.id, {
                                default_range: {
                                  ...param.default_range,
                                  low: e.target.value ? parseFloat(e.target.value) : null,
                                },
                              })
                            }
                            placeholder="Min"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">High</Label>
                          <Input
                            type="number"
                            value={param.default_range?.high ?? ''}
                            onChange={(e) =>
                              updateParameter(param.id, {
                                default_range: {
                                  ...param.default_range,
                                  high: e.target.value ? parseFloat(e.target.value) : null,
                                },
                              })
                            }
                            placeholder="Max"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Or Text Range</Label>
                          <Input
                            value={param.default_range?.text ?? ''}
                            onChange={(e) =>
                              updateParameter(param.id, {
                                default_range: {
                                  ...param.default_range,
                                  text: e.target.value || null,
                                },
                              })
                            }
                            placeholder="e.g., Negative"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Age/Gender Specific Ranges */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Age/Gender Specific Ranges</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => addRangeRule(param.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Range
                        </Button>
                      </div>

                      {(param.ranges || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No specific ranges. Default range will be used.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(param.ranges || []).map((rule, ruleIndex) => (
                            <div key={ruleIndex} className="grid grid-cols-6 gap-2 items-end p-2 bg-muted/50 rounded">
                              <div className="space-y-1">
                                <Label className="text-xs">Gender</Label>
                                <Select
                                  value={rule.gender}
                                  onValueChange={(val) =>
                                    updateRangeRule(param.id, ruleIndex, { gender: val as ParameterGender })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Age Min</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  value={rule.age_min_years ?? ''}
                                  onChange={(e) =>
                                    updateRangeRule(param.id, ruleIndex, {
                                      age_min_years: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Age Max</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  value={rule.age_max_years ?? ''}
                                  onChange={(e) =>
                                    updateRangeRule(param.id, ruleIndex, {
                                      age_max_years: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                  }
                                  placeholder="120"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Low</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  value={rule.low ?? ''}
                                  onChange={(e) =>
                                    updateRangeRule(param.id, ruleIndex, {
                                      low: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">High</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs"
                                  value={rule.high ?? ''}
                                  onChange={(e) =>
                                    updateRangeRule(param.id, ruleIndex, {
                                      high: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeRangeRule(param.id, ruleIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Remove Parameter */}
                    <div className="flex justify-end pt-2 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeParameter(param.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Parameter
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      )}
    </div>
  );
}
