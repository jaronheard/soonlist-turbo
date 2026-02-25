import { useCallback } from "react";
import { Share, Text, TouchableOpacity, View } from "react-native";

import type { Segment } from "~/components/SegmentedControl";
import { LinkIcon, ShareIcon } from "~/components/icons";
import { ProfileMenu } from "~/components/ProfileMenu";
import { SegmentedControl } from "~/components/SegmentedControl";
import { logError } from "~/utils/errorLogging";

interface TabHeaderProps {
  title: string;
  shareUrl: string;
  displayUrl: string;
  selectedSegment: Segment;
  onSegmentChange: (segment: Segment) => void;
  upcomingLabel?: string;
  pastLabel?: string;
}

export function TabHeader({
  title,
  shareUrl,
  displayUrl,
  selectedSegment,
  onSegmentChange,
  upcomingLabel,
  pastLabel,
}: TabHeaderProps) {
  const handleShare = useCallback(async () => {
    try {
      await Share.share({ url: shareUrl });
    } catch (error) {
      logError("Error sharing", error);
    }
  }, [shareUrl]);

  return (
    <View className="pb-2 pl-3 pr-2 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <ProfileMenu />
          <View>
            <Text className="text-2xl font-semibold text-gray-900">
              {title}
            </Text>
            <View className="-mt-1 flex-row items-center gap-1">
              <LinkIcon size={10} color="#9CA3AF" />
              <Text className="text-xs text-gray-400">{displayUrl}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          className="flex-row items-center rounded-full bg-interactive-1 px-4 py-2"
          activeOpacity={0.8}
        >
          <ShareIcon size={18} color="#FFF" />
          <Text className="ml-2 text-base font-semibold text-white">Share</Text>
        </TouchableOpacity>
      </View>
      <View className="mt-3">
        <SegmentedControl
          selectedSegment={selectedSegment}
          onSegmentChange={onSegmentChange}
          upcomingLabel={upcomingLabel}
          pastLabel={pastLabel}
        />
      </View>
    </View>
  );
}
