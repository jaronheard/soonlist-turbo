"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
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

import dataFor2024 from "./dataFor2024";

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
          <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
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
          <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
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
          <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
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
          <p className="mt-6 text-xl leading-7.5 text-gray-700 md:text-2xl md:leading-9">
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
      </div>
      <div className="mx-auto max-w-6xl rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8" />
              <h1 className="text-4xl font-bold">Our 2024 Together</h1>
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="text-xl font-medium">
              The Soonlist Community Year in Review
            </p>
          </div>

          {/* Big Numbers */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
              <p className="mb-2 text-5xl font-bold">
                {stats.totalEvents.toLocaleString()}
              </p>
              <p className="text-xl">Events Captured</p>
            </div>
            <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
              <p className="mb-2 text-5xl font-bold">
                {stats.totalUsers.toLocaleString()}
              </p>
              <p className="text-xl">Active Capturers</p>
            </div>
          </div>

          {/* Event Types and Categories */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-300" />
                <h2 className="text-2xl font-bold">Popular Event Types</h2>
              </div>
              {stats.topEventTypes.map((type) => (
                <div
                  key={type.type}
                  className="mb-2 flex items-center justify-between"
                >
                  <span className="capitalize">{type.type}s</span>
                  <span className="font-bold">
                    {type.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <Heart className="h-6 w-6 text-pink-300" />
                <h2 className="text-2xl font-bold">Popular Categories</h2>
              </div>
              {stats.topCategories.map((category) => (
                <div
                  key={category.category}
                  className="mb-2 flex items-center justify-between"
                >
                  <span className="capitalize">{category.category}</span>
                  <span className="font-bold">
                    {category.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekday Distribution Chart */}
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-300" />
              <h2 className="text-2xl font-bold">Events by Day of Week</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weekdayDistribution}>
                  <XAxis dataKey="day_of_week" stroke="#fff" />
                  <YAxis stroke="#fff" domain={[0, 150]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
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
          </div>

          {/* Most Followed Events */}
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-300" />
              <h2 className="text-2xl font-bold">Most Followed Events</h2>
            </div>
            <div className="space-y-4">
              {stats.topFollowedEvents.map((event) => (
                <div
                  key={event.name}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold">{event.name}</p>
                    <p className="text-sm capitalize text-white/80">
                      {event.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{event.follows} follows</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Super Creators */}
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-300" />
              <h2 className="text-2xl font-bold">Our Super Capturers</h2>
            </div>
            <div className="space-y-4">
              {stats.topCreators.map((creator) => (
                <div
                  key={creator.username}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold">{creator.username}</p>
                    <p className="text-sm text-white/80">
                      Most captures: {creator.most_common_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{creator.total_events} events</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Capturer by Type */}
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-300" />
              <h2 className="text-2xl font-bold">Category Champions</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.categoryChampions.map((champion) => (
                <div
                  key={champion.event_type}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {champion.event_type}
                    </p>
                    <p className="text-sm">{champion.username}</p>
                  </div>
                  <p className="font-bold">{champion.type_count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Streak and Top Days */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-400" />
                <h2 className="text-xl font-bold">Longest Active Streak</h2>
              </div>
              <p className="text-3xl font-bold">
                {stats.longestStreak.streak_length} Days
              </p>
              <p className="mt-2 text-sm">
                From{" "}
                {new Date(
                  stats.longestStreak.streak_start,
                ).toLocaleDateString()}{" "}
                to{" "}
                {new Date(stats.longestStreak.streak_end).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-400" />
                <h2 className="text-xl font-bold">Busiest Day</h2>
              </div>
              <p className="text-3xl font-bold">
                {stats.top5DaysWithMostEvents[0].eventCount} Events
              </p>
              <p className="mt-2 text-sm">
                {new Date(
                  stats.top5DaysWithMostEvents[0].eventDate,
                ).toLocaleDateString()}{" "}
                - {stats.top5DaysWithMostEvents[0].eventTypes}
              </p>
            </div>
          </div>

          {/* Top 5 Days */}
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-300" />
              <h2 className="text-2xl font-bold">Biggest Event Days</h2>
            </div>
            <div className="space-y-3">
              {stats.top5DaysWithMostEvents.map((day) => (
                <div
                  key={day.eventDate}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold">
                      {new Date(day.eventDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-white/80">{day.eventTypes}</p>
                  </div>
                  <p className="font-bold">{day.eventCount} events</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 text-center text-sm text-white/80">
            <p>Thank you for being part of our community!</p>
            <p className="mt-1">Generated by Soonlist</p>
          </div>
        </div>
      </div>
    </div>
  );
}
