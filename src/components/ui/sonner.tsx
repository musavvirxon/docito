import { useTheme } from '@/contexts/ThemeContext';
import { Toaster as Sonner, toast } from 'sonner';
import { X } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { appliedTheme } = useTheme();

  return (
    <Sonner
      theme={appliedTheme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      closeButton
      icons={{
        close: <X className="h-4 w-4" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast relative w-full rounded-2xl border border-border bg-background px-4 py-3 pr-10 shadow-lg',
          title: 'text-sm font-semibold text-foreground',
          description: 'text-sm text-muted-foreground',
          actionButton:
            'inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground',
          cancelButton:
            'inline-flex items-center justify-center rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground',
          closeButton:
            'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
