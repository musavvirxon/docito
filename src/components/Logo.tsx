import { useTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  width?: number;
  height?: number;
  className?: string;
}

export const Logo = ({ 
  variant = 'full', 
  width, 
  height, 
  className = '' 
}: LogoProps) => {
  const { appliedTheme } = useTheme();
  
  const getLogoPath = () => {
    return `/logos/logo-${variant}-${appliedTheme}.png`;
  };
  
  const getDefaultDimensions = () => {
    switch (variant) {
      case 'full':
        return { width: 180, height: 50 };
      case 'icon':
        return { width: 48, height: 48 };
      case 'text':
        return { width: 140, height: 40 };
      default:
        return { width: 180, height: 50 };
    }
  };
  
  const dimensions = {
    width: width || getDefaultDimensions().width,
    height: height || getDefaultDimensions().height
  };
  
  return (
    <img
      src={getLogoPath()}
      alt="Docito"
      width={dimensions.width}
      height={dimensions.height}
      className={`transition-opacity duration-300 ${className}`}
    />
  );
};
