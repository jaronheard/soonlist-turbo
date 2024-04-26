import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Instagram, LinkIcon, Mail, MessageSquare } from "lucide-react";
import { FollowUserButton } from "./FollowButtons";
import { Button, buttonVariants } from "./ui/button";
import { api } from "@/trpc/server";

const SAMPLE_BIO = `I haven't written a bio yet... you'll have to find me at one of my events!`;

type UserInfoProps = {
  userId?: string;
  userName?: string;
  variant?: "default" | "icon" | "description";
};

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
    user = await api.user.getById.query({ id: props.userId });
  } else if (props.userName) {
    user = await api.user.getByUsername.query({ userName: props.userName });
  }

  if (!user) {
    return null;
  }

  const self = activeUser?.username == user.username;

  const following =
    activeUser?.id &&
    (await api.user.getIfFollowing.query({
      followerId: activeUser.id,
      followingId: user.id,
    }));

  if (props.variant === "icon") {
    return (
      <Link href={`/${user.username}/events`} className="group">
        <Image
          className="size-[2.625rem] rounded-full border-8 border-accent-yellow"
          src={user.userImage}
          alt=""
          width={375}
          height={375}
        />
      </Link>
    );
  }

  if (props.variant === "description") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-6">
          <Link href={`/${user.username}/events`}>
            <Image
              className="content-box size-20 rounded-full border-8 border-accent-yellow"
              src={user.userImage}
              alt=""
              width={375}
              height={375}
            />
          </Link>
          <div className="flex flex-col">
            <Link href={`/${user.username}/events`}>
              <p className="font-heading text-5xl font-bold leading-[3.5rem] tracking-tight text-neutral-1">
                {user.displayName}
              </p>
              <p className="text-2xl font-bold leading-normal tracking-wide">
                @{user.username}
              </p>
            </Link>
          </div>
        </div>
        <div className="flex gap-4">
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
            <Link href={`/get-started`}>Edit Profile</Link>
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href={`/${user.username}/events`}>
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
