import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cn } from '@/shared/utils/index.js';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
}

export interface BadgeButtonProps
  extends React.ButtonHTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeButtonVariants> {
  asChild?: boolean;
}

export type BadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

const badgeVariants = cva(
  'inline-flex items-center justify-center border border-transparent font-medium focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success:
          'bg-[var(--color-success-accent,var(--color-green-500))] text-[var(--color-success-foreground,var(--color-white))]',
        warning:
          'bg-[var(--color-warning-accent,var(--color-yellow-500))] text-[var(--color-warning-foreground,var(--color-white))]',
        info: 'bg-[var(--color-info-accent,var(--color-violet-500))] text-[var(--color-info-foreground,var(--color-white))]',
        orange:
          'bg-[var(--color-orange-accent,var(--color-orange-500))] text-[var(--color-orange-foreground,var(--color-white))]',
        gray: 'bg-[var(--color-gray-accent,var(--color-gray-500))] text-[var(--color-gray-foreground,var(--color-white))]',
        purple:
          'bg-[var(--color-purple-accent,var(--color-purple-500))] text-[var(--color-purple-foreground,var(--color-white))]',
        teal: 'bg-[var(--color-teal-accent,var(--color-teal-500))] text-[var(--color-teal-foreground,var(--color-white))]',
        pink: 'bg-[var(--color-pink-accent,var(--color-pink-500))] text-[var(--color-pink-foreground,var(--color-white))]',
        indigo:
          'bg-[var(--color-indigo-accent,var(--color-indigo-500))] text-[var(--color-indigo-foreground,var(--color-white))]',
        outline: 'bg-transparent border border-border text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      appearance: {
        default: '',
        light: '',
        outline: '',
        ghost: 'border-transparent bg-transparent',
      },
      disabled: {
        true: 'opacity-50 pointer-events-none',
      },
      size: {
        lg: 'rounded-md px-[0.5rem] h-7 min-w-7 gap-1.5 text-xs [&_svg]:size-3.5',
        md: 'rounded-md px-[0.45rem] h-6 min-w-6 gap-1.5 text-xs [&_svg]:size-3.5 ',
        sm: 'rounded-sm px-[0.325rem] h-5 min-w-5 gap-1 text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3',
        xs: 'rounded-sm px-[0.25rem] h-4 min-w-4 gap-1 text-[0.625rem] leading-[0.5rem] [&_svg]:size-3',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
    },
    compoundVariants: [
      /* Light */
      {
        variant: 'primary',
        appearance: 'light',
        className:
          'text-[var(--color-primary-accent,var(--color-blue-700))] bg-[var(--color-primary-soft,var(--color-blue-50))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]',
      },
      {
        variant: 'secondary',
        appearance: 'light',
        className: 'bg-secondary dark:bg-secondary/50 text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'light',
        className:
          'text-[var(--color-success-accent,var(--color-green-800))] bg-[var(--color-success-soft,var(--color-green-100))] dark:bg-[var(--color-success-soft,var(--color-green-950))] dark:text-[var(--color-success-soft,var(--color-green-600))]',
      },
      {
        variant: 'warning',
        appearance: 'light',
        className:
          'text-[var(--color-warning-accent,var(--color-yellow-700))] bg-[var(--color-warning-soft,var(--color-yellow-100))] dark:bg-[var(--color-warning-soft,var(--color-yellow-950))] dark:text-[var(--color-warning-soft,var(--color-yellow-600))]',
      },
      {
        variant: 'info',
        appearance: 'light',
        className:
          'text-[var(--color-info-accent,var(--color-violet-700))] bg-[var(--color-info-soft,var(--color-violet-100))] dark:bg-[var(--color-info-soft,var(--color-violet-950))] dark:text-[var(--color-info-soft,var(--color-violet-400))]',
      },
      {
        variant: 'orange',
        appearance: 'light',
        className:
          'text-[var(--color-orange-accent,var(--color-orange-700))] bg-[var(--color-orange-soft,var(--color-orange-100))] dark:bg-[var(--color-orange-soft,var(--color-orange-950))] dark:text-[var(--color-orange-soft,var(--color-orange-400))]',
      },
      {
        variant: 'gray',
        appearance: 'light',
        className:
          'text-[var(--color-gray-accent,var(--color-gray-700))] bg-[var(--color-gray-soft,var(--color-gray-100))] dark:bg-[var(--color-gray-soft,var(--color-gray-950))] dark:text-[var(--color-gray-soft,var(--color-gray-400))]',
      },
      {
        variant: 'purple',
        appearance: 'light',
        className:
          'text-[var(--color-purple-accent,var(--color-purple-700))] bg-[var(--color-purple-soft,var(--color-purple-100))] dark:bg-[var(--color-purple-soft,var(--color-purple-950))] dark:text-[var(--color-purple-soft,var(--color-purple-400))]',
      },
      {
        variant: 'teal',
        appearance: 'light',
        className:
          'text-[var(--color-teal-accent,var(--color-teal-700))] bg-[var(--color-teal-soft,var(--color-teal-100))] dark:bg-[var(--color-teal-soft,var(--color-teal-950))] dark:text-[var(--color-teal-soft,var(--color-teal-400))]',
      },
      {
        variant: 'pink',
        appearance: 'light',
        className:
          'text-[var(--color-pink-accent,var(--color-pink-700))] bg-[var(--color-pink-soft,var(--color-pink-100))] dark:bg-[var(--color-pink-soft,var(--color-pink-950))] dark:text-[var(--color-pink-soft,var(--color-pink-400))]',
      },
      {
        variant: 'indigo',
        appearance: 'light',
        className:
          'text-[var(--color-indigo-accent,var(--color-indigo-700))] bg-[var(--color-indigo-soft,var(--color-indigo-100))] dark:bg-[var(--color-indigo-soft,var(--color-indigo-950))] dark:text-[var(--color-indigo-soft,var(--color-indigo-400))]',
      },
      {
        variant: 'destructive',
        appearance: 'light',
        className:
          'text-[var(--color-destructive-accent,var(--color-red-700))] bg-[var(--color-destructive-soft,var(--color-red-50))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]',
      },
      /* Outline */
      {
        variant: 'primary',
        appearance: 'outline',
        className:
          'text-[var(--color-primary-accent,  var(--color-blue-700))] border-[var(--color-primary-soft,var(--color-blue-100))] bg-[var(--color-primary-soft,var(--color-blue-50))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:border-[var(--color-primary-soft,var(--color-blue-900))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]',
      },
      {
        variant: 'success',
        appearance: 'outline',
        className:
          'text-[var(--color-success-accent,var(--color-green-700))] border-[var(--color-success-soft,var(--color-green-200))] bg-[var(--color-success-soft,var(--color-green-50))] dark:bg-[var(--color-success-soft,var(--color-green-950))] dark:border-[var(--color-success-soft,var(--color-green-900))] dark:text-[var(--color-success-soft,var(--color-green-600))]',
      },
      {
        variant: 'warning',
        appearance: 'outline',
        className:
          'text-[var(--color-warning-accent,var(--color-yellow-700))] border-[var(--color-warning-soft,var(--color-yellow-200))] bg-[var(--color-warning-soft,var(--color-yellow-50))] dark:bg-[var(--color-warning-soft,var(--color-yellow-950))] dark:border-[var(--color-warning-soft,var(--color-yellow-900))] dark:text-[var(--color-warning-soft,var(--color-yellow-600))]',
      },
      {
        variant: 'info',
        appearance: 'outline',
        className:
          'text-[var(--color-info-accent,var(--color-violet-700))] border-[var(--color-info-soft,var(--color-violet-100))] bg-[var(--color-info-soft,var(--color-violet-50))] dark:bg-[var(--color-info-soft,var(--color-violet-950))] dark:border-[var(--color-info-soft,var(--color-violet-900))] dark:text-[var(--color-info-soft,var(--color-violet-400))]',
      },
      {
        variant: 'orange',
        appearance: 'outline',
        className:
          'text-[var(--color-orange-accent,var(--color-orange-700))] border-[var(--color-orange-soft,var(--color-orange-100))] bg-[var(--color-orange-soft,var(--color-orange-50))] dark:bg-[var(--color-orange-soft,var(--color-orange-950))] dark:border-[var(--color-orange-soft,var(--color-orange-900))] dark:text-[var(--color-orange-soft,var(--color-orange-400))]',
      },
      {
        variant: 'gray',
        appearance: 'outline',
        className:
          'text-[var(--color-gray-accent,var(--color-gray-700))] border-[var(--color-gray-soft,var(--color-gray-100))] bg-[var(--color-gray-soft,var(--color-gray-50))] dark:bg-[var(--color-gray-soft,var(--color-gray-950))] dark:border-[var(--color-gray-soft,var(--color-gray-900))] dark:text-[var(--color-gray-soft,var(--color-gray-400))]',
      },
      {
        variant: 'purple',
        appearance: 'outline',
        className:
          'text-[var(--color-purple-accent,var(--color-purple-700))] border-[var(--color-purple-soft,var(--color-purple-100))] bg-[var(--color-purple-soft,var(--color-purple-50))] dark:bg-[var(--color-purple-soft,var(--color-purple-950))] dark:border-[var(--color-purple-soft,var(--color-purple-900))] dark:text-[var(--color-purple-soft,var(--color-purple-400))]',
      },
      {
        variant: 'teal',
        appearance: 'outline',
        className:
          'text-[var(--color-teal-accent,var(--color-teal-700))] border-[var(--color-teal-soft,var(--color-teal-100))] bg-[var(--color-teal-soft,var(--color-teal-50))] dark:bg-[var(--color-teal-soft,var(--color-teal-950))] dark:border-[var(--color-teal-soft,var(--color-teal-900))] dark:text-[var(--color-teal-soft,var(--color-teal-400))]',
      },
      {
        variant: 'pink',
        appearance: 'outline',
        className:
          'text-[var(--color-pink-accent,var(--color-pink-700))] border-[var(--color-pink-soft,var(--color-pink-100))] bg-[var(--color-pink-soft,var(--color-pink-50))] dark:bg-[var(--color-pink-soft,var(--color-pink-950))] dark:border-[var(--color-pink-soft,var(--color-pink-900))] dark:text-[var(--color-pink-soft,var(--color-pink-400))]',
      },
      {
        variant: 'indigo',
        appearance: 'outline',
        className:
          'text-[var(--color-indigo-accent,var(--color-indigo-700))] border-[var(--color-indigo-soft,var(--color-indigo-100))] bg-[var(--color-indigo-soft,var(--color-indigo-50))] dark:bg-[var(--color-indigo-soft,var(--color-indigo-950))] dark:border-[var(--color-indigo-soft,var(--color-indigo-900))] dark:text-[var(--color-indigo-soft,var(--color-indigo-400))]',
      },
      {
        variant: 'destructive',
        appearance: 'outline',
        className:
          'text-[var(--color-destructive-accent,var(--color-red-700))] border-[var(--color-destructive-soft,var(--color-red-100))] bg-[var(--color-destructive-soft,var(--color-red-50))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:border-[var(--color-destructive-soft,var(--color-red-900))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]',
      },
      /* Ghost */
      {
        variant: 'primary',
        appearance: 'ghost',
        className: 'text-primary',
      },
      {
        variant: 'secondary',
        appearance: 'ghost',
        className: 'text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'ghost',
        className: 'text-[var(--color-success-accent,var(--color-green-500))]',
      },
      {
        variant: 'warning',
        appearance: 'ghost',
        className: 'text-[var(--color-warning-accent,var(--color-yellow-500))]',
      },
      {
        variant: 'info',
        appearance: 'ghost',
        className: 'text-[var(--color-info-accent,var(--color-violet-500))]',
      },
      {
        variant: 'orange',
        appearance: 'ghost',
        className: 'text-[var(--color-orange-accent,var(--color-orange-500))]',
      },
      {
        variant: 'gray',
        appearance: 'ghost',
        className: 'text-[var(--color-gray-accent,var(--color-gray-500))]',
      },
      {
        variant: 'purple',
        appearance: 'ghost',
        className: 'text-[var(--color-purple-accent,var(--color-purple-500))]',
      },
      {
        variant: 'teal',
        appearance: 'ghost',
        className: 'text-[var(--color-teal-accent,var(--color-teal-500))]',
      },
      {
        variant: 'pink',
        appearance: 'ghost',
        className: 'text-[var(--color-pink-accent,var(--color-pink-500))]',
      },
      {
        variant: 'indigo',
        appearance: 'ghost',
        className: 'text-[var(--color-indigo-accent,var(--color-indigo-500))]',
      },
      {
        variant: 'destructive',
        appearance: 'ghost',
        className: 'text-destructive',
      },

      { size: 'lg', appearance: 'ghost', className: 'px-0' },
      { size: 'md', appearance: 'ghost', className: 'px-0' },
      { size: 'sm', appearance: 'ghost', className: 'px-0' },
      { size: 'xs', appearance: 'ghost', className: 'px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'default',
      size: 'md',
    },
  },
);

const badgeButtonVariants = cva(
  'cursor-pointer transition-all inline-flex items-center justify-center leading-none size-3.5 [&>svg]:opacity-100! [&>svg]:size-3.5! p-0 rounded-md -me-0.5 opacity-60 hover:opacity-100',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  size,
  appearance = 'outline',
  shape,
  asChild = false,
  disabled,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, appearance, shape, disabled }), className)}
      {...props}
    />
  );
}

function BadgeButton({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof badgeButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span';
  return (
    <Comp
      data-slot="badge-button"
      className={cn(badgeButtonVariants({ variant, className }))}
      role="button"
      {...props}
    />
  );
}

function BadgeDot({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge-dot"
      className={cn('size-1.5 rounded-full bg-[currentColor] opacity-75', className)}
      {...props}
    />
  );
}

export { Badge, BadgeButton, BadgeDot, badgeVariants };
