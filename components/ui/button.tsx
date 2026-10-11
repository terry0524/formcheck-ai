import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap border text-sm font-black uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-[var(--ink)] bg-[var(--ink)] text-white hover:bg-[var(--accent)] hover:text-[var(--ink)]",
        accent: "border-[var(--accent)] bg-[var(--accent)] text-[var(--ink)] hover:bg-[#d7ff3f]",
        outline: "border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white",
        ghost: "border-transparent bg-transparent text-[var(--ink)] hover:bg-[var(--line)]",
      },
      size: { default: "px-6 py-3", sm: "min-h-10 px-4 py-2 text-xs", lg: "min-h-14 px-8 py-4 text-base" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
