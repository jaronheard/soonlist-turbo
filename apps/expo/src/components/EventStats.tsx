import React from "react";
import { Text, View } from "react-native";
import { Calendar, History, Plus } from "lucide-react-native";

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
    <View className="flex-row justify-between bg-white px-4 py-2.5">
      <View className="flex-1 border-r border-neutral-200 px-2">
        <View className="flex-row items-center gap-1">
          <Plus size={18} color="#FFD1BA" />
          <View className="flex-row items-baseline">
            <Text className="text-lg font-bold text-neutral-900">
              {capturesThisWeek}
            </Text>
            <Text className="text-xs font-normal text-neutral-500">
              /{weeklyGoal}
            </Text>
          </View>
        </View>
        <Text className="text-xs text-neutral-500">This Week</Text>
      </View>
      <View className="flex-1 border-r border-neutral-200 px-2">
        <View className="flex-row items-center gap-1">
          <Calendar size={18} color="#7ACEFC" />
          <Text className="text-lg font-bold text-neutral-900">
            {upcomingEvents}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">Upcoming</Text>
      </View>
      <View className="flex-1 px-2">
        <View className="flex-row items-center gap-1">
          <History size={18} color="#C4DA9D" />
          <Text className="text-lg font-bold text-neutral-900">
            {allTimeEvents}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">All Time</Text>
      </View>
    </View>
  );
}
