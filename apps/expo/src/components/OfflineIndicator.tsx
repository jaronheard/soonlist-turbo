import React from "react";
import { Text, View } from "react-native";

import { WifiOff } from "~/components/icons";
import { formatRelativeTime } from "~/utils/dates";

interface OfflineIndicatorProps {
  isOffline: boolean;
  lastUpdated?: number;
  isStale?: boolean;
}

export function OfflineIndicator({
  isOffline,
  lastUpdated,
  isStale = false,
}: OfflineIndicatorProps) {
  if (!isOffline && !isStale) return null;

  const message = isOffline ? "Viewing offline data" : "Data may be outdated";

  const timeAgo = lastUpdated
    ? `Last updated ${
        new Date(Date.now() - lastUpdated).getTime() < 60000
          ? "just now"
          : new Date(Date.now() - lastUpdated).getTime() < 3600000
            ? `${Math.floor((Date.now() - lastUpdated) / 60000)} minutes ago`
            : `${Math.floor((Date.now() - lastUpdated) / 3600000)} hours ago`
      }`
    : "Last update time unknown";

  const bgColor = isStale ? "bg-yellow-100" : "bg-gray-100";
  const textColor = isStale ? "text-yellow-800" : "text-gray-700";
  const iconColor = isStale ? "text-yellow-600" : "text-gray-600";

  return (
    <View className={`${bgColor} border-b border-gray-200 px-4 py-3`}>
      <View className="flex-row items-center">
        <WifiOff className={`${iconColor} mr-2`} size={16} />
        <View className="flex-1">
          <Text className={`${textColor} text-sm font-medium`}>{message}</Text>
          <Text className={`${textColor} text-xs opacity-75`}>{timeAgo}</Text>
        </View>
      </View>
    </View>
  );
}
