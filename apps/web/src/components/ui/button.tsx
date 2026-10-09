import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@playverzus/ui';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-border',
        ghost: 'hover:bg-secondary hover:text-foreground text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        copper: 'bg-gradient-to-r from-accent-600 to-primary text-white shadow-md hover:from-primary hover:to-accent-400',
      },
      size: {
        default: 'h-10 px-4 py-2 text-xs uppercase tracking-wider',
        sm: 'h-8 rounded-lg px-3 text-[11px] uppercase tracking-wider',
        lg: 'h-12 rounded-xl px-6 text-sm uppercase tracking-wider',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
