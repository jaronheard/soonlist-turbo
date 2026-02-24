import React from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useUser } from "@clerk/clerk-expo";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useConvexAuth } from "convex/react";

import { ShareIcon, User } from "~/components/icons";
import { UserProfileFlair } from "./UserProfileFlair";

interface TabHeaderProps {
  variant: "mylist" | "board";
  selectedSegmentIndex: number;
  onSegmentChange: (index: number) => void;
}

export function TabHeader({
  variant,
  selectedSegmentIndex,
  onSegmentChange,
}: TabHeaderProps) {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();

  const firstName = user?.firstName ?? user?.username ?? "";
  const username = user?.username ?? "";

  const title =
    variant === "mylist" ? `${firstName}'s Soonlist` : `${firstName}'s Board`;

  const subtitle =
    variant === "mylist"
      ? `soonlist.com/${username}`
      : `soonlist.com/${username}/board`;

  const shareUrl =
    variant === "mylist"
      ? `https://soonlist.com/${username}`
      : `https://soonlist.com/${username}/board`;

  const handleShare = async () => {
    await Share.share({
      message: title,
      url: shareUrl,
    });
  };

  const profileImage = user?.imageUrl ? (
    <ExpoImage
      source={{ uri: user.imageUrl }}
      style={{
        width: 36,
        height: 36,
        borderRadius: 9999,
        borderWidth: 2,
        borderColor: "#FEEA9F",
      }}
      contentFit="cover"
      contentPosition="center"
      cachePolicy="disk"
      transition={100}
    />
  ) : (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 9999,
        backgroundColor: "#E8E8E8",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <User size={18} color="#5A32FB" />
    </View>
  );

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Profile avatar + text */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {user?.username && isAuthenticated ? (
            <UserProfileFlair username={user.username} size="sm">
              {profileImage}
            </UserProfileFlair>
          ) : (
            profileImage
          )}
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#1A1A2E",
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#627496",
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        {/* Right: Share button */}
        <Pressable
          onPress={handleShare}
          style={{
            backgroundColor: "#E0D9FF",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ShareIcon size={16} color="#5A32FB" />
          <Text style={{ color: "#5A32FB", fontWeight: "600", fontSize: 14 }}>
            Share
          </Text>
        </Pressable>
      </View>

      {/* Segmented Control */}
      <View style={{ marginTop: 12 }}>
        {Platform.OS === "ios" ? (
          <SegmentedControl
            values={["Upcoming", "Past"]}
            selectedIndex={selectedSegmentIndex}
            onChange={({ nativeEvent }) =>
              onSegmentChange(nativeEvent.selectedSegmentIndex)
            }
          />
        ) : (
          <SegmentedControlFallback
            values={["Upcoming", "Past"]}
            selectedIndex={selectedSegmentIndex}
            onIndexChange={onSegmentChange}
          />
        )}
      </View>
    </View>
  );
}

// Android fallback segmented control
function SegmentedControlFallback({
  values,
  selectedIndex,
  onIndexChange,
}: {
  values: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#F0F0F0",
        borderRadius: 8,
        padding: 2,
      }}
    >
      {values.map((value, index) => (
        <Pressable
          key={value}
          onPress={() => onIndexChange(index)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 6,
            alignItems: "center",
            backgroundColor:
              selectedIndex === index ? "#FFFFFF" : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: selectedIndex === index ? "600" : "400",
              color: selectedIndex === index ? "#1A1A2E" : "#627496",
            }}
          >
            {value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
