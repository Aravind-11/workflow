import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-[0_0_0_1px_rgb(15_23_42_/_0.9),0_1px_2px_rgb(15_23_42_/_0.3),inset_0_1px_0_rgb(255_255_255_/_0.08)] hover:brightness-125 dark:bg-gradient-to-br dark:from-amber-300 dark:to-amber-500 dark:text-slate-950 dark:shadow-[0_0_0_1px_rgb(251_191_36_/_0.9),0_1px_2px_rgb(0_0_0_/_0.3),inset_0_1px_0_rgb(255_255_255_/_0.45)]",
        secondary:
          "bg-white text-slate-700 shadow-[0_0_0_1px_rgb(15_23_42_/_0.08),0_1px_2px_rgb(15_23_42_/_0.04)] hover:-translate-y-px hover:text-slate-900 hover:shadow-[0_0_0_1px_rgb(15_23_42_/_0.15),0_4px_12px_-4px_rgb(15_23_42_/_0.15)] dark:bg-white/[0.04] dark:text-slate-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:hover:text-gray-100 dark:hover:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.15)]",
        outline:
          "bg-transparent text-slate-700 shadow-[0_0_0_1px_rgb(15_23_42_/_0.1)] hover:bg-slate-100/60 hover:text-slate-900 dark:text-slate-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1)] dark:hover:bg-white/[0.04] dark:hover:text-gray-100",
        ghost:
          "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100",
        destructive:
          "bg-red-600 text-white shadow-[0_0_0_1px_rgb(220_38_38_/_0.9),0_1px_2px_rgb(0_0_0_/_0.2),inset_0_1px_0_rgb(255_255_255_/_0.15)] hover:bg-red-500",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);

Button.displayName = "Button";

export { Button, buttonVariants };
