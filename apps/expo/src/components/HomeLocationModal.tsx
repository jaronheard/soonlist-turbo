import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useMutation } from "convex/react";
import { MapPin } from "lucide-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useLocationPermission } from "~/hooks/useLocationPermission";
import { useSetHasCompletedLocationSetup } from "~/store";

interface HomeLocationModalProps {
  isVisible: boolean;
  onClose: () => void;
}

type ModalStep = "intro" | "loading" | "confirm" | "denied" | "error";

export function HomeLocationModal({
  isVisible,
  onClose,
}: HomeLocationModalProps): React.ReactElement {
  const [step, setStep] = useState<ModalStep>("intro");
  const [address, setAddress] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    requestPermission,
    getCurrentLocation,
    currentLocation,
    reverseGeocode,
  } = useLocationPermission();

  const saveUserLocation = useMutation(api.users.saveUserLocation);
  const setHasCompletedLocationSetup = useSetHasCompletedLocationSetup();

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setStep("intro");
      setAddress(null);
    }
  }, [isVisible]);

  const handleRequestLocation = useCallback(async () => {
    setStep("loading");

    // Request permission
    const { isGranted } = await requestPermission();

    if (!isGranted) {
      setStep("denied");
      return;
    }

    // Get current location
    const coords = await getCurrentLocation();

    if (!coords) {
      setStep("error");
      return;
    }

    // Reverse geocode to get address
    const addressResult = await reverseGeocode(coords);
    setAddress(addressResult);
    setStep("confirm");
  }, [requestPermission, getCurrentLocation, reverseGeocode]);

  const handleConfirmLocation = useCallback(async () => {
    if (!currentLocation) return;

    setIsSaving(true);
    try {
      await saveUserLocation({
        name: "Home",
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: address ?? undefined,
        isDefault: true,
      });

      setHasCompletedLocationSetup(true);
      onClose();
    } catch (error) {
      console.error("Failed to save location:", error);
      setStep("error");
    } finally {
      setIsSaving(false);
    }
  }, [
    currentLocation,
    address,
    saveUserLocation,
    setHasCompletedLocationSetup,
    onClose,
  ]);

  const handleSkip = useCallback(() => {
    setHasCompletedLocationSetup(true);
    onClose();
  }, [setHasCompletedLocationSetup, onClose]);

  const renderContent = () => {
    switch (step) {
      case "intro":
        return (
          <>
            <View className="mb-4 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-violet-100">
                <MapPin size={32} color="#5A32FB" />
              </View>
            </View>
            <Text className="mb-2 text-center font-heading text-xl font-bold text-gray-900">
              Set Your Home Location
            </Text>
            <Text className="mb-6 text-center text-base text-gray-600">
              Help us locate events from your screenshots by setting your home
              location. This improves event detection accuracy.
            </Text>
            <View className="gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enable location"
                onPress={() => void handleRequestLocation()}
                className="w-full rounded-full bg-interactive-1 py-4"
              >
                <Text className="text-center font-semibold text-white">
                  Enable Location
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip for now"
                onPress={handleSkip}
                className="w-full py-3"
              >
                <Text className="text-center font-medium text-gray-500">
                  Skip for now
                </Text>
              </Pressable>
            </View>
          </>
        );

      case "loading":
        return (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#5A32FB" />
            <Text className="mt-4 text-center text-base text-gray-600">
              Getting your location...
            </Text>
          </View>
        );

      case "confirm":
        return (
          <>
            <View className="mb-4 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <MapPin size={32} color="#22C55E" />
              </View>
            </View>
            <Text className="mb-2 text-center font-heading text-xl font-bold text-gray-900">
              Confirm Home Location
            </Text>
            {address ? (
              <Text className="mb-2 text-center text-lg font-medium text-gray-700">
                {address}
              </Text>
            ) : null}
            <Text className="mb-6 text-center text-sm text-gray-500">
              We&apos;ll use this location to better detect events from your
              screenshots.
            </Text>
            <View className="gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm this is my home"
                onPress={() => void handleConfirmLocation()}
                disabled={isSaving}
                className={`w-full rounded-full py-4 ${
                  isSaving ? "bg-gray-400" : "bg-interactive-1"
                }`}
              >
                <Text className="text-center font-semibold text-white">
                  {isSaving ? "Saving..." : "This is my home"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Try again"
                onPress={() => void handleRequestLocation()}
                disabled={isSaving}
                className="w-full py-3"
              >
                <Text className="text-center font-medium text-gray-500">
                  Try again
                </Text>
              </Pressable>
            </View>
          </>
        );

      case "denied":
        return (
          <>
            <View className="mb-4 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <MapPin size={32} color="#F59E0B" />
              </View>
            </View>
            <Text className="mb-2 text-center font-heading text-xl font-bold text-gray-900">
              Location Access Denied
            </Text>
            <Text className="mb-6 text-center text-base text-gray-600">
              Without location access, we won&apos;t be able to automatically
              detect event locations from screenshots. You can enable it later
              in Settings.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue without location"
              onPress={handleSkip}
              className="w-full rounded-full bg-interactive-1 py-4"
            >
              <Text className="text-center font-semibold text-white">
                Continue
              </Text>
            </Pressable>
          </>
        );

      case "error":
        return (
          <>
            <View className="mb-4 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <MapPin size={32} color="#EF4444" />
              </View>
            </View>
            <Text className="mb-2 text-center font-heading text-xl font-bold text-gray-900">
              Something Went Wrong
            </Text>
            <Text className="mb-6 text-center text-base text-gray-600">
              We couldn&apos;t get your location. Please try again or skip for
              now.
            </Text>
            <View className="gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Try again"
                onPress={() => void handleRequestLocation()}
                className="w-full rounded-full bg-interactive-1 py-4"
              >
                <Text className="text-center font-semibold text-white">
                  Try Again
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip for now"
                onPress={handleSkip}
                className="w-full py-3"
              >
                <Text className="text-center font-medium text-gray-500">
                  Skip for now
                </Text>
              </Pressable>
            </View>
          </>
        );
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

