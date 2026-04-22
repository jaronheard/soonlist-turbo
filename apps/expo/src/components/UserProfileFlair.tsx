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
  /* xs–lg: rim placement so emoji isn’t sheared at the circle edge */
  xs: "-top-1 -right-2.5 min-w-[1rem]",
  sm: "-top-1 -right-2.5 min-w-[1.5rem]",
  md: "-top-1 -right-2.5 min-w-[1.75rem]",
  lg: "-top-1 -right-2.5 min-w-[2rem]",
  xl: "top-0 -right-2 min-w-[2.25rem]",
  "2xl": "top-0 -right-2 min-w-[2.5rem]",
};

const flairEmojiTextClasses: Record<Size, string> = {
  xs: "text-[0.625rem] leading-[1.25]",
  /* leading-none clips emoji; py-px gives color-glyph breathing room */
  sm: "text-sm leading-[1.25] py-px",
  md: "text-base leading-[1.25] py-px",
  lg: "text-lg leading-[1.25] py-px",
  xl: "text-xl leading-[1.2] py-px",
  "2xl": "text-2xl leading-[1.2] py-px",
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
          "text-center text-interactive-1",
          flairEmojiTextClasses[size],
        )}
        maxFontSizeMultiplier={
          size === "xs" || size === "sm" || size === "lg" ? 1.25 : undefined
        }
        style={{ includeFontPadding: false }}
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
    <View className={cn("relative overflow-visible", className)}>
      {children}
      <UserEmoji
        username={username}
        flairClassName={flairClassName}
        size={size}
      />
    </View>
  );
}
