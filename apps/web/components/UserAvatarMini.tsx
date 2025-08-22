"use client";

import Image from "next/image";
import Link from "next/link";

import { UserProfileFlair } from "./UserProfileFlair";

export interface UserAvatarMiniProps {
  username: string;
  displayName?: string;
  userImage: string;
}

export function UserAvatarMini({
  username,
  displayName,
  userImage,
}: UserAvatarMiniProps) {
  const label = displayName || username;

  return (
    <div className="flex items-center gap-0.5">
      <Link
        href={`/${username}/upcoming`}
        className="relative flex items-center"
      >
        <UserProfileFlair username={username} size="xs">
          <Image
            className="inline-block size-3 rounded-full object-cover object-center"
            src={userImage}
            alt={`${username}'s profile picture`}
            width={16}
            height={16}
          />
        </UserProfileFlair>
      </Link>
      <Link href={`/${username}/upcoming`} className="group flex items-center">
        <p className="text-xs text-neutral-2 group-hover:text-neutral-1">
          {label}
        </p>
      </Link>
    </div>
  );
}
