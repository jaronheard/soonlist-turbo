"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link"; // Import Link from Next.js
import {
  Activity,
  Award,
  Calendar,
  Flame,
  Heart,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@soonlist/ui/button";

import dataFor2024 from "./dataFor2024";

interface CalendarDayCardProps {
  date: Date; // Accept Date object
}

const CalendarDayCard: React.FC<CalendarDayCardProps> = ({ date }) => {
  const dayType = date
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const dayNumber = date.getDate().toString();
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();

  return (
    <div className="flex w-32 flex-col items-center justify-center rounded-lg border bg-white/10 p-4 shadow-md backdrop-blur-sm">
      {" "}
      {/* Fixed width */}
      <div className="text-center">
        <p className="text-sm font-bold text-gray-500">{dayType}</p>
        <p className="font-heading text-5xl font-bold">{dayNumber}</p>{" "}
        {/* Use font-heading class */}
      </div>
      <p className="text-xl font-bold ">{month}</p> {/* Month at the bottom */}
    </div>
  );
};

// Section component that has a good amount of vertical padding and a 4 px wide bottom border that is puurple
const Section = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mb-12 border-b-8 border-purple-100 pb-12">{children}</div>
  );
};

// Add this CSS in your global styles or a CSS module
const styles = `
@keyframes grow {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(2);
  }
  100% {
    transform: scale(1);
  }
}

.animate-grow {
  animation: grow 1.0s ease-in-out infinite;
}
`;

export default function Page() {
  const stats = dataFor2024;
  const emojis = [
    "🤙",
    "🤸",
    "🚣🏽",
    "🌀",
    "🪰",
    "🪐",
    "🍿",
    "👻",
    "🍪",
    "👹",
    "✨",
    "🥜",
    "🤌",
    "🧦",
    "🐢",
    "🥑",
    "🐯",
    "🧜",
    "🐞",
    "💐",
    "🦋",
    "🌋",
    "🌚",
    "🎈",
    "🧩",
    "💖",
    "😎",
    "🙏",
    "⏳",
    "🔜",
  ];
  const [growingEmojiIndex, setGrowingEmojiIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly select one emoji to grow
      const randomIndex = Math.floor(Math.random() * emojis.length);
      setGrowingEmojiIndex(randomIndex);
    }, 300); // Change every 300 milliseconds for faster effect

    return () => clearInterval(interval);
  }, [emojis.length]);

  return (
    <div>
      <style>{styles}</style>
      <div className="mx-auto text-center">
        <h1 className="font-heading text-5xl font-bold leading-none tracking-tighterish text-gray-700 md:text-7xl md:leading-none">
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
        <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
          Thank you for being part of our community! 2024 was a big year for
          Soonlist. Let's take a look back at the year together.
        </p>
        <Section>
          <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Our community grew to{" "}
            <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
              {stats.totalUsers.toLocaleString()}
            </span>{" "}
            active capturers!
          </p>
          <div className="mx-auto grid grid-cols-5 justify-center gap-2">
            {emojis.map((emoji, index) => (
              <span
                key={index}
                className={`text-3xl ${growingEmojiIndex === index ? "animate-grow" : ""}`}
                title="Founding Member"
              >
                {emoji}
              </span>
            ))}
          </div>
        </Section>
        <Section>
          <div className="flex flex-col md:flex-row">
            <div className="grid grid-cols-2 justify-items-center gap-4 md:w-1/2">
              {/* Updated to use randomEightEvents from the dataset */}
              {stats.randomEightEvents.slice(0, 4).map((item, index) => (
                <div
                  key={index}
                  className={`aspect-w-1 aspect-h-1 relative h-24 w-24 transform overflow-hidden rounded-md border-2 border-yellow-300`}
                >
                  <Image
                    src={item.event.images[0]}
                    alt={`Event ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" // Add sizes prop here
                    className="object-cover"
                  />
                </div>
              ))}
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
            <div className="grid grid-cols-2 justify-items-center gap-4 md:w-1/2">
              {/* Updated to use randomEightEvents from the dataset */}
              {stats.randomEightEvents.slice(4, 8).map((item, index) => (
                <div
                  key={index}
                  className={`aspect-w-1 aspect-h-1 relative h-24 w-24 transform overflow-hidden rounded-md border-2 border-yellow-300`}
                >
                  <Image
                    src={item.event.images[0]}
                    alt={`Event ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" // Add sizes prop here
                    className="object-cover"
                  />
                </div>
              ))}
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
                  <span className="capitalize">{type.type}s</span>{" "}
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
          {stats.topFollowedEvents.map((event) => (
            <div key={event.id} className="mb-4 flex items-start space-x-4">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border-2 border-yellow-300">
                <Image
                  src={event.images[0]}
                  alt={event.event_name}
                  layout="fill"
                  className="absolute inset-0 object-cover"
                />
              </div>
              <div className="flex flex-grow flex-col text-left">
                <p className="font-heading text-2xl">{event.event_name}</p>
                <p className="text-sm ">
                  captured by{" "}
                  <span className="font-bold">{event.creator_username}</span>
                </p>
              </div>
            </div>
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
            Our busiest days of the year each had 7 events that day!
          </p>
          <div className="grid grid-cols-3 gap-4">
            {stats.top5DaysWithMostEvents.map((day) => {
              const eventDate = new Date(day.eventDate + ` GMT-0700`); // Create Date object

              return (
                <CalendarDayCard
                  key={day.eventDate}
                  date={eventDate} // Pass the Date object
                />
              );
            })}
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Our longest active streak was{" "}
            <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
              {stats.longestStreak.streak_length}
            </span>{" "}
            days! We had events on every day between{" "}
            {new Date(
              stats.longestStreak.streak_start + " GMT-0700",
            ).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}{" "}
            and{" "}
            {new Date(
              stats.longestStreak.streak_end + " GMT-0700",
            ).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </p>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Unsurprisingly, we had the most events on{" "}
            <span className="mt-4 block font-heading text-6xl font-bold text-interactive-1">
              Saturdays
            </span>{" "}
            but Sundays were not far behind!
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekdayDistribution}>
                <XAxis dataKey="day_of_week" />
                <YAxis domain={[0, 150]} ticks={[0, 50, 100, 150]} />
                <Tooltip
                  contentStyle={{
                    // backgroundColor: "#1a1a1a",
                    border: "none",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="event_count"
                  fill="#60A5FA"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Our super capturers were:
          </p>
          <div className="flex flex-wrap">
            {stats.topCreators.map((creator) => (
              <div
                key={creator.username}
                className="mb-8 flex w-1/2 items-start space-x-4"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-4 border-yellow-300">
                  <Image
                    src={creator.userImage}
                    alt={creator.username}
                    layout="fill"
                    className="absolute inset-0 object-cover"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <p className="font-heading text-2xl text-interactive-1">
                    <strong>@{creator.username}</strong> {creator.emoji}
                  </p>
                  <p className="text-sm">
                    Total events captured:{" "}
                    <span className=" text-lg font-bold ">
                      {creator.total_events}
                    </span>
                  </p>
                  <p className="text-sm">
                    Favorite event type:{" "}
                    <span className=" text-lg font-bold ">
                      {creator.most_common_type}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Now its your turn! See how many events you can capture in 2025!
          </p>
          <p className="m-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
            Want to your individual stats for Soonlist 2024 Captured?
          </p>
          <Link href="/2024/joshcarr">
            <Button>See your stats!</Button>
          </Link>
        </Section>
      </div>
    </div>
  );
}
