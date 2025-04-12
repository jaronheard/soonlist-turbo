import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Calendar, History, Plus } from "lucide-react-native";

interface EventStatsProps {
  capturesThisWeek: number;
  weeklyGoal: number;
  upcomingEvents: number;
  allTimeEvents: number;
}

function CircularProgress({ progress }: { progress: number }) {
  const size = 24;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View className="relative">
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          stroke="#FFD1BA"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          opacity={0.2}
        />
        {/* Progress circle */}
        <Circle
          stroke="#FFD1BA"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center">
        <Plus size={16} color="#FFD1BA" />
      </View>
    </View>
  );
}

export function EventStats({
  capturesThisWeek,
  weeklyGoal,
  upcomingEvents,
  allTimeEvents,
}: EventStatsProps) {
  const progress = Math.min(capturesThisWeek / weeklyGoal, 1);

  return (
    <View className="flex-row justify-around px-2 pb-6 pt-2">
      <View
        className="flex-1 items-center bg-white p-3"
        style={{
          borderRadius: 15,
          borderWidth: 2,
          borderColor: "white",
          shadowColor: "#5A32FB",
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.15,
          shadowRadius: 2.5,
          elevation: 2,
          maxWidth: "30%",
        }}
      >
        <View className="flex-row items-center gap-2">
          <CircularProgress progress={progress} />
          <Text className="text-lg font-bold text-neutral-900">
            {capturesThisWeek}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">This Week</Text>
      </View>

      <View
        className="flex-1 items-center bg-white p-3"
        style={{
          borderRadius: 15,
          borderWidth: 2,
          borderColor: "white",
          shadowColor: "#5A32FB",
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.15,
          shadowRadius: 2.5,
          elevation: 2,
          maxWidth: "30%",
        }}
      >
        <View className="flex-row items-center gap-1">
          <Calendar size={16} color="#7ACEFC" />
          <Text className="text-lg font-bold text-neutral-900">
            {upcomingEvents}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">Upcoming</Text>
      </View>

      <View
        className="flex-1 items-center bg-white p-3"
        style={{
          borderRadius: 15,
          borderWidth: 2,
          borderColor: "white",
          shadowColor: "#5A32FB",
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.15,
          shadowRadius: 2.5,
          elevation: 2,
          maxWidth: "30%",
        }}
      >
        <View className="flex-row items-center gap-1">
          <History size={16} color="#C4DA9D" />
          <Text className="text-lg font-bold text-neutral-900">
            {allTimeEvents}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">All Time</Text>
      </View>
    </View>
  );
}
