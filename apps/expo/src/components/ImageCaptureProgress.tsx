import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Check, X } from "~/components/icons";
import { CircularSpinner } from "~/components/ui/CircularSpinner";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

interface ImageCardProps {
  image: {
    uri: string;
    workflowId?: string;
    status: "pending" | "processing" | "completed" | "failed";
    error?: string;
  };
}

function ImageCard({ image }: ImageCardProps) {
  const { updateImageStatus } = useInFlightEventStore();
  const opacity = useSharedValue(1);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Debug logging

  // Query workflow status if we have a workflowId
  const workflowStatus = useQuery(
    api.workflows.eventIngestion.getWorkflowStatus,
    image.workflowId ? { workflowId: image.workflowId } : "skip",
  );

  // Update image status based on workflow status
  useEffect(() => {
    if (workflowStatus && image.workflowId) {
      // Show checkmark after insertEvent step completes (before sendPush)
      if (
        workflowStatus.currentStep === "sendPush" ||
        workflowStatus.status === "completed"
      ) {
        updateImageStatus(image.workflowId, "completed");
        // Don't remove completed images - keep them visible
      } else if (workflowStatus.status === "failed") {
        updateImageStatus(image.workflowId, "failed", workflowStatus.error);
      }
    }
  }, [workflowStatus, image.workflowId, updateImageStatus]);

  // Pulsing animation for processing state
  useEffect(() => {
    if (image.status === "processing") {
      opacity.value = withRepeat(withTiming(0.8, { duration: 1000 }), -1, true);
    } else {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [image.status, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={SlideInRight.duration(300).springify()}
      exiting={FadeOut.duration(300)}
      layout={Layout.springify()}
      className="relative mx-1"
    >
      <View
        className="relative overflow-hidden rounded-lg bg-gray-100"
        style={{ width: 38, height: 68 }}
      >
        <Animated.View
          style={[
            animatedStyle,
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
          ]}
        >
          {imageLoadError ? (
            // Fallback to React Native Image if ExpoImage fails
            <Image
              source={{ uri: image.uri }}
              style={{ width: 38, height: 68 }}
              resizeMode="cover"
              onError={() => {
                console.error(
                  "Both image components failed to load URI:",
                  image.uri,
                );
              }}
            />
          ) : (
            <ExpoImage
              source={{ uri: image.uri }}
              style={{ width: 38, height: 68 }}
              contentFit="cover"
              contentPosition="center"
              transition={200}
              cachePolicy="memory-disk"
              onError={(error) => {
                console.error(
                  "ExpoImage failed to load:",
                  error,
                  "URI:",
                  image.uri,
                );
                setImageLoadError(true);
              }}
              onLoad={() => {
                console.log("Image loaded successfully:", image.uri);
              }}
            />
          )}
        </Animated.View>

        {/* Status overlay */}
        {image.status !== "completed" && (
          <BlurView
            intensity={20}
            className="pointer-events-none absolute inset-0"
            tint="light"
          />
        )}

        {/* Centered status indicators */}
        {image.status === "pending" && (
          <View
            className="pointer-events-none absolute"
            style={{
              top: (68 - 28) / 2,
              left: (38 - 28) / 2,
            }}
          >
            <CircularSpinner size={28} strokeWidth={2.5} color="#5A32FB" />
          </View>
        )}
        {image.status === "processing" && (
          <View
            className="pointer-events-none absolute"
            style={{
              top: (68 - 28) / 2,
              left: (38 - 28) / 2,
            }}
          >
            <CircularSpinner size={28} strokeWidth={2.5} color="#5A32FB" />
          </View>
        )}
        {image.status === "completed" && (
          <View
            className="pointer-events-none absolute"
            style={{
              top: (68 - 32) / 2,
              left: (38 - 32) / 2,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#5A32FB",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={16} color="#FFF" strokeWidth={3} />
          </View>
        )}
        {image.status === "failed" && (
          <View
            className="pointer-events-none absolute"
            style={{
              top: (68 - 32) / 2,
              left: (38 - 32) / 2,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#EF4444",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} color="#FFF" strokeWidth={3} />
          </View>
        )}

        {/* Error message for failed state */}
        {image.status === "failed" && (
          <View className="absolute bottom-0 left-0 right-0 bg-red-500/90 p-1">
            <Text className="text-center text-xs text-white" numberOfLines={1}>
              {image.error || "Failed"}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function ImageCaptureProgress() {
  const { inFlightImages, clearInFlightImages } = useInFlightEventStore();
  const insets = useSafeAreaInsets();

  // Check if all images are completed
  useEffect(() => {
    if (inFlightImages.length > 0) {
      const allCompleted = inFlightImages.every(
        (img) => img.status === "completed" || img.status === "failed",
      );

      if (allCompleted) {
        // Auto-dismiss after a delay when all are done
        const timer = setTimeout(() => {
          clearInFlightImages();
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [inFlightImages, clearInFlightImages]);

  if (inFlightImages.length === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={SlideInRight.duration(400)}
      exiting={SlideOutRight.duration(300)}
      className="absolute -right-8 bottom-8 z-10 self-center"
      style={{ width: "50%" }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        style={{ maxWidth: "100%" }}
      >
        <View className="flex-row items-center">
          {inFlightImages.map((image, index) => (
            <ImageCard key={`${image.uri}-${index}`} image={image} />
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}
