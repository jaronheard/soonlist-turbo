import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Instagram, LinkIcon, Mail, MessageSquare, Star } from "lucide-react";

import { Button, buttonVariants } from "@soonlist/ui/button";

import { getPlanStatusFromUser } from "~/lib/planUtils";
import { api } from "~/trpc/server";
import { FollowUserButton } from "./FollowButtons";

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

export async function UserInfo(props: UserInfoProps) {
  const activeUser = await currentUser();
  if (!props.userId && !props.userName) {
    return null;
  }

  let user;
  if (props.userId) {
    user = await api.user.getById({ id: props.userId });
  } else if (props.userName) {
    user = await api.user.getByUsername({ userName: props.userName });
  }

  if (!user) {
    return null;
  }

  const self = activeUser?.username == user.username;

  const following =
    activeUser?.id &&
    (await api.user.getIfFollowing({
      followerId: activeUser.id,
      followingId: user.id,
    }));

  const { activePaid } = getPlanStatusFromUser(user);

  if (props.variant === "description") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-6">
          <Link
            href={`/${user.username}/events`}
            className="relative flex-shrink-0"
          >
            {activePaid && (
              <Star
                className="absolute bottom-[0.125rem] right-0 z-10 size-[1.5rem] rounded-full bg-interactive-2 p-1 text-interactive-1"
                fill="currentColor"
              />
            )}
            <Image
              className="content-box size-20 rounded-full border-8 border-accent-yellow"
              src={user.userImage}
              alt=""
              width={375}
              height={375}
            />
          </Link>
          <div className="flex flex-col overflow-hidden">
            <Link href={`/${user.username}/events`}>
              <p className="font-heading text-4xl font-bold leading-[2.5rem] tracking-tight text-neutral-1 sm:text-5xl sm:leading-[3.5rem]">
                {user.displayName}
              </p>
              <p className="truncate break-all text-xl font-bold leading-normal tracking-wide sm:text-2xl">
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
          {!self && (
            <div>
              <FollowUserButton userId={user.id} following={!!following} />
            </div>
          )}
        </div>
        <div className="text-2xl text-neutral-2">{user.bio || SAMPLE_BIO}</div>
        {self && (
          <Button size={"sm"} asChild>
            <Link href={`/get-started`}>Edit Profile</Link>
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href={`/${user.username}/events`} className="relative">
          {activePaid && (
            <Star
              className="absolute -bottom-[0.125rem] -right-[0.125rem] z-10 size-[0.75rem] rounded-full bg-interactive-2 p-0.5 text-interactive-1"
              fill="currentColor"
            />
          )}
          <Image
            className="inline-block size-9 rounded-full"
            src={user.userImage}
            alt=""
            width={375}
            height={375}
          />
        </Link>
        <Link href={`/${user.username}/events`} className="group">
          <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
            {user.displayName}
          </p>
          <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
            @{user.username}
          </p>
        </Link>
      </div>
      {!self && (
        <div>
          <FollowUserButton userId={user.id} following={!!following} />
        </div>
      )}
    </div>
  );
}
