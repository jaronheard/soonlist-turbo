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
    <View className="mx-4 mb-4 mt-2 flex-row justify-between rounded-xl bg-neutral-50 p-4">
      <View className="flex-1 items-center border-r border-neutral-200 px-2">
        <Text className="text-2xl font-bold text-neutral-900">
          {capturesThisWeek}
          <Text className="text-sm font-normal text-neutral-500">
            /{weeklyGoal}
          </Text>
        </Text>
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
