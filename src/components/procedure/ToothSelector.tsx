import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ToothSelectorProps {
  selectedTeeth: number[];
  onSelectionChange: (teeth: number[]) => void;
  numberingSystem?: "international_fdi" | "universal" | "palmer";
}

const ToothSelector = ({ 
  selectedTeeth, 
  onSelectionChange, 
  numberingSystem = "international_fdi" 
}: ToothSelectorProps) => {
  const [currentSystem, setCurrentSystem] = useState(numberingSystem);
  const [activeChart, setActiveChart] = useState<"permanent" | "deciduous">("permanent");

  // Permanent teeth definitions
  const permanentTeeth = {
    international_fdi: {
      upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
      upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
      lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
      lowerRight: [41, 42, 43, 44, 45, 46, 47, 48],
    },
    universal: {
      upperRight: [1, 2, 3, 4, 5, 6, 7, 8],
      upperLeft: [9, 10, 11, 12, 13, 14, 15, 16],
      lowerLeft: [17, 18, 19, 20, 21, 22, 23, 24],
      lowerRight: [25, 26, 27, 28, 29, 30, 31, 32],
    },
    palmer: {
      upperRight: [8, 7, 6, 5, 4, 3, 2, 1],
      upperLeft: [1, 2, 3, 4, 5, 6, 7, 8],
      lowerLeft: [1, 2, 3, 4, 5, 6, 7, 8],
      lowerRight: [8, 7, 6, 5, 4, 3, 2, 1],
    }
  };

  // Deciduous teeth definitions
  const deciduousTeeth = {
    international_fdi: {
      upperRight: [55, 54, 53, 52, 51],
      upperLeft: [61, 62, 63, 64, 65],
      lowerLeft: [71, 72, 73, 74, 75],
      lowerRight: [81, 82, 83, 84, 85],
    },
    universal: {
      upperRight: [1, 2, 3, 4, 5],
      upperLeft: [6, 7, 8, 9, 10],
      lowerLeft: [11, 12, 13, 14, 15],
      lowerRight: [16, 17, 18, 19, 20],
    },
    palmer: {
      upperRight: [5, 4, 3, 2, 1],
      upperLeft: [1, 2, 3, 4, 5],
      lowerLeft: [1, 2, 3, 4, 5],
      lowerRight: [5, 4, 3, 2, 1],
    }
  };

  const currentTeethData = activeChart === "permanent" 
    ? permanentTeeth[currentSystem as keyof typeof permanentTeeth] 
    : deciduousTeeth[currentSystem as keyof typeof deciduousTeeth];

  const handleToothClick = (toothNumber: number) => {
    const isSelected = selectedTeeth.includes(toothNumber);
    let newSelection: number[];
    
    if (isSelected) {
      newSelection = selectedTeeth.filter(t => t !== toothNumber);
    } else {
      newSelection = [...selectedTeeth, toothNumber];
    }
    
    onSelectionChange(newSelection);
  };

  const handleQuadrantSelect = (quadrant: "upperRight" | "upperLeft" | "lowerLeft" | "lowerRight") => {
    const quadrantTeeth = currentTeethData[quadrant];
    const allSelected = quadrantTeeth.every(tooth => selectedTeeth.includes(tooth));
    
    let newSelection: number[];
    if (allSelected) {
      // Deselect all teeth in this quadrant
      newSelection = selectedTeeth.filter(tooth => !quadrantTeeth.includes(tooth));
    } else {
      // Select all teeth in this quadrant (add missing ones)
      const missingTeeth = quadrantTeeth.filter(tooth => !selectedTeeth.includes(tooth));
      newSelection = [...selectedTeeth, ...missingTeeth];
    }
    
    onSelectionChange(newSelection);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const renderTooth = (toothNumber: number, position: "top" | "bottom" = "top") => {
    const isSelected = selectedTeeth.includes(toothNumber);
    
    // Display function for Palmer notation
    const getDisplayValue = (tooth: number) => {
      if (currentSystem === "palmer") {
        // For Palmer, show the tooth number with quadrant indicators
        const isPermanent = activeChart === "permanent";
        if (isPermanent) {
          if (currentTeethData.upperRight.includes(tooth)) return `${tooth}⁺ʳ`;
          if (currentTeethData.upperLeft.includes(tooth)) return `${tooth}⁺ˡ`;
          if (currentTeethData.lowerLeft.includes(tooth)) return `${tooth}⁻ˡ`;
          if (currentTeethData.lowerRight.includes(tooth)) return `${tooth}⁻ʳ`;
        } else {
          if (currentTeethData.upperRight.includes(tooth)) return `${tooth}⁺ʳ`;
          if (currentTeethData.upperLeft.includes(tooth)) return `${tooth}⁺ˡ`;
          if (currentTeethData.lowerLeft.includes(tooth)) return `${tooth}⁻ˡ`;
          if (currentTeethData.lowerRight.includes(tooth)) return `${tooth}⁻ʳ`;
        }
      }
      return tooth.toString();
    };
    
    return (
      <Button
        key={toothNumber}
        variant={isSelected ? "default" : "outline"}
        size="sm"
        onClick={() => handleToothClick(toothNumber)}
        className={`
          w-10 h-8 p-0 text-xs font-mono transition-all
          ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
          ${position === "bottom" ? "rotate-180" : ""}
        `}
      >
        {getDisplayValue(toothNumber)}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tooth Selection</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={currentSystem} onValueChange={(value: any) => setCurrentSystem(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="international_fdi">FDI (International)</SelectItem>
                <SelectItem value="universal">Universal</SelectItem>
                <SelectItem value="palmer">Palmer</SelectItem>
              </SelectContent>
            </Select>
            {selectedTeeth.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear All
              </Button>
            )}
          </div>
        </div>
        {selectedTeeth.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-sm text-muted-foreground">Selected:</span>
            {selectedTeeth.sort((a, b) => a - b).map(tooth => (
              <Badge key={tooth} variant="secondary" className="text-xs">
                {tooth}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeChart} onValueChange={(value: any) => setActiveChart(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permanent">Permanent Teeth</TabsTrigger>
            <TabsTrigger value="deciduous">Deciduous Teeth</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeChart} className="mt-4">
            <div className="space-y-4">
              {/* Upper Jaw */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuadrantSelect("upperRight")}
                    className="text-xs text-muted-foreground"
                  >
                    Upper Right
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuadrantSelect("upperLeft")}
                    className="text-xs text-muted-foreground"
                  >
                    Upper Left
                  </Button>
                </div>
                <div className="flex justify-center">
                  <div className="flex gap-1">
                    {/* Upper Right */}
                    <div className="flex gap-1">
                      {currentTeethData.upperRight.map(tooth => renderTooth(tooth))}
                    </div>
                    {/* Center line */}
                    <div className="w-4 flex items-center justify-center">
                      <div className="w-px h-6 bg-border"></div>
                    </div>
                    {/* Upper Left */}
                    <div className="flex gap-1">
                      {currentTeethData.upperLeft.map(tooth => renderTooth(tooth))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Horizontal separator */}
              <div className="flex justify-center">
                <div className="w-full max-w-sm h-px bg-border"></div>
              </div>

              {/* Lower Jaw */}
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex gap-1">
                    {/* Lower Right */}
                    <div className="flex gap-1">
                      {currentTeethData.lowerRight.map(tooth => renderTooth(tooth, "bottom"))}
                    </div>
                    {/* Center line */}
                    <div className="w-4 flex items-center justify-center">
                      <div className="w-px h-6 bg-border"></div>
                    </div>
                    {/* Lower Left */}
                    <div className="flex gap-1">
                      {currentTeethData.lowerLeft.map(tooth => renderTooth(tooth, "bottom"))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuadrantSelect("lowerRight")}
                    className="text-xs text-muted-foreground"
                  >
                    Lower Right
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuadrantSelect("lowerLeft")}
                    className="text-xs text-muted-foreground"
                  >
                    Lower Left
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ToothSelector;