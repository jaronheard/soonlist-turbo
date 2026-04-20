import React from "react";
import { Platform, View } from "react-native";
import { Image } from "expo-image";

export const sceneCardShadow =
  Platform.OS === "ios"
    ? {
        shadowColor: "#5A32FB",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
      }
    : { elevation: 2 };

/** Three tilted tiles; soft edges, no harsh strokes. */
export function ScenePreviewThreeUp({
  imageUris,
  align = "start",
}: {
  imageUris: (string | null)[];
  align?: "start" | "center";
}) {
  const slots: (string | null)[] = [0, 1, 2].map((i) => imageUris[i] ?? null);
  return (
    <View
      className={`flex-row items-center py-1 ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      {slots.map((uri, i) => (
        <View
          key={i}
          className="overflow-hidden rounded-lg bg-neutral-4"
          style={{
            width: 56,
            height: 72,
            marginLeft: i > 0 ? -14 : 0,
            transform: [{ rotate: `${-8 + i * 8}deg` }],
            zIndex: 3 - i,
            ...sceneCardShadow,
          }}
        >
          {uri ? (
            <Image
              source={{
                uri: `${uri}${uri.includes("?") ? "&" : "?"}w=168&h=216&fit=cover&f=webp&q=80`,
              }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <View className="h-full w-full bg-neutral-4" />
          )}
        </View>
      ))}
    </View>
  );
}

export default ScenePreviewThreeUp;
