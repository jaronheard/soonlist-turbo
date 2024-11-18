import { Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";

import { api } from "~/utils/api";
import Config from "~/utils/config";

export default function QRModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: event } = api.event.get.useQuery(
    { eventId: id },
    {
      enabled: !!id,
    },
  );

  if (!event) return null;

  const eventData = event.event as AddToCalendarButtonProps;
  const qrValue = `${Config.apiBaseUrl}/event/${id}`;

  return (
    <View className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center p-4">
        <TouchableOpacity
          className="absolute right-4 top-12 z-10 rounded-full bg-interactive-1 p-2"
          onPress={() => router.back()}
        >
          <X size={24} color="white" />
        </TouchableOpacity>

        <View className="items-center rounded-3xl bg-white p-8">
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
            Captured by @{event.userName}
          </Text>
        </View>

        <Text className="mt-6 text-center text-sm text-zinc-400">
          Scan to view event details
        </Text>
      </View>
    </View>
  );
}
