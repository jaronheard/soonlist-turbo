import React from "react";
import { Pressable, Share, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import { Globe2, ShareIcon } from "~/components/icons";
import Config from "~/utils/config";
import { formatEventDateRangeCompact } from "~/utils/dates";
import { logError } from "~/utils/errorLogging";

interface EventCaptureToastProps {
  event: {
    id: string;
    event: AddToCalendarButtonPropsRestricted;
    visibility: "public" | "private";
  };
}

export function EventCaptureToast({ event }: EventCaptureToastProps) {
  const { id, event: e, visibility } = event;
  const dateString = formatEventDateRangeCompact(
    e.startDate || "",
    e.startTime,
    e.endTime,
    e.timeZone || "",
  );

  const handleShare = async () => {
    try {
      await Share.share({
        url: `${Config.apiBaseUrl}/event/${id}`,
      });
      toast.dismiss();
    } catch (error) {
      logError("Error sharing event", error);
      toast.error("Failed to share event. Please try again.");
    }
  };

  const handleView = () => {
    toast.dismiss();
    void router.push(`/event/${id}`);
  };

  return (
    <View className="w-full px-4">
      <Pressable onPress={handleView}>
        <View
          className="w-full overflow-hidden rounded-3xl bg-interactive-2 p-4"
          style={{
            borderWidth: 3,
            borderColor: "white",
            shadowColor: "#5A32FB",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2.5,
            elevation: 2,
            marginVertical: 4,
          }}
        >
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 flex-row items-center gap-4">
              <View
                className="h-16 w-16 overflow-hidden rounded-xl bg-accent-yellow"
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                {e.images?.[3] ? (
                  <Image
                    source={
                      typeof e.images[3] === "number"
                        ? e.images[3]
                        : {
                            uri: `${e.images[3]}?w=160&h=160&fit=cover&f=webp&q=80`,
                          }
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    contentFit="cover"
                    contentPosition="center"
                    cachePolicy="disk"
                    transition={100}
                  />
                ) : (
                  <View className="flex h-full items-center justify-center">
                    <Text style={{ fontSize: 24 }}>📅</Text>
                  </View>
                )}
              </View>

              <View className="flex-1">
                <Text
                  className="text-base font-bold text-black"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {e.name}
                </Text>
                <Text className="text-sm text-black/80">
                  {dateString.date} • {dateString.time}
                </Text>
                {visibility === "public" && (
                  <View className="mt-1 flex-row items-center self-start rounded-full bg-interactive-1/20 px-2 py-1">
                    <Globe2 size={14} color="#5A32FB" />
                    <Text className="ml-1 text-xs text-interactive-1">
                      Public
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Pressable
              onPress={handleShare}
              className="h-14 w-14 items-center justify-center rounded-full bg-interactive-1"
              style={{
                shadowColor: "#5A32FB",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <ShareIcon size={28} color="white" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function showEventCaptureToast(event: EventCaptureToastProps["event"]) {
  return toast.custom(<EventCaptureToast event={event} />, {
    duration: 8000,
    dismissible: true,
    position: "top-center",
  });
}
