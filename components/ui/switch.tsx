"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border border-[var(--ink)] bg-white transition-colors data-[state=checked]:bg-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 bg-[var(--ink)] transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-[var(--accent)]" />
    </SwitchPrimitive.Root>
  );
}
