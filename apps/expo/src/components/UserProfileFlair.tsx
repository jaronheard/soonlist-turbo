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

const flairContainerClasses: Record<Size, string> = {
  xs: "top-0 -right-1.5 min-w-[0.9375rem]",
  sm: "top-0 -right-2 min-w-[1.5rem]",
  md: "top-0 -right-2 min-w-[1.75rem]",
  lg: "top-0 -right-2 min-w-[2rem]",
  xl: "top-0 -right-2 min-w-[2.25rem]",
  "2xl": "top-0 -right-2 min-w-[2.5rem]",
};

/** `xs` is list / attribution avatars; compact flair vs `text-sm`+ sizes. */
const flairEmojiTextClasses: Record<Size, string> = {
  xs: "text-[0.5625rem] leading-none",
  sm: "text-sm leading-none",
  md: "text-base leading-none",
  lg: "text-lg leading-none",
  xl: "text-xl leading-none",
  "2xl": "text-2xl leading-none",
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
        flairContainerClasses[size],
        flairClassName,
      )}
    >
      <Text
        className={cn(
          "flex items-center justify-center text-interactive-1",
          flairEmojiTextClasses[size],
        )}
      >
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
