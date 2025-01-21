import React from "react";
import { Animated, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";

import type { DemoEvent } from "../(onboarding)/onboarding/demoData";
import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { PhotoGrid } from "~/components/PhotoGrid";
import { DEMO_CAPTURE_EVENTS } from "../(onboarding)/onboarding/demoData";

// Ensure we have at least one event with an image
const DEFAULT_EVENT = DEMO_CAPTURE_EVENTS.find((event) => event.imageUri);
if (!DEFAULT_EVENT) {
  throw new Error("No demo events with images found");
}
// After this check, we know DEFAULT_EVENT exists
const initialEvent: DemoEvent = DEFAULT_EVENT;

export default function DemoCaptureScreen() {
  const [selectedEvent, setSelectedEvent] =
    React.useState<DemoEvent>(initialEvent);

  const handleEventSelect = (event: DemoEvent) => {
    setSelectedEvent(event);
  };

  const handleSubmit = () => {
    router.push(`/onboarding/demo-feed?eventId=${selectedEvent.id}`);
  };

  const handleDescribePress = () => {
    // No-op in demo mode
    return;
  };

  const handleTextChange = () => {
    // No-op in demo mode
    return;
  };

  const handleMorePhotos = () => {
    // No-op in demo mode
    return;
  };

  const handleCameraPress = () => {
    // No-op in demo mode
    return;
  };

  // Convert demo events to a format PhotoGrid can use
  const demoPhotos = DEMO_CAPTURE_EVENTS.map((event) => ({
    uri: event.imageUri ?? "",
    id: event.id,
  })).filter((photo) => photo.uri);

  return (
    <SafeAreaView className="flex-1 bg-interactive-1">
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#5A32FB" },
          headerTintColor: "#fff",
          headerTitle: () => (
            <NewEventHeader
              containerClassName="mt-2"
              isFromIntent={false}
              linkPreview={null}
              imagePreview={selectedEvent.imageUri ?? null}
              activeInput="upload"
              handleDescribePress={handleDescribePress}
            />
          ),
        }}
      />

      <View className="flex-1 bg-interactive-1">
        <View className="flex-1">
          <View className="flex-1 px-4">
            <View className="flex-1">
              <View className="mb-4">
                <EventPreview
                  containerClassName="rounded-xl overflow-hidden"
                  imagePreview={selectedEvent.imageUri ?? null}
                  linkPreview={null}
                  input={selectedEvent.description ?? ""}
                  handleTextChange={handleTextChange}
                  clearPreview={() => setSelectedEvent(initialEvent)}
                  clearText={() => {
                    // No-op in demo mode
                    return;
                  }}
                  activeInput="upload"
                  isImageLoading={false}
                  handleMorePhotos={handleMorePhotos}
                  previewContainerStyle="square"
                />
              </View>

              <View className="flex-1">
                <PhotoGrid
                  hasMediaPermission={true}
                  hasFullPhotoAccess={true}
                  recentPhotos={demoPhotos}
                  onPhotoSelect={(uri) => {
                    const event = DEMO_CAPTURE_EVENTS.find(
                      (e) => e.imageUri === uri,
                    );
                    if (event) handleEventSelect(event);
                  }}
                  onCameraPress={handleCameraPress}
                  onMorePhotos={handleMorePhotos}
                  selectedUri={selectedEvent.imageUri ?? null}
                />
              </View>
            </View>
          </View>
        </View>

        <Animated.View className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <CaptureEventButton
            handleCreateEvent={handleSubmit}
            input={selectedEvent.description ?? ""}
            imagePreview={selectedEvent.imageUri ?? null}
            linkPreview={null}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
