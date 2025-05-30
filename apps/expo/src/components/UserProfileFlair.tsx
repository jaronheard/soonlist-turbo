import type { ReactNode } from "react";
import React from "react";
import { Text, View } from "react-native";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

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
  xs: "text-xs top-0 -right-2 min-w-[1.25rem]",
  sm: "text-sm top-0 -right-2 min-w-[1.5rem]",
  md: "text-base top-0 -right-2 min-w-[1.75rem]",
  lg: "text-lg top-0 -right-2 min-w-[2rem]",
  xl: "text-xl top-0 -right-2 min-w-[2.25rem]",
  "2xl": "text-2xl top-0 -right-2 min-w-[2.5rem]",
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
  const userData = useQuery(
    api.users.getByUsername,
    !!username && username.trim() !== "" ? { userName: username } : "skip",
  );
  const userEmoji = userData?.emoji || null;

  if (!userEmoji) return null;

  return (
    <View
      className={cn(
        "absolute z-10 overflow-visible",
        sizeClasses[size],
        flairClassName,
      )}
    >
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
