import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { User } from "~/components/icons";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

interface FollowedUser {
  id: string;
  username: string;
  displayName?: string | null;
  userImage?: string | null;
}

function FollowedUserRow({
  user,
  onUnfollow,
  isUnfollowing,
}: {
  user: FollowedUser;
  onUnfollow: (userId: string) => void;
  isUnfollowing: boolean;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3"
      onPress={() => router.push(`/${user.username}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${user.displayName || user.username}'s profile`}
    >
      {/* Avatar */}
      <UserProfileFlair username={user.username} size="sm">
        {user.userImage ? (
          <Image
            source={{ uri: user.userImage }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View className="h-11 w-11 items-center justify-center rounded-full bg-neutral-4">
            <User size={22} color="#627496" />
          </View>
        )}
      </UserProfileFlair>

      {/* Name and username */}
      <View className="ml-3 flex-1">
        <Text
          className="text-base font-semibold text-neutral-1"
          numberOfLines={1}
        >
          {user.displayName || user.username}
        </Text>
        {user.displayName ? (
          <Text className="text-sm text-neutral-2" numberOfLines={1}>
            @{user.username}
          </Text>
        ) : null}
      </View>

      {/* Unfollow button */}
      <TouchableOpacity
        onPress={() => onUnfollow(user.id)}
        disabled={isUnfollowing}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Unfollow ${user.displayName || user.username}`}
        className="rounded-full border border-neutral-3 px-4 py-2"
      >
        {isUnfollowing ? (
          <ActivityIndicator size="small" color="#627496" />
        ) : (
          <Text className="text-sm font-semibold text-neutral-2">
            Following
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function ManageFollowingScreen() {
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const unfollowUserMutation = useMutation(api.users.unfollowUser);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());

  const handleUnfollow = useCallback(
    async (userId: string) => {
      setUnfollowingIds((prev) => new Set(prev).add(userId));
      try {
        await unfollowUserMutation({ followingId: userId });
        void hapticSuccess();
      } catch (error) {
        logError("Error unfollowing user", error);
        toast.error("Failed to unfollow");
      } finally {
        setUnfollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [unfollowUserMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: FollowedUser }) => (
      <FollowedUserRow
        user={item}
        onUnfollow={(id) => void handleUnfollow(id)}
        isUnfollowing={unfollowingIds.has(item.id)}
      />
    ),
    [handleUnfollow, unfollowingIds],
  );

  const isLoading = followingUsers === undefined;

  return (
    <View className="flex-1" style={{ backgroundColor: "#F4F1FF" }}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      ) : followingUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg font-semibold text-neutral-2">
            You aren't following anyone yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={followingUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 32 }}
          ItemSeparatorComponent={() => (
            <View className="ml-16 mr-4 h-px bg-neutral-4" />
          )}
        />
      )}
    </View>
  );
}

export { ErrorBoundary } from "expo-router";
