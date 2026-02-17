import React from "react";
import { Platform, Share, Text, TouchableOpacity, View } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

import { LinkIcon, ShareIcon } from "~/components/icons";
import { ProfileMenu } from "~/components/ProfileMenu";
import { logError } from "~/utils/errorLogging";

export type Segment = "upcoming" | "past";

interface TabHeaderProps {
  title: string;
  subtitle: string;
  shareUrl: string;
  selectedSegment: Segment;
  onSegmentChange: (segment: Segment) => void;
  /** Optional count to show next to "Upcoming" label */
  upcomingCount?: number;
}

function SegmentedControlFallback({
  selectedSegment,
  onSegmentChange,
}: {
  selectedSegment: Segment;
  onSegmentChange: (segment: Segment) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        padding: 4,
      }}
    >
      <TouchableOpacity
        style={{
          alignItems: "center",
          borderRadius: 6,
          paddingHorizontal: 16,
          paddingVertical: 8,
          ...(selectedSegment === "upcoming"
            ? {
                backgroundColor: "white",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 1,
              }
            : {}),
        }}
        onPress={() => onSegmentChange("upcoming")}
      >
        <Text
          style={{
            fontWeight: selectedSegment === "upcoming" ? "600" : "400",
            color: selectedSegment === "upcoming" ? "#111827" : "#6B7280",
          }}
        >
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          alignItems: "center",
          borderRadius: 6,
          paddingHorizontal: 16,
          paddingVertical: 8,
          ...(selectedSegment === "past"
            ? {
                backgroundColor: "white",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 1,
              }
            : {}),
        }}
        onPress={() => onSegmentChange("past")}
      >
        <Text
          style={{
            fontWeight: selectedSegment === "past" ? "600" : "400",
            color: selectedSegment === "past" ? "#111827" : "#6B7280",
          }}
        >
          Past
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function TabHeader({
  title,
  subtitle,
  shareUrl,
  selectedSegment,
  onSegmentChange,
  upcomingCount,
}: TabHeaderProps) {
  const handleShare = async () => {
    try {
      await Share.share({ url: shareUrl });
    } catch (error) {
      logError("Error sharing", error);
    }
  };

  const upcomingLabel =
    upcomingCount !== undefined && upcomingCount > 0
      ? `Upcoming · ${upcomingCount}`
      : "Upcoming";

  return (
    <View
      style={{
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 8,
        paddingTop: 12,
      }}
    >
      {/* Top row: Avatar, Name, Share */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ProfileMenu />
          <View>
            <Text style={{ fontSize: 22, fontWeight: "600", color: "#111827" }}>
              {title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: -2,
              }}
            >
              <LinkIcon size={10} color="#9CA3AF" />
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{subtitle}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 9999,
            backgroundColor: "#5A32FB",
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
          activeOpacity={0.8}
        >
          <ShareIcon size={18} color="#FFF" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: 16,
              fontWeight: "600",
              color: "white",
            }}
          >
            Share
          </Text>
        </TouchableOpacity>
      </View>
      {/* Second row: Segmented Control */}
      <View style={{ marginTop: 12, width: 260 }}>
        {Platform.OS === "ios" ? (
          <SegmentedControl
            values={[upcomingLabel, "Past"]}
            selectedIndex={selectedSegment === "upcoming" ? 0 : 1}
            onChange={(event) => {
              const index = event.nativeEvent.selectedSegmentIndex;
              onSegmentChange(index === 0 ? "upcoming" : "past");
            }}
          />
        ) : (
          <SegmentedControlFallback
            selectedSegment={selectedSegment}
            onSegmentChange={onSegmentChange}
          />
        )}
      </View>
    </View>
  );
}
