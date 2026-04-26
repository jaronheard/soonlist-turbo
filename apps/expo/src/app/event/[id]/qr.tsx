import { Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Image as ExpoImage } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { X } from "~/components/icons";
import { Logo } from "~/components/Logo";
import Config from "~/utils/config";

function appendImageParams(url: string, params: string) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${params}`;
}

export default function QRModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const event = useQuery(api.events.get, { eventId: id });

  if (!event) return null;

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const eventData = event.event as AddToCalendarButtonProps;
  const qrValue = `${Config.apiBaseUrl}/event/${id}`;
  const eventImage = eventData.images?.[3];
  const backgroundUri = eventImage
    ? appendImageParams(eventImage, "max-w=1284&fit=contain&f=webp&q=80")
    : null;
  const thumbnailUri = eventImage
    ? appendImageParams(eventImage, "w=160&h=160&fit=cover&f=webp&q=80")
    : null;

  return (
    <View className="flex-1 bg-interactive-3">
      {backgroundUri && (
        <View className="absolute inset-0 h-full w-full overflow-hidden">
          <ExpoImage
            source={{ uri: backgroundUri }}
            placeholder={thumbnailUri ? { uri: thumbnailUri } : undefined}
            placeholderContentFit="cover"
            style={{ width: "100%", height: "100%", position: "absolute" }}
            contentFit="cover"
            cachePolicy="memory-disk"
            blurRadius={10}
          />
          <View className="absolute inset-0 bg-interactive-1/20" />
        </View>
      )}

      <View className="flex-1 items-center justify-center p-4">
        <TouchableOpacity
          className="absolute right-4 top-12 z-10 rounded-full bg-interactive-1 p-2"
          onPress={() =>
            router.canGoBack() ? router.back() : router.navigate("/feed")
          }
        >
          <X size={24} color="white" />
        </TouchableOpacity>

        <View className="items-center rounded-3xl bg-white/95 p-8 shadow-sm">
          <View>
            <Logo className="h-8 w-40" variant="hidePreview" />
          </View>
          <View className="p-4"></View>
          <QRCode
            value={qrValue}
            size={250}
            backgroundColor="white"
            color="black"
          />

          <Text className="mt-6 text-center text-xl font-semibold text-black">
            {eventData.name}
          </Text>

          <Text className="mt-2 text-sm text-zinc-600">
            Captured by{" "}
            {event.user?.displayName
              ? event.user.displayName
              : `@${event.userName}`}
          </Text>
        </View>
      </View>
    </View>
  );
}
