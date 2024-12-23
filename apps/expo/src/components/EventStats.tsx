import React from "react";
import { Text, View } from "react-native";

interface EventStatsProps {
  capturesThisWeek: number;
  weeklyGoal: number;
  upcomingEvents: number;
  allTimeEvents: number;
}

export function EventStats({
  capturesThisWeek,
  weeklyGoal,
  upcomingEvents,
  allTimeEvents,
}: EventStatsProps) {
  return (
    <View className="flex-row justify-between bg-interactive-3 px-4 py-2.5">
      <View className="flex-1 items-center border-r border-neutral-200 px-2">
        <View className="flex-row items-baseline">
          <Text className="text-2xl font-bold text-neutral-900">
            {capturesThisWeek}
          </Text>
          <Text className="text-sm font-normal text-neutral-500">
            /{weeklyGoal}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">This Week</Text>
      </View>
      <View className="flex-1 items-center border-r border-neutral-200 px-2">
        <Text className="text-2xl font-bold text-neutral-900">
          {upcomingEvents}
        </Text>
        <Text className="text-xs text-neutral-500">Upcoming</Text>
      </View>
      <View className="flex-1 items-center px-2">
        <Text className="text-2xl font-bold text-neutral-900">
          {allTimeEvents}
        </Text>
        <Text className="text-xs text-neutral-500">All Time</Text>
      </View>
    </View>
  );
}
