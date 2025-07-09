import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Check, RefreshCw } from "~/components/icons";

interface SyncStatusIndicatorProps {
  isSyncing: boolean;
  lastSyncSuccess?: boolean;
  syncError?: string;
}

export function SyncStatusIndicator({
  isSyncing,
  lastSyncSuccess,
  syncError,
}: SyncStatusIndicatorProps) {
  if (!isSyncing && !syncError) return null;

  return (
    <View className="border-b border-blue-200 bg-blue-50 px-4 py-2">
      <View className="flex-row items-center justify-center">
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text className="ml-2 text-sm text-blue-700">
              Syncing events...
            </Text>
          </>
        ) : syncError ? (
          <>
            <RefreshCw className="text-red-600" size={16} />
            <Text className="ml-2 text-sm text-red-700">
              Sync failed. Pull to retry.
            </Text>
          </>
        ) : lastSyncSuccess ? (
          <>
            <Check className="text-green-600" size={16} />
            <Text className="ml-2 text-sm text-green-700">
              Synced successfully
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
