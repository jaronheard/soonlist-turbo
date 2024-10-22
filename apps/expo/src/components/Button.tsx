// react native button component
import type { VariantProps } from "class-variance-authority";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { cva } from "class-variance-authority";
import { useColorScheme } from "nativewind";

import { cn } from "~/utils/cn";

const buttonVariants = cva("flex-row items-center justify-center rounded-lg", {
  variants: {
    variant: {
      default: "bg-primary",
      destructive: "bg-destructive",
      outline: "border border-input bg-background",
      secondary: "bg-secondary",
      ghost: "bg-transparent",
      link: "bg-transparent",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10 rounded-full",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const textVariants = cva("text-lg font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary underline",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = "default",
  size = "default",
  onPress,
  disabled,
  loading,
  children,
  className,
}: ButtonProps) {
  const { colorScheme } = useColorScheme();

  return (
    <TouchableOpacity
      className={cn(buttonVariants({ variant, size }), className)}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-center">
        {loading ? (
          <ActivityIndicator
            color={
              variant === "outline"
                ? colorScheme === "dark"
                  ? "#fff"
                  : "#000"
                : "#fff"
            }
          />
        ) : (
          <Text className={textVariants({ variant })}>{children}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
