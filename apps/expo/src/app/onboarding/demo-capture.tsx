import React from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { router, Stack } from "expo-router";

import type { DemoEvent, ImageSource } from "~/components/demoData";
import { CaptureEventButton } from "~/components/CaptureEventButton";
import { DEMO_CAPTURE_EVENTS } from "~/components/demoData";
import { EventPreview } from "~/components/EventPreview";
import { PhotoGrid } from "~/components/PhotoGrid";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";

const OFFSET_VALUE = 32;

// Ensure we have at least one event with an image
const DEFAULT_EVENT = DEMO_CAPTURE_EVENTS.find((event) => event.imageUri);
if (!DEFAULT_EVENT) {
  throw new Error("No demo events with images found");
}
// After this check, we know DEFAULT_EVENT exists
const initialEvent: DemoEvent = DEFAULT_EVENT;

// Helper function to compare image URIs
function compareImageUris(
  uri1: string | ImageSource | undefined | null,
  uri2: string | ImageSource | undefined | null,
): boolean {
  if (!uri1 || !uri2) return false;

  if (typeof uri1 === "number" && typeof uri2 === "number") {
    return uri1 === uri2;
  }

  if (typeof uri1 === "string" && typeof uri2 === "object" && "uri" in uri2) {
    return uri1 === uri2.uri;
  }

  if (typeof uri2 === "string" && typeof uri1 === "object" && "uri" in uri1) {
    return uri2 === uri1.uri;
  }

  if (typeof uri1 === "string" && typeof uri2 === "string") {
    return uri1 === uri2;
  }

  return false;
}

export default function DemoCaptureScreen() {
  const { style: keyboardStyle } = useKeyboardHeight(OFFSET_VALUE);
  const [selectedEvent, setSelectedEvent] =
    React.useState<DemoEvent>(initialEvent);

  const handleEventSelect = (event: DemoEvent) => {
    setSelectedEvent(event);
  };

  const handleSubmit = async () => {
    router.dismissTo(
      `/onboarding/demo-feed?eventId=${selectedEvent.id}&eventName=${encodeURIComponent(selectedEvent.name)}`,
    );
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
  })).filter((photo) => photo.uri !== "");

  return (
    <View className="h-full flex-1 bg-[#5A32FB]">
      {/* Wrap everything in a "card" that has rounded top corners, 
          hiding anything behind it so no black gap appears */}
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#5A32FB" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#5A32FB" },
          headerTitle: "Try adding an event",
        }}
      />
      <View className="h-full flex-1 overflow-hidden rounded-t-3xl bg-interactive-1">
        <View className="flex-1">
          <View className="flex-1">
            {/* Event preview at top */}
            <View className="px-4 pt-2">
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

            {/* Photo grid below preview */}
            <View className="h-full flex-1 px-4">
              <PhotoGrid
                hasMediaPermission={true}
                hasFullPhotoAccess={true}
                recentPhotos={demoPhotos}
                onPhotoSelect={(uri) => {
                  const event = DEMO_CAPTURE_EVENTS.find((e) =>
                    compareImageUris(e.imageUri, uri),
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

        {/* The capture button sits at the bottom, with optional animated margin 
            so it can float above the keyboard smoothly. */}
        <Animated.View className="px-4" style={keyboardStyle}>
          <CaptureEventButton
            handleCreateEvent={handleSubmit}
            input={selectedEvent.description ?? ""}
            imagePreview={selectedEvent.imageUri ?? null}
            linkPreview={null}
          />
        </Animated.View>
      </View>
    </View>
  );
}
