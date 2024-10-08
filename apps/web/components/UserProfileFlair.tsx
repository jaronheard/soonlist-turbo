"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";

import { api } from "~/trpc/react";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface UserProfileFlairProps {
  username: string;
  children: ReactNode;
  className?: string;
  flairClassName?: string;
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  xs: "text-xs -bottom-2 -right-1",
  sm: "text-sm -bottom-2 -right-1",
  md: "text-base -bottom-2 -right-1",
  lg: "text-lg -bottom-2 -right-1",
  xl: "text-xl -bottom-2 -right-1",
  "2xl": "text-2xl -bottom-2 -right-1",
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
  const userData = api.user.getByUsername.useQuery({ userName: username });
  const userEmoji = userData.data?.emoji || null;

  if (!userEmoji) return null;

  return (
    <div className={`absolute z-10 ${sizeClasses[size]} ${flairClassName}`}>
      <div className="flex items-center justify-center text-interactive-1">
        {userEmoji}
      </div>
    </div>
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
    <div className={`relative ${className}`}>
      {children}
      <Suspense fallback={null}>
        <UserEmoji
          username={username}
          flairClassName={flairClassName}
          size={size}
        />
      </Suspense>
    </div>
  );
}
