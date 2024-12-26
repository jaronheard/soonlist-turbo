import type { ReactNode } from "react";
import React from "react";
import { Text, View } from "react-native";

import { api } from "~/utils/api";
import { cn } from "~/utils/cn";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface UserProfileFlairProps {
  username: string;
  children: ReactNode;
  className?: string;
  flairClassName?: string;
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  xs: "text-xs top-0 -right-2",
  sm: "text-sm top-0 -right-2",
  md: "text-base top-0 -right-2",
  lg: "text-lg top-0 -right-2",
  xl: "text-xl top-0 -right-2",
  "2xl": "text-2xl top-0 -right-2",
};

function UserEmoji({
  username,
  flairClassName,
  size = "md",
}: {
  username: string;
  flairClassName: string;
  size: Size;
}) {
  const { data: userData } = api.user.getByUsername.useQuery({
    userName: username,
  });
  const userEmoji = userData?.emoji || null;

  if (!userEmoji) return null;

  return (
    <View className={cn("absolute z-10", sizeClasses[size], flairClassName)}>
      <Text className="flex items-center justify-center text-interactive-1">
        {userEmoji}
      </Text>
    </View>
  );
}

export function UserProfileFlair({
  username,
  children,
  className = "",
  flairClassName = "",
  size = "md",
}: UserProfileFlairProps) {
  return (
    <View className={cn("relative", className)}>
      {children}
      <UserEmoji
        username={username}
        flairClassName={flairClassName}
        size={size}
      />
    </View>
  );
}
