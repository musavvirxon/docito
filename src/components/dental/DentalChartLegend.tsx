import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { TOOTH_STATUS_CONFIG, ToothStatus } from "./types";

export const DentalChartLegend = () => {
  const statuses = Object.entries(TOOTH_STATUS_CONFIG) as [ToothStatus, typeof TOOTH_STATUS_CONFIG[ToothStatus]][];

  return (
    <motion.div 
      className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {statuses.map(([status, config], index) => (
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * index }}
        >
          <Badge 
            variant="outline" 
            className={`text-xs ${config.bgClass} capitalize`}
          >
            {config.label}
          </Badge>
        </motion.div>
      ))}
    </motion.div>
  );
};
