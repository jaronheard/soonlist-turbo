"use client";

import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from ".";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        yellow: "border-transparent bg-accent-yellow text-foreground",
        gray: "border-transparent bg-gray-100 text-gray-600",
      },
      disabled: {
        true: "cursor-auto",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        disabled: false,
        class: "hover:bg-primary/80",
      },
      {
        variant: "secondary",
        disabled: false,
        class: "hover:bg-secondary/80",
      },
      {
        variant: "destructive",
        disabled: false,
        class: "hover:bg-destructive/80",
      },
      {
        variant: "yellow",
        disabled: false,
        class: "hover:bg-accent-yellow/80",
      },
      {
        variant: "gray",
        disabled: false,
        class: "hover:bg-gray-100/80",
      },
    ],
    defaultVariants: {
      variant: "default",
      disabled: false,
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  disabled?: boolean;
}

function Badge({ className, variant, disabled, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, disabled }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
