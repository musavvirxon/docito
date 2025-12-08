import { motion } from "framer-motion";
import { ToothStatus, ToothType, TOOTH_STATUS_CONFIG } from "./types";

interface ToothSVGProps {
  number: number;
  toothType: ToothType;
  status: ToothStatus;
  isSelected: boolean;
  isEditable: boolean;
  onClick: () => void;
  hasProcedure?: boolean;
}

export const ToothSVG = ({
  number,
  toothType,
  status,
  isSelected,
  isEditable,
  onClick,
  hasProcedure,
}: ToothSVGProps) => {
  const isPrimary = toothType === "primary";
  const isMissing = status === "missing" || status === "extracted";
  const config = TOOTH_STATUS_CONFIG[status];

  // Different sizes for permanent vs primary teeth
  const size = isPrimary ? { width: 32, height: 38 } : { width: 40, height: 48 };

  return (
    <motion.button
      onClick={() => isEditable && !isMissing && onClick()}
      disabled={!isEditable || isMissing}
      className={`
        relative rounded-lg border-2 flex items-center justify-center
        font-mono font-semibold transition-colors
        ${config.bgClass}
        ${isSelected ? "ring-2 ring-primary ring-offset-2 shadow-lg" : ""}
        ${!isEditable ? "cursor-default" : isMissing ? "cursor-not-allowed" : "cursor-pointer"}
        ${isPrimary ? "border-dashed" : "border-solid"}
      `}
      style={{ width: size.width, height: size.height }}
      whileHover={isEditable && !isMissing ? { scale: 1.1, y: -2 } : {}}
      whileTap={isEditable && !isMissing ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: isSelected ? "0 0 12px hsl(var(--primary) / 0.5)" : "none"
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Tooth number */}
      <span className={`text-xs ${isPrimary ? "text-muted-foreground" : "text-foreground"}`}>
        {number}
      </span>

      {/* Procedure indicator */}
      {hasProcedure && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        />
      )}

      {/* Selection pulse animation */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-primary"
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [1, 0, 1]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.button>
  );
};
