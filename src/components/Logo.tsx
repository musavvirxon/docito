import { useTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  variant?: 'horizontal' | 'vertical' | 'wordmark' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export const Logo = ({ 
  variant = 'horizontal', 
  size = 'md',
  width, 
  height, 
  className = '',
  onClick
}: LogoProps) => {
  const { appliedTheme } = useTheme();
  
  const getLogoPath = () => {
    // Use icon variant for small sizes
    if (variant === 'icon') {
      return `/logos/social/docito-social-square.png`;
    }
    
    // For horizontal, vertical, and wordmark
    const sizeMap: Record<string, string> = {
      'sm': 'sm',
      'md': 'md',
      'lg': 'lg',
      'xl': 'xl'
    };
    
    const mappedSize = sizeMap[size] || 'md';
    
    // Use available logo files
    if (variant === 'horizontal') {
      return `/logos/horizontal/docito-horizontal-xl.png`;
    }
    
    if (variant === 'vertical') {
      return size === 'sm' || size === 'md' 
        ? `/logos/vertical/docito-vertical-md.png`
        : `/logos/vertical/docito-vertical-lg.png`;
    }
    
    if (variant === 'wordmark') {
      return `/logos/wordmark/docito-wordmark-${mappedSize}.png`;
    }
    
    return `/logos/horizontal/docito-horizontal-xl.png`;
  };
  
  const getDefaultDimensions = () => {
    if (variant === 'icon') {
      const sizes = { sm: 32, md: 48, lg: 64, xl: 128 };
      const dim = sizes[size] || 48;
      return { width: dim, height: dim };
    }
    
    if (variant === 'horizontal') {
      const sizes = {
        sm: { width: 150, height: 45 },
        md: { width: 200, height: 60 },
        lg: { width: 300, height: 90 },
        xl: { width: 400, height: 120 }
      };
      return sizes[size] || sizes.md;
    }
    
    if (variant === 'vertical') {
      const sizes = {
        sm: { width: 100, height: 125 },
        md: { width: 120, height: 150 },
        lg: { width: 150, height: 190 },
        xl: { width: 180, height: 225 }
      };
      return sizes[size] || sizes.md;
    }
    
    if (variant === 'wordmark') {
      const sizes = {
        sm: { width: 100, height: 30 },
        md: { width: 150, height: 40 },
        lg: { width: 250, height: 65 },
        xl: { width: 350, height: 90 }
      };
      return sizes[size] || sizes.md;
    }
    
    return { width: 200, height: 60 };
  };
  
  const dimensions = {
    width: width || getDefaultDimensions().width,
    height: height || getDefaultDimensions().height
  };
  
  return (
    <img
      src={getLogoPath()}
      alt="Docito® - Healthcare Management Platform"
      width={dimensions.width}
      height={dimensions.height}
      className={`transition-opacity duration-300 ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
    />
  );
};
