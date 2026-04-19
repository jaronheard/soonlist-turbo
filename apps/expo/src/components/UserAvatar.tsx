import React from "react";
import { View } from "react-native";
import { Image as ExpoImage } from "expo-image";

import type { UserForDisplay } from "~/types/user";
import { User } from "~/components/icons";
import { UserProfileFlair } from "~/components/UserProfileFlair";

interface UserAvatarProps {
  user: Pick<UserForDisplay, "id" | "username" | "userImage">;
  size: number;
  recyclingKey?: string;
}

export function UserAvatar({ user, size, recyclingKey }: UserAvatarProps) {
  return (
    <UserProfileFlair username={user.username} size="xs">
      {user.userImage ? (
        <ExpoImage
          source={{ uri: user.userImage }}
          style={{ width: size, height: size, borderRadius: 9999 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={recyclingKey ?? user.id}
        />
      ) : (
        <View
          className="items-center justify-center rounded-full bg-interactive-2"
          style={{ width: size, height: size }}
        >
          <User size={size * 0.6} color="#627496" />
        </View>
      )}
    </UserProfileFlair>
  );
}
