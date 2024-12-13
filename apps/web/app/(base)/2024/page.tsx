"use client";

import React from "react";
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

export default function Page() {
  const stats = dataFor2024;

  return (
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
                <span className="font-bold">{type.count.toLocaleString()}</span>
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
              {new Date(stats.longestStreak.streak_start).toLocaleDateString()}{" "}
              to {new Date(stats.longestStreak.streak_end).toLocaleDateString()}
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
  );
}
