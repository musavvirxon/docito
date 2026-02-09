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
    // For horizontal variant in nav/footer, use theme-aware full logos
    if (variant === 'horizontal') {
      // Use theme-aware logos for better dark/light mode support
      return appliedTheme === 'dark'
        ? '/logos/logo-full-dark.png'
        : '/logos/logo-full-light.png';
    }
    
    // Icon variant - use icon sizes
    if (variant === 'icon') {
      const iconSizes: Record<string, string> = {
        'sm': '64x64',
        'md': '128x128',
        'lg': '256x256',
        'xl': '512x512'
      };
      return `/logos/icon/docito-logo-${iconSizes[size] || '128x128'}.png`;
    }
    
    // Vertical variant
    if (variant === 'vertical') {
      const sizeMap: Record<string, string> = {
        'sm': 'sm',
        'md': 'md',
        'lg': 'lg',
        'xl': 'lg'
      };
      return `/logos/vertical/docito-vertical-${sizeMap[size] || 'md'}.png`;
    }
    
    // Wordmark variant
    if (variant === 'wordmark') {
      const sizeMap: Record<string, string> = {
        'sm': 'sm',
        'md': 'md',
        'lg': 'lg',
        'xl': 'xl'
      };
      return `/logos/wordmark/docito-wordmark-${sizeMap[size] || 'md'}.png`;
    }
    
    return appliedTheme === 'dark'
      ? '/logos/logo-full-dark.png'
      : '/logos/logo-full-light.png';
  };
  
  const getDefaultDimensions = () => {
    if (variant === 'icon') {
      const sizes = { sm: 32, md: 48, lg: 64, xl: 128 };
      const dim = sizes[size] || 48;
      return { width: dim, height: dim };
    }
    
    if (variant === 'horizontal') {
      const sizes = {
        sm: { width: 120, height: 36 },
        md: { width: 160, height: 48 },
        lg: { width: 240, height: 72 },
        xl: { width: 320, height: 96 }
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
    
    return { width: 160, height: 48 };
  };
  
  const dimensions = {
    width: width || getDefaultDimensions().width,
    height: height || getDefaultDimensions().height
  };
  
  // LCP optimization: xl size logos are likely LCP elements
  const isLCP = size === 'xl' || size === 'lg';
  
  return (
    <img
      src={getLogoPath()}
      alt="Docito® - Healthcare Management Platform"
      width={dimensions.width}
      height={dimensions.height}
      className={`transition-opacity duration-300 object-contain ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
      loading={isLCP ? 'eager' : 'lazy'}
      fetchPriority={isLCP ? 'high' : 'auto'}
      decoding={isLCP ? 'sync' : 'async'}
    />
  );
};
