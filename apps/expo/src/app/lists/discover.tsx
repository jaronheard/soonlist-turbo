import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { DiscoverSoonlistsContent } from "~/components/DiscoverSoonlistsContent";

export default function DiscoverSoonlistsScreen() {
  const insets = useSafeAreaInsets();
  const followedLists = useQuery(api.lists.getFollowedLists);

  return (
    <>
      <Stack.Screen options={{ title: "Discover Soonlists" }} />
      <View className="flex-1" style={{ backgroundColor: "#F4F1FF" }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <DiscoverSoonlistsContent
            followedLists={followedLists}
            onSubscribeSuccess={() => router.back()}
          />
        </ScrollView>
      </View>
    </>
  );
}
