import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link"; // Import Link from Next.js

import { currentUser } from "@clerk/nextjs/server";

import { Button } from "@soonlist/ui/button";

import { env } from "~/env";
import EmojiGrid from "./_components/emojiGrid";
import Section from "./_components/section";
import WeeklyDistribution from "./_components/weeklyDistribution";
import dataFor2024 from "./dataFor2024";

// Add these interfaces at the top of the file, after imports
interface TopEvent {
  id: string;
  event_name: string;
  event_type: string;
  follow_count: string;
  creator_username: string;
  images: string[];
  filePath?: string;
}

interface TopCreator {
  username: string;
  emoji: string;
  userImage: string;
  total_events: string;
  most_common_type: string;
  type_count: string;
}

export const metadata: Metadata = {
  title: `Captured 2024! | Soonlist`,
  openGraph: {
    title: `Captured 2024! | Soonlist`,
    description:
      "Community highlights from 2024. Let's take a look back at the year together!",
    url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/2024`,
    type: "article",
    images: ["/soonlist-2024-captured.png"],
  },
};

const typesToPlural = {
  concert: "concerts",
  party: "parties",
  performance: "performances",
  festival: "festivals",
  meeting: "meetings",
};

export default async function Page() {
  const user = await currentUser();
  const stats = dataFor2024;

  return (
    <div>
      <div className="mx-auto text-center">
        <h1 className="font-heading text-5xl font-bold leading-none tracking-tighterish text-gray-700 md:text-7xl md:leading-none">
          2024 <br />
          <span className="relative inline-block text-6xl text-interactive-1 md:text-8xl md:leading-none">
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
        <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          From screenshots of Instagram stories to photos of coffee shop flyers,
          you and our amazing community turned fleeting moments into getting out
          into the world and experiencing new things.
        </p>
        <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          <em>Let's take a look back at the year together!</em>
        </p>
        <Section>
          <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            We grew to{" "}
            <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
              {stats.totalUsers.toLocaleString()}
            </span>{" "}
            active capturers!
          </p>

          <EmojiGrid emojis={stats.emojis} />
        </Section>
        <Section>
          <div className="flex flex-col md:flex-row">
            <div className="flex justify-center">
              <div className="">
                <Image
                  src="/2024-captured-events-1.png"
                  alt="2024 captured events"
                  width={500}
                  height={500}
                />
              </div>
            </div>
            <div className="md:w-1/2">
              <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
                We captured{" "}
                <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
                  {stats.totalEvents.toLocaleString()}
                </span>{" "}
                total events!
              </p>
            </div>
            <div className="flex justify-center">
              <div className="">
                <Image
                  src="/2024-captured-events-2.png"
                  alt="2024 captured events"
                  width={500}
                  height={500}
                />
              </div>
            </div>
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            The most popular types of events were:
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {stats.topEventTypes.map((type, index) => (
              <div
                key={type.type}
                className={`${
                  index % 2 === 0
                    ? `-rotate-${(index % 3) + 1}`
                    : `rotate-${(index % 3) + 2}`
                } transform`}
              >
                <div
                  className={`${
                    index % 4 === 0
                      ? `bg-accent-orange`
                      : index % 4 === 1
                        ? `bg-accent-green`
                        : index % 4 === 2
                          ? `bg-accent-blue`
                          : `bg-accent-yellow`
                  } inline-block rounded-md px-2 py-1 text-3xl text-neutral-1 shadow-sm`}
                >
                  <span className="capitalize">
                    {/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */}
                    {typesToPlural[type.type as keyof typeof typesToPlural]}
                  </span>{" "}
                  <span className="font-bold">
                    {type.count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            The most popular categories were:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {stats.topCategories.map((category, index) => (
              <div
                key={category.category}
                className={`${
                  index % 2 === 0
                    ? `-rotate-${(index % 3) + 2}`
                    : `rotate-${(index % 3) + 1}`
                } transform`}
              >
                <div
                  className={`${
                    index % 4 === 0
                      ? `bg-accent-green`
                      : index % 4 === 1
                        ? `bg-accent-blue`
                        : index % 4 === 2
                          ? `bg-accent-yellow`
                          : `bg-accent-orange`
                  } inline-block rounded-md px-2 py-1 text-3xl text-neutral-1 shadow-sm`}
                >
                  <span className="capitalize">{category.category}</span>{" "}
                  <span className="font-bold">
                    {category.count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            The most followed events were:
          </p>
          {stats.topFollowedEvents.map((event: TopEvent, index) => (
            <Link key={event.id} href={`/event/${event.id}`}>
              <div
                className={`mb-4 flex transform items-start space-x-4 ${index % 2 === 0 ? "rotate-1" : "-rotate-1"} mx-auto max-w-md rounded-md border border-gray-300 p-4 shadow-md transition-colors duration-200 hover:bg-purple-100`}
              >
                {event.images[0] && (
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={event.images[0]}
                      alt={event.event_name}
                      fill
                      sizes="(max-width: 768px) 96px, 96px"
                      className="absolute inset-0 object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-grow flex-col text-left">
                  <p className="font-heading text-2xl font-bold text-interactive-1">
                    {event.event_name}
                  </p>
                  <p className="text-sm">
                    captured by{" "}
                    <span className="font-bold">{event.creator_username}</span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            The most popular venues were:
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {stats.topVenues.map((venue, index) => (
              <div
                key={venue.venue}
                className={`${
                  index % 2 === 0
                    ? `-rotate-${(index % 3) + 1}`
                    : `rotate-${(index % 3) + 2}`
                } transform`}
              >
                <div
                  className={`${
                    index % 4 === 0
                      ? `bg-accent-orange`
                      : index % 4 === 1
                        ? `bg-accent-green`
                        : index % 4 === 2
                          ? `bg-accent-blue`
                          : `bg-accent-yellow`
                  } inline-block rounded-md px-2 py-1 text-3xl text-neutral-1 shadow-sm`}
                >
                  <span className="capitalize">{venue.venue}</span>{" "}
                  <span className="font-bold">
                    {venue.count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Unsurprisingly, we had the most events on{" "}
            <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
              Saturdays
            </span>{" "}
            but Sundays were not far behind!
          </p>
          <WeeklyDistribution weekdayDistribution={stats.weekdayDistribution} />
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Our super capturers were:
          </p>
          <div className="flex flex-wrap">
            {stats.topCreators.map((creator: TopCreator, _index) => {
              const rotation = Math.floor(Math.random() * 7) - 3;
              const rotationClass =
                rotation < 0
                  ? `-rotate-${Math.abs(rotation)}`
                  : `rotate-${rotation}`;

              return (
                <div
                  key={creator.username}
                  className={`mb-8 flex w-full transform items-start space-x-4 rounded-md border border-gray-300 bg-white p-4 shadow-md md:w-1/2 ${rotationClass}`}
                >
                  {creator.userImage && (
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-4 border-yellow-300">
                      <Image
                        src={creator.userImage}
                        alt={creator.username}
                        fill
                        sizes="48px"
                        className="absolute inset-0 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <p className="font-heading text-2xl font-bold text-interactive-1">
                      <strong>@{creator.username}</strong> {creator.emoji}
                    </p>
                    <p className="text-sm">
                      Total captured:{" "}
                      <span className="text-lg font-bold">
                        {parseInt(creator.total_events).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm">
                      Favorite type:{" "}
                      <span className="text-lg font-bold">
                        {creator.most_common_type}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            {user ? (
              "Discover your 2024 highlights - from saved possibilities to shared adventures!"
            ) : (
              <>
                Join our founding members and start capturing amazing events in{" "}
                <span className="relative inline-block font-heading text-4xl font-bold text-interactive-1">
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
                  2025!
                </span>
              </>
            )}
          </p>
          {user ? (
            <Link href={`/2024/${user.username}`}>
              <Button>See your stats!</Button>
            </Link>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Link href="/join">
                <Button
                  size="lg"
                  className="animate-bounce bg-interactive-1 text-lg font-bold hover:bg-interactive-1/90"
                >
                  Become a Founding Member
                </Button>
              </Link>
              <p className="text-sm text-gray-600">
                Limited time offer • Join the community today!
              </p>
            </div>
          )}
          {user && (
            <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
              Let's make 2025 your biggest year of capturing yet!
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
