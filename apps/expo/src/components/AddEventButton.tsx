import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { ChevronDown, PlusIcon, Sparkles } from "~/components/icons";
import { useMediaPermissions } from "~/hooks/useMediaLibrary";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "../utils/errorLogging";
import { useCreateEvent } from "~/hooks/useCreateEvent";

interface AddEventButtonProps {
  showChevron?: boolean;
}

/**
 * AddEventButton
 * ---------------
 * Opens the native photo picker directly and creates an event with the selected photo.
 * This bypasses the /add screen for a faster event creation flow.
 */
export default function AddEventButton({
  showChevron = true,
}: AddEventButtonProps) {
  // Zustand selectors
  const { resetAddEventState } =
    useAppStore((state) => ({
      resetAddEventState: state.resetAddEventState,
    }));

  // RevenueCat
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const { user } = useUser();
  const { createEvent } = useCreateEvent();

  // Keep permission status up‑to‑date globally
  useMediaPermissions();

  // Animation for the plus icon
  const rotation = useSharedValue(0);
  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  // Start animation when component mounts
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      -1, // Infinite repetition
      false, // No reverse
    );
  }, [rotation]);

  /**
   * Main press handler
   * ------------------
   * 1. Show paywall if needed.
   * 2. Clear draft state (so any stale data is removed)
   * 3. Launch native photo picker directly
   * 4. Create event with selected photo
   * 5. Show success toast
   */
  const handlePress = useCallback(async () => {
    // 1. Paywall gate
    if (!hasUnlimited) {
      void showProPaywallIfNeeded();
      return;
    }

    // 2. Clear draft state
    resetAddEventState();

    // 3. Launch native photo picker directly
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      // 4. Create event with selected photo if user didn't cancel
      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const filename = imageUri.split("/").pop() || "photo.jpg";

        if (!user?.id || !user.username) {
          toast.error("User information not available");
          return;
        }

        // 5. Create event with the selected image
        const eventData = {
          rawText: filename,
          imageUri,
          userId: user.id,
          username: user.username,
        };

        try {
          const eventId = await createEvent(eventData);
          
          // 6. Show success toast with "View event" action
          if (eventId) {
            toast.success("Captured successfully!", {
              action: {
                label: "View event",
                onClick: () => {
                  toast.dismiss();
                  router.push(`/event/${eventId}`);
                },
              },
            });
          }
        } catch (error) {
          logError("Error creating event from AddEventButton", error);
          toast.error("Failed to create event. Please try again.");
        }
      }
    } catch (err) {
      logError("Error in AddEventButton handlePress", err);
      toast.error("Failed to open photo picker. Please try again.");
    }
  }, [
    hasUnlimited,
    showProPaywallIfNeeded,
    resetAddEventState,
    user,
    createEvent,
  ]);

  /**
   * Render
   * ------
   * Renders a floating action button with a plus icon.
   * The button has a blur effect and a gradient background.
   */
  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <BlurView intensity={30} style={styles.blurView}>
        <LinearGradient
          colors={["#FF5F6D", "#FFC371"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <Animated.View style={[styles.plusIcon, animatedStyles]}>
              <PlusIcon size={24} color="#fff" />
            </Animated.View>
            {showChevron && (
              <View style={styles.chevronContainer}>
                <ChevronDown size={12} color="#fff" />
              </View>
            )}
            <View style={styles.sparklesContainer}>
              <Sparkles size={14} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  blurView: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    position: "relative",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  plusIcon: {
    position: "absolute",
  },
  chevronContainer: {
    position: "absolute",
    bottom: -18,
  },
  sparklesContainer: {
    position: "absolute",
    top: -18,
    right: -18,
  },
});
