import React from "react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

import { Button } from "@soonlist/ui/button";

import type { UserStatsCardProps } from "../_components/userStatsCard";
import { env } from "~/env";
import UserStatsCard from "../_components/userStatsCard";
import dataForUsersFor2024 from "./dataForUsersFor2024";

export async function generateMetadata(props: Props) {
  const params = await props.params;
  return {
    title: `@${params.userName} | Captured 2024! | Soonlist`,
    openGraph: {
      title: `@${params.userName} | Captured 2024! | Soonlist`,
      description: `@${params.userName}'s year in captured events!`,
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/2024/${params.userName}`,
      type: "article",
      images: ["/soonlist-2024-captured.png"],
    },
  };
}

interface Props {
  params: Promise<{ userName: string }>;
}

// Add type guard function
function isValidUserData(data: unknown): data is UserStatsCardProps {
  if (!data || typeof data !== "object") return false;

  const userData = data as Record<string, unknown>;
  return (
    typeof userData.username === "string" &&
    typeof userData.total_events_captured === "string" &&
    typeof userData.created_at === "string"
  );
}

// Example usage:
const Page = async (props: Props) => {
  const params = await props.params;
  const user = await currentUser();
  const userName = params.userName;

  // Early return for invalid usernames
  if (!(userName in dataForUsersFor2024)) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-center text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Become a member of Soonlist to join our community and start capturing
          your events!
        </p>
        <p className="text-center text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Scroll down to join now!
        </p>
        <Link href="/join" className="mt-6">
          <Button>Become a Founding Member</Button>
        </Link>
      </div>
    );
  }

  // Get user data and validate it
  const userData = dataForUsersFor2024[userName];
  if (!isValidUserData(userData)) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-center text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Error loading user data
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-center font-heading text-5xl font-bold leading-none tracking-tighterish text-gray-700 md:text-7xl md:leading-none">
        2024 <br />
        <span className="relative inline-block text-6xl text-interactive-1 md:text-8xl">
          <svg
            width="492"
            height="96"
            viewBox="0 0 492 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="tranform absolute inset-0 z-[-1] h-full w-full scale-110 opacity-100"
          >
            <path
              d="M0.977745 90.0631L13.3028 15.2256C13.6677 13.01 15.557 11.3673 17.8018 11.314L487.107 0.163765C490.41 0.0852941 492.749 3.36593 491.598 6.46257L474.712 51.884C474.083 53.5754 472.537 54.7535 470.739 54.9104L5.99405 95.4768C2.9558 95.742 0.482147 93.0724 0.977745 90.0631Z"
              fill="#FEEA9F"
            />
          </svg>
          captured!
        </span>
      </h1>

      {/* Case 1: Not logged in */}
      {!user && (
        <div className="flex flex-col items-center justify-center">
          <p className="mb-2 mt-4 max-w-[280px] px-4 text-center text-xl leading-tight text-gray-700 sm:my-6 sm:max-w-none sm:px-0 md:text-2xl">
            Here's how {userName}'s stats look in 2024!
          </p>
          <UserStatsCard {...userData} />
          <Link href="/join" className="mb-2 mt-4 sm:my-6">
            <Button>Become a Founding Member</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="secondary">Log in to see your stats</Button>
          </Link>
        </div>
      )}

      {/* Case 2: Logged in, viewing own stats */}
      {user?.username === userName && (
        <div className="flex flex-col items-center justify-center">
          <p className="mb-2 mt-4 max-w-[280px] px-4 text-center text-xl leading-tight text-gray-700 sm:my-6 sm:max-w-none sm:px-0 md:text-2xl">
            Here's how your stats look in 2024!
          </p>
          <UserStatsCard {...userData} />
          <p className="mb-2 mt-4 max-w-[280px] px-4 text-center text-xl leading-tight text-gray-700 sm:my-6 sm:max-w-none sm:px-0 md:text-2xl">
            Take a screenshot and share it on Instagram! Tag{" "}
            <a
              href="https://instagram.com/soonlistapp"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold transition-colors hover:text-interactive-1"
            >
              @soonlistapp
            </a>
            !
          </p>
        </div>
      )}

      {/* Case 3: Logged in, viewing someone else's stats */}
      {user && user.username !== userName && (
        <div className="flex flex-col items-center justify-center">
          <p className="mb-2 mt-4 max-w-[280px] px-4 text-center text-xl leading-tight text-gray-700 sm:my-6 sm:max-w-none sm:px-0 md:text-2xl">
            Here's how {userName}'s stats look in 2024!
          </p>
          <UserStatsCard {...userData} />
          <Link href={`/2024/${user.username}`} className="mb-2 mt-4 sm:mt-6">
            <Button>See your stats!</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Page;
