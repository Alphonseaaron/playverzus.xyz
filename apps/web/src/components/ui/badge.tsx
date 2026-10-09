import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@playverzus/ui';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive/20 text-destructive border-destructive/40 shadow hover:bg-destructive/30',
        outline: 'text-foreground border-border',
        copper: 'border-primary/40 bg-primary/15 text-accent-400 font-bold',
        success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-bold',
        warning: 'border-amber-500/30 bg-amber-500/15 text-amber-400 font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
