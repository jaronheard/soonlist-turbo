import React, { useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Globe2, MapPin } from "lucide-react-native";

import type { DemoEvent } from "~/components/demoData";
import { DEMO_CAPTURE_EVENTS } from "~/components/demoData";
import { FinishDemoButton } from "~/components/FinishDemoButton";
import { formatEventDateRange } from "~/utils/dates";

export default function DemoEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = Dimensions.get("window");
  const [imageHeight, setImageHeight] = useState(0);

  const event: DemoEvent | undefined = DEMO_CAPTURE_EVENTS.find(
    (e) => e.id === id,
  );

  if (!event) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Demo Event",
            headerStyle: {
              backgroundColor: "#5A32FB",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <Text>Demo event not found</Text>
        </View>
      </>
    );
  }

  const { date, time } = formatEventDateRange(
    event.startDate || "",
    event.startTime,
    event.endTime,
    event.timeZone || "",
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Demo Event",
          headerStyle: {
            backgroundColor: "#5A32FB",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
      <View className="flex-1 bg-white">
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: 16,
            }}
            maximumZoomScale={5}
          >
            <View className="p-4">
              <View className="flex flex-col gap-5">
                <View>
                  <Text className="text-lg text-neutral-2">{date}</Text>
                  <Text className="text-lg text-neutral-2">{time}</Text>
                </View>
                <Text className="font-heading text-4xl font-bold text-neutral-1">
                  {event.name}
                </Text>
                {event.location && (
                  <Link
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                    asChild
                  >
                    <Pressable>
                      <View className="flex-row items-center">
                        <MapPin size={16} color="#6b7280" />
                        <Text className="ml-1 text-neutral-2">
                          {event.location}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                )}
                <View className="flex-row items-center gap-2">
                  <Globe2 size={16} color="#627496" />
                  <Text className="text-sm text-neutral-2">Discoverable</Text>
                </View>
              </View>
              <View className="my-8">
                <Text className="text-neutral-1">{event.description}</Text>
              </View>
              {event.images?.[3] && (
                <View className="mb-4">
                  <Image
                    source={
                      typeof event.images[3] === "number"
                        ? event.images[3]
                        : {
                            uri: `${event.images[3].uri}?max-w=1284&fit=cover&f=webp&q=80`,
                            headers: { Accept: "image/webp,image/png,image/*" },
                          }
                    }
                    style={{
                      width: width - 32,
                      height: imageHeight || width - 32,
                    }}
                    contentFit="contain"
                    contentPosition="center"
                    transition={200}
                    cachePolicy="memory-disk"
                    className="bg-muted/10"
                    onLoad={(e) => {
                      const { width: naturalWidth, height: naturalHeight } =
                        e.source;
                      const aspectRatio = naturalHeight / naturalWidth;
                      setImageHeight((width - 32) * aspectRatio);
                    }}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <View className="bg-white">
          <FinishDemoButton />
        </View>
      </View>
    </>
  );
}
