"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Instagram, LinkIcon, Mail, MessageSquare } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button, buttonVariants } from "@soonlist/ui/button";

import { UserProfileFlair } from "./UserProfileFlair";

const SAMPLE_BIO = `I haven't written a bio yet... you'll have to find me at one of my events!`;

interface UserInfoProps {
  userId?: string;
  userName?: string;
  variant?: "default" | "description";
}

function formatUserWebsiteForLink(website: string) {
  if (website.startsWith("http")) {
    return website;
  }
  return `https://${website}`;
}

export function UserInfo(props: UserInfoProps) {
  const currentUser = useQuery(api.users.getCurrentUser);

  const userById = useQuery(
    api.users.getById,
    props.userId ? { id: props.userId } : "skip",
  );

  const userByUsername = useQuery(
    api.users.getByUsername,
    props.userName ? { userName: props.userName } : "skip",
  );

  const user = userById || userByUsername;

  if (!user) {
    return null;
  }

  const self = currentUser?.username === user.username;

  if (props.variant === "description") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <Link
            href={`/${user.username}/upcoming`}
            className="relative flex-shrink-0"
          >
            <UserProfileFlair username={user.username} size="2xl">
              <Image
                className="content-box size-20 rounded-full border-8 border-accent-yellow object-cover object-center"
                src={user.userImage}
                alt={`${user.displayName}'s profile picture`}
                width={80}
                height={80}
              />
            </UserProfileFlair>
          </Link>
          <div className="flex flex-col overflow-hidden">
            <Link href={`/${user.username}/upcoming`}>
              <p className=" text-2xl font-bold text-neutral-1">
                {user.displayName}
              </p>
              <p className="truncate break-all text-xl text-neutral-1">
                @{user.username}
              </p>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user.publicInsta && (
            <a
              href={`https://instagram.com/${user.publicInsta}`}
              className={buttonVariants({ size: "icon", variant: "secondary" })}
            >
              <Instagram className="size-6" />
            </a>
          )}
          {user.publicPhone && (
            <a
              href={`sms:${user.publicPhone}`}
              className={buttonVariants({ size: "icon", variant: "secondary" })}
            >
              <MessageSquare className="size-6" />
            </a>
          )}
          {user.publicEmail && (
            <a
              href={`mailto:${user.publicEmail}`}
              className={buttonVariants({ size: "icon", variant: "secondary" })}
            >
              <Mail className="size-6" />
            </a>
          )}
          {user.publicWebsite && (
            <a
              href={formatUserWebsiteForLink(user.publicWebsite)}
              className={buttonVariants({ size: "icon", variant: "secondary" })}
            >
              <LinkIcon className="size-6" />
            </a>
          )}
        </div>
        <div className="text-2xl text-neutral-2">{user.bio || SAMPLE_BIO}</div>
        {self && (
          <Button size={"sm"} asChild>
            <Link href={`/get-started`}>Edit profile</Link>
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href={`/${user.username}/upcoming`}>
          <UserProfileFlair username={user.username}>
            <Image
              className="inline-block size-9 rounded-full object-cover object-center"
              src={user.userImage}
              alt={`${user.displayName}'s profile picture`}
              width={36}
              height={36}
            />
          </UserProfileFlair>
        </Link>
        <Link href={`/${user.username}/upcoming`} className="group">
          <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
            {user.displayName}
          </p>
          <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
            @{user.username}
          </p>
        </Link>
      </div>
    </div>
  );
}
